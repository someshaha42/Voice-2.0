export const AudioConfig = {
  OUTPUT_FORMAT_LABEL: 'WAV (PCM)',
  OUTPUT_SAMPLE_RATE_HZ: 48_000,
  OUTPUT_BITS_PER_SAMPLE: 16,
  OUTPUT_CHANNELS: 1,
  OUTPUT_BITRATE_BPS: 48_000 * 16 * 1,
  OUTPUT_BITRATE_KBPS: 768,
  BYTES_PER_SAMPLE: 2,
  BYTES_PER_SECOND: 48_000 * 1 * 2,
  DSP_HOP_SIZE: 128,
  DSP_FFT_SIZE: 512,
} as const;

export enum StudioTab {
  RECORDER = 'RECORDER',
  VOICE_CHANGER = 'VOICE_CHANGER',
  EFFECTS = 'EFFECTS',
}

export enum RecordingStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  INTERRUPTED_PAUSED = 'INTERRUPTED_PAUSED',
}

export enum MonitoringLatencyZone {
  FASTER = 'FASTER',
  DEFAULT = 'DEFAULT',
  MORE_DELAY = 'MORE_DELAY',
}

export interface MonitoringConfig {
  livePreviewEnabled: boolean;
  delaySliderPosition: number;
  previewVolumePercent: number;
  echoCancellationEnabled: boolean;
  noiseGateThresholdDb: number;
}

export const MonitoringConstants = {
  MIN_SLIDER: -1.0,
  MAX_SLIDER: 1.0,
  STEP_SLIDER: 0.05,
  DEFAULT_SLIDER: 0.0,
  MAX_ADDED_DELAY_MS: 200,
  MIN_VOLUME_PERCENT: 0,
  MAX_VOLUME_PERCENT: 500,
  STEP_VOLUME_PERCENT: 10,
  DEFAULT_VOLUME_PERCENT: 100,
  MIN_AEC_GATE_THRESHOLD_DB: -60,
  MAX_AEC_GATE_THRESHOLD_DB: -20,
  DEFAULT_AEC_GATE_THRESHOLD_DB: -45,
  STEP_AEC_GATE_THRESHOLD_DB: 1,
} as const;

export function getMonitoringZone(sliderPos: number): MonitoringLatencyZone {
  if (sliderPos < -0.025) return MonitoringLatencyZone.FASTER;
  if (sliderPos > 0.025) return MonitoringLatencyZone.MORE_DELAY;
  return MonitoringLatencyZone.DEFAULT;
}

export function getAddedOutputDelayMs(sliderPos: number): number {
  if (sliderPos > 0.025) {
    const clamped = Math.max(0, Math.min(1, sliderPos));
    return Math.round(clamped * MonitoringConstants.MAX_ADDED_DELAY_MS);
  }
  return 0;
}

export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    livePreviewEnabled: false,
    delaySliderPosition: MonitoringConstants.DEFAULT_SLIDER,
    previewVolumePercent: MonitoringConstants.DEFAULT_VOLUME_PERCENT,
    echoCancellationEnabled: true,
    noiseGateThresholdDb: MonitoringConstants.DEFAULT_AEC_GATE_THRESHOLD_DB,
  };
}

export type BluetoothRouteType = 'NONE' | 'HFP_HSP' | 'A2DP';
export type AecRouteStatus = 'OFF' | 'ACTIVE_HW_AND_DSP' | 'ACTIVE_DSP_ONLY' | 'STANDBY';

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  isUsb: boolean;
  isBluetooth?: boolean;
}

export interface AudioHardwareState {
  inputDeviceId: string | null;
  inputDeviceName: string;
  isUsbMicConnected: boolean;
  isBluetoothInputConnected: boolean;
  supportedSampleRates: number[];
  activeInputSampleRateHz: number;
  activeInputChannelCount: number;
  isResamplingActive: boolean;
  outputDeviceId: string | null;
  outputDeviceName: string;
  isWiredHeadphoneConnected: boolean;
  isBluetoothOutputConnected: boolean;
  bluetoothRouteType: BluetoothRouteType;
  aecHardwareSupported: boolean;
  aecHardwareActive: boolean;
  aecRouteStatus: AecRouteStatus;
  aecStatusDetail: string;
  supportsOutputSinkRouting: boolean;
  hardwareValidated: boolean;
  availableInputs: AudioDeviceOption[];
  availableOutputs: AudioDeviceOption[];
}

