package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.audiofx.AudioEffect
import android.media.audiofx.EnvironmentalReverb
import android.media.audiofx.Equalizer
import android.media.audiofx.PresetReverb
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.ln
import kotlin.math.roundToInt
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.util.Locale

class MainActivity : ComponentActivity() {
  private var webViewRef: WebView? = null
  private var pendingPermissionRequest: PermissionRequest? = null
  private var pendingFilePathCallback: ValueCallback<Array<Uri>>? = null

  private val bgFxLock = Any()
  private var bgEqualizer: Equalizer? = null
  private var bgEnvReverb: EnvironmentalReverb? = null
  private var bgPresetReverb: PresetReverb? = null
  private var bgEffectsEnabled: Boolean = false
  private var bgAppliedEffects: List<String> = emptyList()

  private val audioPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
      val micGranted = results[Manifest.permission.RECORD_AUDIO] == true || hasRecordAudioPermission()
      val req = pendingPermissionRequest
      pendingPermissionRequest = null
      if (req != null) {
        if (micGranted) {
          runOnUiThread { req.grant(req.resources) }
        } else {
          runOnUiThread { req.deny() }
        }
      }
      if (micGranted) {
        configureBluetoothAudioRouteIfPresent()
      }
    }

  private val fileChooserLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      val callback = pendingFilePathCallback
      pendingFilePathCallback = null
      if (callback == null) return@registerForActivityResult

      val data = result.data
      val uris: Array<Uri>? =
        if (result.resultCode == RESULT_OK && data != null) {
          val clip = data.clipData
          if (clip != null && clip.itemCount > 0) {
            Array(clip.itemCount) { idx -> clip.getItemAt(idx).uri }
          } else {
            data.data?.let { arrayOf(it) }
          }
        } else {
          null
        }
      callback.onReceiveValue(uris)
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(Color.parseColor("#0B0E14")),
      navigationBarStyle = SystemBarStyle.dark(Color.parseColor("#0B0E14")),
    )

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          val wv = webViewRef
          if (wv != null && wv.canGoBack()) {
            wv.goBack()
          } else {
            isEnabled = false
            onBackPressedDispatcher.onBackPressed()
          }
        }
      },
    )

    requestInitialAudioPermissionsIfNeeded()

    setContent {
      VoxForgeAndroidHost(
        modifier =
          Modifier
            .fillMaxSize()
            .background(ComposeColor(0xFF0B0E14))
            .safeDrawingPadding(),
      )
    }
  }

  override fun onDestroy() {
    releaseBackgroundAudioEffects()
    pendingPermissionRequest?.deny()
    pendingPermissionRequest = null
    pendingFilePathCallback?.onReceiveValue(null)
    pendingFilePathCallback = null
    webViewRef?.destroy()
    webViewRef = null
    super.onDestroy()
  }

  private fun hasRecordAudioPermission(): Boolean =
    ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
      PackageManager.PERMISSION_GRANTED

  private fun requiredAudioPermissions(): Array<String> {
    val list = mutableListOf(Manifest.permission.RECORD_AUDIO)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      list.add(Manifest.permission.BLUETOOTH_CONNECT)
    }
    return list.toTypedArray()
  }

  private fun requestInitialAudioPermissionsIfNeeded() {
    val missing =
      requiredAudioPermissions().filter {
        ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
      }
    if (missing.isNotEmpty()) {
      audioPermissionLauncher.launch(missing.toTypedArray())
    } else {
      configureBluetoothAudioRouteIfPresent()
    }
  }

  private fun configureBluetoothAudioRouteIfPresent() {
    try {
      val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val btCommDevice =
          audioManager.availableCommunicationDevices.firstOrNull { dev ->
            dev.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
              dev.type == AudioDeviceInfo.TYPE_BLE_HEADSET
          }
        if (btCommDevice != null) {
          audioManager.setCommunicationDevice(btCommDevice)
        }
      }
    } catch (_: SecurityException) {
      // Missing BLUETOOTH_CONNECT permission; continue gracefully using default mic route
    } catch (_: Throwable) {
      // Ignore device routing errors on unsupported hardware
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  @Composable
  private fun VoxForgeAndroidHost(modifier: Modifier = Modifier) {
    AndroidView(
      modifier = modifier,
      factory = { ctx ->
        WebView(ctx).apply {
          layoutParams =
            ViewGroup.LayoutParams(
              ViewGroup.LayoutParams.MATCH_PARENT,
              ViewGroup.LayoutParams.MATCH_PARENT,
            )
          setBackgroundColor(Color.parseColor("#0B0E14"))
          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
          }

          addJavascriptInterface(VoxForgeBridge(ctx), "VoxForgeNative")

          webViewClient =
            object : WebViewClient() {
              override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?,
              ): WebResourceResponse? {
                val url = request?.url ?: return null
                if (url.host != APP_ASSETS_HOST) return null
                val rawPath = (url.path ?: "/").trimStart('/')
                val assetRel = if (rawPath.isEmpty()) "index.html" else rawPath
                return serveBundledAsset(ctx, assetRel)
              }
            }

          webChromeClient =
            object : WebChromeClient() {
              override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val wantsAudio =
                  request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (!wantsAudio) {
                  request.grant(request.resources)
                  return
                }
                if (hasRecordAudioPermission()) {
                  configureBluetoothAudioRouteIfPresent()
                  runOnUiThread { request.grant(request.resources) }
                } else {
                  pendingPermissionRequest?.deny()
                  pendingPermissionRequest = request
                  audioPermissionLauncher.launch(requiredAudioPermissions())
                }
              }

              override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?,
              ): Boolean {
                pendingFilePathCallback?.onReceiveValue(null)
                pendingFilePathCallback = filePathCallback
                val intent =
                  Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(
                      Intent.EXTRA_MIME_TYPES,
                      arrayOf("audio/*", "video/*"),
                    )
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                  }
                return try {
                  fileChooserLauncher.launch(intent)
                  true
                } catch (_: Exception) {
                  pendingFilePathCallback = null
                  false
                }
              }
            }

          webViewRef = this
          loadUrl("https://$APP_ASSETS_HOST/index.html")
        }
      },
    )
  }

  private fun serveBundledAsset(ctx: Context, assetPath: String): WebResourceResponse {
    val sanitized = assetPath.replace("..", "").trimStart('/')
    val candidate = "www/$sanitized"
    return try {
      val stream = ctx.assets.open(candidate)
      val mime = guessMimeType(sanitized)
      val headers = mapOf("Access-Control-Allow-Origin" to "https://$APP_ASSETS_HOST")
      WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream)
    } catch (_: Exception) {
      try {
        val fallback = ctx.assets.open("www/index.html")
        WebResourceResponse("text/html", "UTF-8", 200, "OK", emptyMap(), fallback)
      } catch (_: Exception) {
        WebResourceResponse(
          "text/plain",
          "UTF-8",
          404,
          "Not Found",
          emptyMap(),
          ByteArrayInputStream(ByteArray(0)),
        )
      }
    }
  }

  private fun guessMimeType(path: String): String {
    val lower = path.lowercase(Locale.US)
    return when {
      lower.endsWith(".html") -> "text/html"
      lower.endsWith(".js") || lower.endsWith(".mjs") -> "application/javascript"
      lower.endsWith(".css") -> "text/css"
      lower.endsWith(".json") -> "application/json"
      lower.endsWith(".ttf") -> "font/ttf"
      lower.endsWith(".woff2") -> "font/woff2"
      lower.endsWith(".png") -> "image/png"
      lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
      lower.endsWith(".svg") -> "image/svg+xml"
      lower.endsWith(".wav") -> "audio/wav"
      else -> "application/octet-stream"
    }
  }

  inner class VoxForgeBridge(private val ctx: Context) {
    @JavascriptInterface
    fun saveBase64File(base64Data: String, fileName: String, mimeType: String): Boolean {
      return try {
        val bytes = Base64.decode(base64Data, Base64.DEFAULT)
        val cleanName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val values =
            ContentValues().apply {
              put(MediaStore.Downloads.DISPLAY_NAME, cleanName)
              put(MediaStore.Downloads.MIME_TYPE, mimeType)
              put(
                MediaStore.Downloads.RELATIVE_PATH,
                "${Environment.DIRECTORY_DOWNLOADS}/VoxForge",
              )
            }
          val resolver = ctx.contentResolver
          val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
          if (uri != null) {
            resolver.openOutputStream(uri)?.use { out -> out.write(bytes) }
            runOnUiThread {
              Toast.makeText(ctx, "Saved to Downloads/VoxForge/$cleanName", Toast.LENGTH_LONG).show()
            }
            return true
          }
        }

        val outDir = File(ctx.cacheDir, "exports").apply { mkdirs() }
        val outFile = File(outDir, cleanName)
        FileOutputStream(outFile).use { it.write(bytes) }
        val shareUri =
          FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", outFile)
        val shareIntent =
          Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, shareUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
        runOnUiThread {
          ctx.startActivity(Intent.createChooser(shareIntent, "Save $cleanName"))
        }
        true
      } catch (e: Exception) {
        runOnUiThread {
          Toast.makeText(ctx, "Failed to save WAV: ${e.message}", Toast.LENGTH_SHORT).show()
        }
        false
      }
    }

    @JavascriptInterface
    fun getBackgroundEffectsCompatibility(): String {
      return synchronized(bgFxLock) {
        buildCompatibilityJson(
          enabled = bgEffectsEnabled,
          applied = bgAppliedEffects,
          customStatus = null,
        )
      }
    }

    @JavascriptInterface
    fun setBackgroundAudioEffects(enabled: Boolean, configJson: String): String {
      return synchronized(bgFxLock) {
        applyBackgroundAudioEffectsInternal(enabled, configJson)
      }
    }
  }

  private data class NativeBgCapability(
    val eqSupported: Boolean,
    val envReverbSupported: Boolean,
    val presetReverbSupported: Boolean,
  ) {
    val reverbSupported: Boolean
      get() = envReverbSupported || presetReverbSupported
    val anySupported: Boolean
      get() = eqSupported || reverbSupported
  }

  private fun probeNativeGlobalCapabilities(): NativeBgCapability {
    val descriptors = try {
      AudioEffect.queryEffects()
    } catch (_: Throwable) {
      null
    }

    val eqDeclared = descriptors?.any { it.type == AudioEffect.EFFECT_TYPE_EQUALIZER } ?: true
    val envRevDeclared = descriptors?.any { it.type == AudioEffect.EFFECT_TYPE_ENV_REVERB } ?: true
    val presetRevDeclared = descriptors?.any { it.type == AudioEffect.EFFECT_TYPE_PRESET_REVERB } ?: true

    val eqOk = if (bgEqualizer != null) {
      true
    } else if (!eqDeclared) {
      false
    } else {
      var probe: Equalizer? = null
      try {
        probe = Equalizer(0, 0)
        true
      } catch (_: Throwable) {
        false
      } finally {
        try {
          probe?.release()
        } catch (_: Throwable) {
        }
      }
    }

    val envRevOk = if (bgEnvReverb != null) {
      true
    } else if (!envRevDeclared) {
      false
    } else {
      var probe: EnvironmentalReverb? = null
      try {
        probe = EnvironmentalReverb(0, 0)
        true
      } catch (_: Throwable) {
        false
      } finally {
        try {
          probe?.release()
        } catch (_: Throwable) {
        }
      }
    }

    val presetRevOk = if (bgPresetReverb != null) {
      true
    } else if (!presetRevDeclared) {
      false
    } else {
      var probe: PresetReverb? = null
      try {
        probe = PresetReverb(0, 0)
        true
      } catch (_: Throwable) {
        false
      } finally {
        try {
          probe?.release()
        } catch (_: Throwable) {
        }
      }
    }

    return NativeBgCapability(
      eqSupported = eqOk,
      envReverbSupported = envRevOk,
      presetReverbSupported = presetRevOk,
    )
  }

  private fun releaseBackgroundAudioEffects() {
    synchronized(bgFxLock) {
      releaseNativeEffectInstances()
      bgEffectsEnabled = false
      bgAppliedEffects = emptyList()
    }
  }

  private fun releaseNativeEffectInstances() {
    try {
      bgEqualizer?.enabled = false
      bgEqualizer?.release()
    } catch (_: Throwable) {
    } finally {
      bgEqualizer = null
    }
    try {
      bgEnvReverb?.enabled = false
      bgEnvReverb?.release()
    } catch (_: Throwable) {
    } finally {
      bgEnvReverb = null
    }
    try {
      bgPresetReverb?.enabled = false
      bgPresetReverb?.release()
    } catch (_: Throwable) {
    } finally {
      bgPresetReverb = null
    }
  }

  private fun applyBackgroundAudioEffectsInternal(enabled: Boolean, configJson: String): String {
    if (!enabled) {
      releaseNativeEffectInstances()
      bgEffectsEnabled = false
      bgAppliedEffects = emptyList()
      return buildCompatibilityJson(
        enabled = false,
        applied = emptyList(),
        customStatus = "Background Audio Effects OFF. System audio restored to normal.",
      )
    }

    val cap = probeNativeGlobalCapabilities()
    if (!cap.anySupported) {
      releaseNativeEffectInstances()
      bgEffectsEnabled = false
      bgAppliedEffects = emptyList()
      return buildCompatibilityJson(
        enabled = false,
        applied = emptyList(),
        customStatus = "Android device does not allow Native Audio Effects on global output mix (session 0).",
      )
    }

    val root = try {
      JSONObject(configJson)
    } catch (_: Throwable) {
      JSONObject()
    }

    val applied = mutableListOf<String>()

    // 1. Native Global-Mix Equalizer
    val eqJson = root.optJSONObject("equalizer")
    val eqWanted = eqJson?.optBoolean("enabled", false) == true
    if (eqWanted && cap.eqSupported && eqJson != null) {
      try {
        val eq = bgEqualizer ?: Equalizer(0, 0).also { bgEqualizer = it }
        applyEqualizerParams(eq, eqJson)
        eq.enabled = true
        applied.add("Equalizer")
      } catch (_: Throwable) {
        try {
          bgEqualizer?.release()
        } catch (_: Throwable) {
        }
        bgEqualizer = null
      }
    } else {
      try {
        bgEqualizer?.enabled = false
        bgEqualizer?.release()
      } catch (_: Throwable) {
      }
      bgEqualizer = null
    }

    // 2. Native Global-Mix Reverb & Hall
    val revJson = root.optJSONObject("reverb")
    val hallJson = root.optJSONObject("hall")
    val revWanted = revJson?.optBoolean("enabled", false) == true
    val hallWanted = hallJson?.optBoolean("enabled", false) == true

    if ((revWanted || hallWanted) && cap.reverbSupported) {
      var reverbApplied = false
      if (cap.envReverbSupported) {
        try {
          try {
            bgPresetReverb?.enabled = false
            bgPresetReverb?.release()
          } catch (_: Throwable) {
          }
          bgPresetReverb = null

          val env = bgEnvReverb ?: EnvironmentalReverb(0, 0).also { bgEnvReverb = it }
          applyEnvironmentalReverbParams(env, revJson, hallJson, revWanted, hallWanted)
          env.enabled = true
          reverbApplied = true
        } catch (_: Throwable) {
          try {
            bgEnvReverb?.release()
          } catch (_: Throwable) {
          }
          bgEnvReverb = null
        }
      }

      if (!reverbApplied && cap.presetReverbSupported) {
        try {
          val preset = bgPresetReverb ?: PresetReverb(0, 0).also { bgPresetReverb = it }
          preset.preset = chooseReverbPreset(revJson, revWanted, hallWanted)
          preset.enabled = true
          reverbApplied = true
        } catch (_: Throwable) {
          try {
            bgPresetReverb?.release()
          } catch (_: Throwable) {
          }
          bgPresetReverb = null
        }
      }

      if (reverbApplied) {
        if (revWanted) applied.add("Reverb")
        if (hallWanted) applied.add("Hall")
      }
    } else {
      try {
        bgEnvReverb?.enabled = false
        bgEnvReverb?.release()
      } catch (_: Throwable) {
      }
      bgEnvReverb = null
      try {
        bgPresetReverb?.enabled = false
        bgPresetReverb?.release()
      } catch (_: Throwable) {
      }
      bgPresetReverb = null
    }

    bgEffectsEnabled = true
    bgAppliedEffects = applied.toList()

    val unsupportedActive = root.optJSONObject("unsupportedActive")
    val skippedNames = mutableListOf<String>()
    if (unsupportedActive?.optBoolean("noiseGate", false) == true) skippedNames.add("Noise Gate")
    if (unsupportedActive?.optBoolean("lowPass", false) == true) skippedNames.add("Low-pass")
    if (unsupportedActive?.optBoolean("highPass", false) == true) skippedNames.add("High-pass")
    if (unsupportedActive?.optBoolean("echo", false) == true) skippedNames.add("Echo")

    val statusMsg = when {
      applied.isNotEmpty() && skippedNames.isNotEmpty() ->
        "Background Native Audio Effects ON (${applied.joinToString(", ")}). Unsupported on global mix (not simulated): ${skippedNames.joinToString(", ")}."
      applied.isNotEmpty() ->
        "Background Native Audio Effects ON — applying ${applied.joinToString(", ")} to global audio."
      skippedNames.isNotEmpty() ->
        "Background mode armed, but ${skippedNames.joinToString(", ")} have no Android global-mix native API (not simulated). Enable Equalizer, Reverb, or Hall."
      else ->
        "Background mode armed — enable Equalizer, Reverb, or Hall below to process other apps' audio."
    }

    return buildCompatibilityJson(
      enabled = true,
      applied = applied,
      customStatus = statusMsg,
    )
  }

  private fun applyEqualizerParams(eq: Equalizer, eqJson: JSONObject) {
    val mixScale = (eqJson.optDouble("mixPercent", 100.0) / 100.0).coerceIn(0.0, 1.0)
    val points = listOf(
      eqJson.optDouble("lowFreqHz", 120.0).coerceAtLeast(20.0) to eqJson.optDouble("lowGainDb", 0.0) * mixScale,
      eqJson.optDouble("mid1FreqHz", 400.0).coerceAtLeast(20.0) to eqJson.optDouble("mid1GainDb", 0.0) * mixScale,
      eqJson.optDouble("mid2FreqHz", 1500.0).coerceAtLeast(20.0) to eqJson.optDouble("mid2GainDb", 0.0) * mixScale,
      eqJson.optDouble("mid3FreqHz", 5000.0).coerceAtLeast(20.0) to eqJson.optDouble("mid3GainDb", 0.0) * mixScale,
      eqJson.optDouble("highFreqHz", 10000.0).coerceAtLeast(20.0) to eqJson.optDouble("highGainDb", 0.0) * mixScale,
    ).sortedBy { it.first }

    val range = eq.bandLevelRange
    val minMb = range[0].toInt()
    val maxMb = range[1].toInt()
    val bands = eq.numberOfBands.toInt()

    for (b in 0 until bands) {
      val bandIdx = b.toShort()
      val centerHz = (eq.getCenterFreq(bandIdx) / 1000.0).coerceAtLeast(20.0)
      val gainDb = interpolateLogGainDb(centerHz, points)
      val mb = (gainDb * 100.0).roundToInt().coerceIn(minMb, maxMb).toShort()
      eq.setBandLevel(bandIdx, mb)
    }
  }

  private fun interpolateLogGainDb(targetHz: Double, points: List<Pair<Double, Double>>): Double {
    if (points.isEmpty()) return 0.0
    if (targetHz <= points.first().first) return points.first().second
    if (targetHz >= points.last().first) return points.last().second

    val logTarget = ln(targetHz)
    for (i in 0 until points.size - 1) {
      val (f1, g1) = points[i]
      val (f2, g2) = points[i + 1]
      if (targetHz in f1..f2) {
        val log1 = ln(f1)
        val log2 = ln(f2)
        val span = (log2 - log1).coerceAtLeast(1e-6)
        val t = ((logTarget - log1) / span).coerceIn(0.0, 1.0)
        return g1 + (g2 - g1) * t
      }
    }
    return 0.0
  }

  private fun applyEnvironmentalReverbParams(
    env: EnvironmentalReverb,
    revJson: JSONObject?,
    hallJson: JSONObject?,
    revWanted: Boolean,
    hallWanted: Boolean,
  ) {
    val revMix = if (revWanted && revJson != null) {
      (revJson.optDouble("mixPercent", 81.0) / 100.0).coerceIn(0.0, 1.0)
    } else 0.0
    val revDecaySec = if (revWanted && revJson != null) revJson.optDouble("decayTimeSec", 1.6) else 0.4
    val revDampPct = if (revWanted && revJson != null) revJson.optDouble("dampingPercent", 50.0) else 50.0
    val revWetPct = if (revWanted && revJson != null) revJson.optDouble("wetPercent", 30.0) else 0.0
    val revRoomPct = if (revWanted && revJson != null) revJson.optDouble("roomSizePercent", 50.0) else 35.0
    val revPreDelay = if (revWanted && revJson != null) revJson.optDouble("preDelayMs", 0.0) else 0.0

    val hallAmount = if (hallWanted && hallJson != null) {
      hallJson.optDouble("reverberationAmount", 71.0).coerceIn(0.0, 100.0)
    } else 0.0
    val hallEcho = if (hallWanted && hallJson != null) {
      hallJson.optDouble("echoAmount", 55.0).coerceIn(0.0, 100.0)
    } else 0.0

    val decayMs = maxOf(
      if (revWanted) (revDecaySec * 1000.0).roundToInt() else 100,
      if (hallWanted) (600 + (hallAmount / 100.0) * 3400.0).roundToInt() else 100,
    ).coerceIn(100, 7000)

    val effectiveWet = maxOf(
      if (revWanted) (revWetPct / 100.0) * revMix else 0.0,
      if (hallWanted) (hallAmount / 100.0) * 0.65 else 0.0,
    ).coerceIn(0.0, 1.0)

    val reverbLevelMb = (-2500 + effectiveWet * 2500.0).roundToInt().coerceIn(-9000, 2000).toShort()
    val roomLevelMb = (-3500 + maxOf(if (revWanted) revRoomPct / 100.0 else 0.0, if (hallWanted) hallEcho / 100.0 else 0.0) * 2800.0)
      .roundToInt()
      .coerceIn(-9000, 0)
      .toShort()
    val diffusionPermille = ((if (revWanted) revRoomPct else 65.0) * 10.0).roundToInt().coerceIn(0, 1000).toShort()
    val densityPermille = ((if (hallWanted) hallAmount else 70.0) * 10.0).roundToInt().coerceIn(0, 1000).toShort()
    val hfRatio = (1000 - (revDampPct * 6.5)).roundToInt().coerceIn(100, 2000).toShort()
    val reflectionDelayMs = revPreDelay.roundToInt().coerceIn(0, 300)

    env.decayTime = decayMs
    env.reverbLevel = reverbLevelMb
    env.roomLevel = roomLevelMb
    env.diffusion = diffusionPermille
    env.density = densityPermille
    env.decayHFRatio = hfRatio
    env.reflectionsDelay = reflectionDelayMs
  }

  private fun chooseReverbPreset(
    revJson: JSONObject?,
    revWanted: Boolean,
    hallWanted: Boolean,
  ): Short {
    if (hallWanted) return PresetReverb.PRESET_LARGEHALL
    if (!revWanted || revJson == null) return PresetReverb.PRESET_NONE
    val roomSize = revJson.optDouble("roomSizePercent", 50.0)
    val decay = revJson.optDouble("decayTimeSec", 1.6)
    return when {
      decay >= 2.8 || roomSize >= 75.0 -> PresetReverb.PRESET_LARGEHALL
      roomSize >= 45.0 -> PresetReverb.PRESET_MEDIUMROOM
      roomSize >= 20.0 -> PresetReverb.PRESET_SMALLROOM
      else -> PresetReverb.PRESET_PLATE
    }
  }

  private fun buildCompatibilityJson(
    enabled: Boolean,
    applied: List<String>,
    customStatus: String?,
  ): String {
    val cap = probeNativeGlobalCapabilities()
    val unsupported = mutableListOf("Noise Gate", "Low-pass", "High-pass", "Echo")
    if (!cap.eqSupported) unsupported.add("Equalizer")
    if (!cap.reverbSupported) {
      unsupported.add("Reverb")
      unsupported.add("Hall")
    }

    val statusText = customStatus ?: when {
      cap.anySupported ->
        "Android device compatible with global Native Audio Effects."
      else ->
        "This Android device does not expose compatible global-mix Native Audio Effects."
    }

    return JSONObject().apply {
      put("enabled", enabled && cap.anySupported)
      put("isNativeAndroid", true)
      put("supported", cap.anySupported)
      put("equalizerSupported", cap.eqSupported)
      put("reverbSupported", cap.reverbSupported)
      put("appliedEffects", JSONArray(applied))
      put("unsupportedEffects", JSONArray(unsupported))
      put("statusDetail", statusText)
    }.toString()
  }

  companion object {
    private const val APP_ASSETS_HOST = "appassets.androidplatform.net"
  }
}
