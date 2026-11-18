import {
  BackgroundAudioEffectsState,
  createDefaultBackgroundAudioEffectsState,
  EffectsRackConfig,
} from '../types/audio';

interface VoxForgeNativeBridge {
  saveBase64File?: (base64Data: string, fileName: string, mimeType: string) => boolean;
  getBackgroundEffectsCompatibility?: () => string;
  setBackgroundAudioEffects?: (enabled: boolean, configJson: string) => string;
}

declare global {
  interface Window {
    VoxForgeNative?: VoxForgeNativeBridge;
  }
}

const UNSUPPORTED_GLOBAL_EFFECTS = ['Noise Gate', 'Low-pass', 'High-pass', 'Echo'];

function getNativeBridge(): VoxForgeNativeBridge | null {
  if (typeof window === 'undefined') return null;
  return window.VoxForgeNative ?? null;
}

function browserUnsupportedState(): BackgroundAudioEffectsState {
  return {
    enabled: false,
    isNativeAndroid: false,
    supported: false,
    equalizerSupported: false,
    reverbSupported: false,
    appliedEffects: [],
    unsupportedEffects: [...UNSUPPORTED_GLOBAL_EFFECTS],
    statusDetail:
      'Unavailable in Web Browser. Android Native Audio Effects require the Android app runtime on a compatible device.',
  };
}

function normalizeBridgeResponse(
  rawJson: string | undefined,
  fallbackStatus: string
): BackgroundAudioEffectsState {
  const base = createDefaultBackgroundAudioEffectsState();
  if (!rawJson) {
    return {
      ...base,
      isNativeAndroid: Boolean(getNativeBridge()),
      supported: false,
      statusDetail: fallbackStatus,
    };
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<BackgroundAudioEffectsState>;
    return {
      enabled: Boolean(parsed.enabled),
      isNativeAndroid: Boolean(parsed.isNativeAndroid ?? true),
      supported: Boolean(parsed.supported),
      equalizerSupported: Boolean(parsed.equalizerSupported),
      reverbSupported: Boolean(parsed.reverbSupported),
      appliedEffects: Array.isArray(parsed.appliedEffects)
        ? parsed.appliedEffects.map(String)
        : [],
      unsupportedEffects: Array.isArray(parsed.unsupportedEffects)
        ? parsed.unsupportedEffects.map(String)
        : [...UNSUPPORTED_GLOBAL_EFFECTS],
      statusDetail:
        typeof parsed.statusDetail === 'string' && parsed.statusDetail.trim().length > 0
          ? parsed.statusDetail
          : fallbackStatus,
    };
  } catch {
    return {
      ...base,
      isNativeAndroid: Boolean(getNativeBridge()),
      supported: false,
      statusDetail: fallbackStatus,
    };
  }
}

export function probeBackgroundAudioEffectsCompatibility(): BackgroundAudioEffectsState {
  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.getBackgroundEffectsCompatibility !== 'function') {
    return browserUnsupportedState();
  }
  try {
    const raw = bridge.getBackgroundEffectsCompatibility();
    return normalizeBridgeResponse(
      raw,
      'Android device compatibility check did not return a valid status.'
    );
  } catch (err) {
    return {
      ...createDefaultBackgroundAudioEffectsState(),
      isNativeAndroid: true,
      supported: false,
      statusDetail:
        err instanceof Error
          ? `Native audio effect probe failed: ${err.message}`
          : 'Native audio effect probe failed on this Android device.',
    };
  }
}

export function applyBackgroundAudioEffects(
  enabled: boolean,
  effectsConfig: EffectsRackConfig
): BackgroundAudioEffectsState {
  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.setBackgroundAudioEffects !== 'function') {
    return browserUnsupportedState();
  }

  const payload = {
    equalizer: {
      enabled: effectsConfig.equalizer.enabled,
      mixPercent: effectsConfig.equalizer.mixPercent,
      lowFreqHz: effectsConfig.equalizer.lowFreqHz,
      lowGainDb: effectsConfig.equalizer.lowGainDb,
      mid1FreqHz: effectsConfig.equalizer.mid1FreqHz,
      mid1GainDb: effectsConfig.equalizer.mid1GainDb,
      mid2FreqHz: effectsConfig.equalizer.mid2FreqHz,
      mid2GainDb: effectsConfig.equalizer.mid2GainDb,
      mid3FreqHz: effectsConfig.equalizer.mid3FreqHz,
      mid3GainDb: effectsConfig.equalizer.mid3GainDb,
      highFreqHz: effectsConfig.equalizer.highFreqHz,
      highGainDb: effectsConfig.equalizer.highGainDb,
    },
    reverb: {
      enabled: effectsConfig.reverb.enabled,
      mixPercent: effectsConfig.reverb.mixPercent,
      roomSizePercent: effectsConfig.reverb.roomSizePercent,
      decayTimeSec: effectsConfig.reverb.decayTimeSec,
      dampingPercent: effectsConfig.reverb.dampingPercent,
      wetPercent: effectsConfig.reverb.wetPercent,
      dryPercent: effectsConfig.reverb.dryPercent,
      preDelayMs: effectsConfig.reverb.preDelayMs,
    },
    hall: {
      enabled: effectsConfig.hall.enabled,
      echoAmount: effectsConfig.hall.echoAmount,
      reverberationAmount: effectsConfig.hall.reverberationAmount,
    },
    unsupportedActive: {
      noiseGate: effectsConfig.noiseGate.enabled,
      lowPass: effectsConfig.lowPass.enabled,
      highPass: effectsConfig.highPass.enabled,
      echo: effectsConfig.echo.enabled,
    },
  };

  try {
    const raw = bridge.setBackgroundAudioEffects(enabled, JSON.stringify(payload));
    return normalizeBridgeResponse(
      raw,
      enabled
        ? 'Failed to attach Android Native Audio Effects to global mix.'
        : 'Disabled background audio effects.'
    );
  } catch (err) {
    return {
      ...createDefaultBackgroundAudioEffectsState(),
      isNativeAndroid: true,
      supported: false,
      enabled: false,
      statusDetail:
        err instanceof Error
          ? `Failed to apply native background audio effects: ${err.message}`
          : 'Failed to apply native background audio effects on this device.',
    };
  }
}