export function createDefaultHardwareState(): AudioHardwareState {
  return {
    inputDeviceId: null,
    inputDeviceName: 'Internal Microphone',
    isUsbMicConnected: false,
    isBluetoothInputConnected: false,
    supportedSampleRates: [48_000],
    activeInputSampleRateHz: AudioConfig.OUTPUT_SAMPLE_RATE_HZ,
    activeInputChannelCount: 1,
    isResamplingActive: false,
    outputDeviceId: null,
    outputDeviceName: 'System Output (Use headphones for preview)',
    isWiredHeadphoneConnected: false,
    isBluetoothOutputConnected: false,
    bluetoothRouteType: 'NONE',
    aecHardwareSupported: false,
    aecHardwareActive: false,
    aecRouteStatus: 'STANDBY',
    aecStatusDetail: 'AEC & Noise Gate ready',
    supportsOutputSinkRouting: false,
    hardwareValidated: false,
    availableInputs: [],
    availableOutputs: [],
  };
}

export interface LiveAudioMetrics {
  rmsDb: number;
  peakDb: number;
  isClipping: boolean;
  clipCount: number;
  gateOpen: boolean;
  gateGainReductionDb: number;
  aecGateOpen: boolean;
  aecGateGainReductionDb: number;
  estimatedNoiseFloorDb: number;
  noiseFloorDetected: boolean;
  isCalibratingNoise: boolean;
  calibrationProgress: number;
  calibrationRecommendationDb: number | null;
  isInputMonitoringActive: boolean;
  recordingDurationMs: number;
  estimatedMonitoringLatencyMs: number;
}

export function createDefaultLiveMetrics(): LiveAudioMetrics {
  return {
    rmsDb: -60,
    peakDb: -60,
    isClipping: false,
    clipCount: 0,
    gateOpen: true,
    gateGainReductionDb: 0,
    aecGateOpen: true,
    aecGateGainReductionDb: 0,
    estimatedNoiseFloorDb: -60,
    noiseFloorDetected: false,
    isCalibratingNoise: false,
    calibrationProgress: 0,
    calibrationRecommendationDb: null,
    isInputMonitoringActive: false,
    recordingDurationMs: 0,
    estimatedMonitoringLatencyMs: 28,
  };
}

export enum VoicePreset {
  NORMAL = 'NORMAL',
  FEMALE = 'FEMALE',
  CHILD = 'CHILD',
  GIRL = 'GIRL',
  WOMAN = 'WOMAN',
}

export const VOICE_PRESET_LABELS: Record<VoicePreset, string> = {
  [VoicePreset.NORMAL]: 'Normal',
  [VoicePreset.FEMALE]: 'Female',
  [VoicePreset.CHILD]: 'Child',
  [VoicePreset.GIRL]: 'Girl',
  [VoicePreset.WOMAN]: 'Woman',
};

export interface PresetVoiceProfile {
  basePitchSemitones: number;
  baseFormantSemitones: number;
  chestGainDb: number;
  chestFreqHz: number;
  warmthGainDb: number;
  warmthFreqHz: number;
  presenceGainDb: number;
  presenceFreqHz: number;
  airGainDb: number;
  airFreqHz: number;
  deEssAmount: number;
  defaultPitchLevel: number;
  defaultToneLevel: number;
  defaultClarity: number;
}

export const VOICE_PRESET_PROFILES: Record<VoicePreset, PresetVoiceProfile> = {
  [VoicePreset.NORMAL]: {
    basePitchSemitones: 0.0,
    baseFormantSemitones: 0.0,
    chestGainDb: 0.0,
    chestFreqHz: 165.0,
    warmthGainDb: 0.0,
    warmthFreqHz: 280.0,
    presenceGainDb: 0.0,
    presenceFreqHz: 2800.0,
    airGainDb: 0.0,
    airFreqHz: 7200.0,
    deEssAmount: 0.0,
    defaultPitchLevel: 0,
    defaultToneLevel: 50,
    defaultClarity: 50,
  },
  [VoicePreset.FEMALE]: {
    basePitchSemitones: 5.4,
    baseFormantSemitones: 3.5,
    chestGainDb: -3.4,
    chestFreqHz: 170.0,
    warmthGainDb: 1.4,
    warmthFreqHz: 310.0,
    presenceGainDb: 2.1,
    presenceFreqHz: 3000.0,
    airGainDb: 1.6,
    airFreqHz: 7500.0,
    deEssAmount: 0.25,
    defaultPitchLevel: 85,
    defaultToneLevel: 80,
    defaultClarity: 65,
  },
  [VoicePreset.CHILD]: {
    basePitchSemitones: 9.2,
    baseFormantSemitones: 5.6,
    chestGainDb: -5.5,
    chestFreqHz: 185.0,
    warmthGainDb: 0.6,
    warmthFreqHz: 360.0,
    presenceGainDb: 2.6,
    presenceFreqHz: 2600.0,
    airGainDb: 2.0,
    airFreqHz: 6800.0,
    deEssAmount: 0.32,
    defaultPitchLevel: 90,
    defaultToneLevel: 85,
    defaultClarity: 70,
  },
  [VoicePreset.GIRL]: {
    basePitchSemitones: 7.1,
    baseFormantSemitones: 4.4,
    chestGainDb: -4.4,
    chestFreqHz: 175.0,
    warmthGainDb: 1.0,
    warmthFreqHz: 330.0,
    presenceGainDb: 2.7,
    presenceFreqHz: 3400.0,
    airGainDb: 2.2,
    airFreqHz: 8000.0,
    deEssAmount: 0.28,
    defaultPitchLevel: 88,
    defaultToneLevel: 82,
    defaultClarity: 68,
  },
  [VoicePreset.WOMAN]: {
    basePitchSemitones: 4.3,
    baseFormantSemitones: 2.7,
    chestGainDb: -1.8,
    chestFreqHz: 155.0,
    warmthGainDb: 1.9,
    warmthFreqHz: 320.0,
    presenceGainDb: 1.7,
    presenceFreqHz: 2650.0,
    airGainDb: 0.9,
    airFreqHz: 6500.0,
    deEssAmount: 0.20,
    defaultPitchLevel: 85,
    defaultToneLevel: 78,
    defaultClarity: 60,
  },
};

export interface VoiceChangerConfig {
  enabled: boolean;
  preset: VoicePreset;
  pitchLevelPercent: number;
  toneLevelPercent: number;
  clarityPercent: number;
}

export const VoiceChangerConstants = {
  MIN_LEVEL_PCT: 0,
  MAX_LEVEL_PCT: 100,
  STEP_LEVEL_PCT: 5,
} as const;

export function getVoicePresetDefaultConfig(
  preset: VoicePreset,
  enabled = false
): VoiceChangerConfig {
  const p = VOICE_PRESET_PROFILES[preset];
  return {
    enabled,
    preset,
    pitchLevelPercent: p.defaultPitchLevel,
    toneLevelPercent: p.defaultToneLevel,
    clarityPercent: p.defaultClarity,
  };
}

export enum FilterSlope {
  SLOPE_12 = 12,
  SLOPE_24 = 24,
}

export enum ReverbPreset {
  SMALL_ROOM = 'SMALL_ROOM',
  STUDIO = 'STUDIO',
  HALL = 'HALL',
  PLATE = 'PLATE',
}

export enum DelaySubdivision {
  QUARTER = 'QUARTER',
  EIGHTH = 'EIGHTH',
  DOTTED_EIGHTH = 'DOTTED_EIGHTH',
  SIXTEENTH = 'SIXTEENTH',
}

export const DELAY_SUBDIVISION_META: Record<DelaySubdivision, { label: string; beatFactor: number }> = {
  [DelaySubdivision.QUARTER]: { label: '1/4', beatFactor: 1.0 },
  [DelaySubdivision.EIGHTH]: { label: '1/8', beatFactor: 0.5 },
  [DelaySubdivision.DOTTED_EIGHTH]: { label: '1/8D', beatFactor: 0.75 },
  [DelaySubdivision.SIXTEENTH]: { label: '1/16', beatFactor: 0.25 },
};

export interface EqualizerConfig {
  enabled: boolean;
  mixPercent: number;
  lowFreqHz: number;
  lowGainDb: number;
  lowQ: number;
  mid1FreqHz: number;
  mid1GainDb: number;
  mid1Q: number;
  mid2FreqHz: number;
  mid2GainDb: number;
  mid2Q: number;
  mid3FreqHz: number;
  mid3GainDb: number;
  mid3Q: number;
  highFreqHz: number;
  highGainDb: number;
  highQ: number;
}

export interface ReverbConfig {
  enabled: boolean;
  preset: ReverbPreset;
  mixPercent: number;
  roomSizePercent: number;
  decayTimeSec: number;
  dampingPercent: number;
  wetPercent: number;
  dryPercent: number;
  widthPercent: number;
  preDelayMs: number;
}

export interface EchoConfig {
  enabled: boolean;
  mixPercent: number;
  timeMs: number;
  feedbackPercent: number;
  echoLevelPercent: number;
  wetPercent: number;
  dryPercent: number;
  pingPong: boolean;
  widthPercent: number;
  tempoSync: boolean;
  bpm: number;
  subdivision: DelaySubdivision;
  lowCutHz: number;
  highCutHz: number;
}

export interface NoiseGateConfig {
  enabled: boolean;
  mixPercent: number;
  thresholdDb: number;
  attackMs: number;
  holdMs: number;
  releaseMs: number;
  rangeDb: number;
}

export const NoiseGateConstants = {
  MIN_MIX_PCT: 0,
  MAX_MIX_PCT: 100,
  DEFAULT_MIX_PCT: 100,
  MIN_THRESHOLD_DB: -70,
  MAX_THRESHOLD_DB: -10,
  DEFAULT_THRESHOLD_DB: -50,
  MIN_ATTACK_MS: 0.5,
  MAX_ATTACK_MS: 50,
  DEFAULT_ATTACK_MS: 5,
  MIN_HOLD_MS: 0,
  MAX_HOLD_MS: 500,
  DEFAULT_HOLD_MS: 50,
  MIN_RELEASE_MS: 20,
  MAX_RELEASE_MS: 600,
  DEFAULT_RELEASE_MS: 100,
  MIN_RANGE_DB: 0,
  MAX_RANGE_DB: 80,
  DEFAULT_RANGE_DB: 80,
} as const;

export interface LowPassConfig {
  enabled: boolean;
  mixPercent: number;
  cutoffHz: number;
  resonance: number;
  slope: FilterSlope;
}

export interface HighPassConfig {
  enabled: boolean;
  mixPercent: number;
  cutoffHz: number;
  resonance: number;
  slope: FilterSlope;
}

export interface HallConfig {
  enabled: boolean;
  echoAmount: number;
  reverberationAmount: number;
}

export interface EffectsRackConfig {
  equalizer: EqualizerConfig;
  reverb: ReverbConfig;
  echo: EchoConfig;
  noiseGate: NoiseGateConfig;
  lowPass: LowPassConfig;
  highPass: HighPassConfig;
  hall: HallConfig;
}

export function getEffectiveDelayMs(echo: EchoConfig): number {
  if (echo.tempoSync) {
    const clampedBpm = Math.max(60, Math.min(200, echo.bpm));
    const beatMs = 60_000 / clampedBpm;
    const raw = Math.round(beatMs * DELAY_SUBDIVISION_META[echo.subdivision].beatFactor);
    return Math.max(20, Math.min(1000, raw));
  }
  return Math.max(20, Math.min(1000, echo.timeMs));
}

export function getActiveEffectCount(fx: EffectsRackConfig): number {
  return [
    fx.noiseGate.enabled,
    fx.lowPass.enabled,
    fx.highPass.enabled,
    fx.equalizer.enabled,
    fx.reverb.enabled,
    fx.echo.enabled,
    fx.hall.enabled,
  ].filter(Boolean).length;
}

export const defaultEqualizer = (enabled = false): EqualizerConfig => ({
  enabled,
  mixPercent: 100,
  lowFreqHz: 120,
  lowGainDb: 0,
  lowQ: 0.71,
  mid1FreqHz: 400,
  mid1GainDb: 0,
  mid1Q: 0.71,
  mid2FreqHz: 1500,
  mid2GainDb: 0,
  mid2Q: 1.0,
  mid3FreqHz: 5000,
  mid3GainDb: 0,
  mid3Q: 1.0,
  highFreqHz: 10000,
  highGainDb: 0,
  highQ: 0.71,
});

export const defaultReverb = (enabled = false): ReverbConfig => ({
  enabled,
  preset: ReverbPreset.STUDIO,
  mixPercent: 81,
  roomSizePercent: 50,
  decayTimeSec: 1.6,
  dampingPercent: 50,
  wetPercent: 30,
  dryPercent: 100,
  widthPercent: 100,
  preDelayMs: 0,
});

export const defaultEcho = (enabled = false): EchoConfig => ({
  enabled,
  mixPercent: 60,
  timeMs: 250,
  feedbackPercent: 35,
  echoLevelPercent: 30,
  wetPercent: 35,
  dryPercent: 100,
  pingPong: false,
  widthPercent: 60,
  tempoSync: false,
  bpm: 120,
  subdivision: DelaySubdivision.EIGHTH,
  lowCutHz: 80,
  highCutHz: 8000,
});

export const defaultNoiseGate = (enabled = false): NoiseGateConfig => ({
  enabled,
  mixPercent: NoiseGateConstants.DEFAULT_MIX_PCT,
  thresholdDb: NoiseGateConstants.DEFAULT_THRESHOLD_DB,
  attackMs: NoiseGateConstants.DEFAULT_ATTACK_MS,
  holdMs: NoiseGateConstants.DEFAULT_HOLD_MS,
  releaseMs: NoiseGateConstants.DEFAULT_RELEASE_MS,
  rangeDb: NoiseGateConstants.DEFAULT_RANGE_DB,
});

export const defaultLowPass = (enabled = false): LowPassConfig => ({
  enabled,
  mixPercent: 100,
  cutoffHz: 5000,
  resonance: 0.71,
  slope: FilterSlope.SLOPE_12,
});

export const defaultHighPass = (enabled = false): HighPassConfig => ({
  enabled,
  mixPercent: 100,
  cutoffHz: 200,
  resonance: 0.71,
  slope: FilterSlope.SLOPE_12,
});

export const defaultHall = (enabled = false): HallConfig => ({
  enabled,
  echoAmount: 55,
  reverberationAmount: 71,
});

export const createDefaultEffectsRack = (): EffectsRackConfig => ({
  equalizer: defaultEqualizer(false),
  reverb: defaultReverb(false),
  echo: defaultEcho(false),
  noiseGate: defaultNoiseGate(false),
  lowPass: defaultLowPass(false),
  highPass: defaultHighPass(false),
  hall: defaultHall(false),
});

export interface BackgroundAudioEffectsState {
  enabled: boolean;
  isNativeAndroid: boolean;
  supported: boolean;
  equalizerSupported: boolean;
  reverbSupported: boolean;
  appliedEffects: string[];
  unsupportedEffects: string[];
  statusDetail: string;
}

export function createDefaultBackgroundAudioEffectsState(): BackgroundAudioEffectsState {
  return {
    enabled: false,
    isNativeAndroid: false,
    supported: false,
    equalizerSupported: false,
    reverbSupported: false,
    appliedEffects: [],
    unsupportedEffects: ['Noise Gate', 'Low-pass', 'High-pass', 'Echo'],
    statusDetail: 'Checking device audio effect compatibility...',
  };
}

export interface RecordingItem {
  id: string;
  fileName: string;
  createdAtMs: number;
  durationMs: number;
  sizeBytes: number;
  sampleRateHz: number;
  bitsPerSample: number;
  channels: number;
  wasRecovered?: boolean;
}

export interface PlaybackUiState {
  activeId: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
}

export interface StagedAudioItem {
  id: string;
  displayName: string;
  durationMs: number;
  formatLabel: string;
  dateModifiedSec: number;
  sizeBytes: number;
  file?: File;
}

export interface ImportedAudioSource {
  id: string;
  displayName: string;
  formatLabel: string;
  fromVideo: boolean;
  pcm48k: Float32Array;
  totalFrames48k: number;
  durationMs: number;
}

export interface ImportedPlaybackState {
  source: ImportedAudioSource | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isImporting: boolean;
  isExporting: boolean;
  exportProgress: number;
}
