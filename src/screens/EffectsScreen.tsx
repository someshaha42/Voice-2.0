import React from 'react';
import { AlertTriangle, Radio, RotateCcw } from 'lucide-react';
import { EqualizerResponseGraph } from '../components/EqualizerResponseGraph';
import {
  BackgroundAudioEffectsState,
  defaultEcho,
  defaultEqualizer,
  defaultHall,
  defaultHighPass,
  defaultLowPass,
  defaultNoiseGate,
  defaultReverb,
  EchoConfig,
  EffectsRackConfig,
  EqualizerConfig,
  FilterSlope,
  HallConfig,
  HighPassConfig,
  LowPassConfig,
  NoiseGateConfig,
  NoiseGateConstants,
  ReverbConfig,
} from '../types/audio';
import { formatDb, formatFreqHz } from '../utils/format';

interface EffectsScreenProps {
  config: EffectsRackConfig;
  backgroundEffects: BackgroundAudioEffectsState;
  onToggleBackgroundEffects: (enabled: boolean) => void;
  onNoiseGateChanged: (c: NoiseGateConfig) => void;
  onLowPassChanged: (c: LowPassConfig) => void;
  onHighPassChanged: (c: HighPassConfig) => void;
  onEqualizerChanged: (c: EqualizerConfig) => void;
  onReverbChanged: (c: ReverbConfig) => void;
  onEchoChanged: (c: EchoConfig) => void;
  onHallChanged: (c: HallConfig) => void;
}

export const EffectsScreen: React.FC<EffectsScreenProps> = React.memo(({
  config,
  backgroundEffects,
  onToggleBackgroundEffects,
  onNoiseGateChanged,
  onLowPassChanged,
  onHighPassChanged,
  onEqualizerChanged,
  onReverbChanged,
  onEchoChanged,
  onHallChanged,
}) => {
  const g = config.noiseGate;
  const lp = config.lowPass;
  const hp = config.highPass;
  const eq = config.equalizer;
  const rev = config.reverb;
  const ec = config.echo;
  const hall = config.hall;

  const isBgEnabled = backgroundEffects.enabled;
  const isBgSupported = backgroundEffects.supported;

  return (
    <div className="w-full h-full overflow-y-auto flex justify-center">
      <div className="w-full max-w-[640px] lg:max-w-[1120px] xl:max-w-[1360px] px-3.5 py-2.5 flex flex-col gap-2.5">
        {/* Background Audio Effects Toggle Card */}
        <div
          className={`perf-card w-full rounded-xl bg-[#1A2130] border p-3.5 flex flex-col gap-2.5 ${
            isBgEnabled
              ? 'border-[#00D4FF]/80'
              : !isBgSupported
                ? 'border-[#F59E0B]/45'
                : 'border-[#2C374D]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                  isBgEnabled
                    ? 'bg-[#0E303D] border-[#00D4FF]/60 text-[#00D4FF]'
                    : 'bg-[#131822] border-[#2C374D] text-[#94A3B8]'
                }`}
              >
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
                    Background Audio Effects
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wider uppercase ${
                      isBgEnabled
                        ? 'bg-[#123222] border-[#22C55E] text-[#22C55E]'
                        : isBgSupported
                          ? 'bg-[#0E303D] border-[#00D4FF]/60 text-[#00D4FF]'
                          : 'bg-[#3A280C] border-[#F59E0B]/60 text-[#F59E0B]'
                    }`}
                  >
                    {isBgEnabled ? 'Active' : isBgSupported ? 'Compatible' : 'Unsupported'}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Apply VoxForge effects to background audio of other apps via Android Native Audio
                  Effects.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isBgEnabled}
              aria-label="Toggle Background Audio Effects"
              disabled={!isBgSupported && !isBgEnabled}
              onClick={() => onToggleBackgroundEffects(!isBgEnabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                !isBgSupported && !isBgEnabled
                  ? 'opacity-45 cursor-not-allowed bg-[#131822] border-[#2C374D]'
                  : isBgEnabled
                    ? 'bg-[#00D4FF] border-[#00D4FF] cursor-pointer'
                    : 'bg-[#131822] border-[#2C374D] cursor-pointer'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full transition-transform ${
                  isBgEnabled ? 'translate-x-6 bg-[#131822]' : 'translate-x-1 bg-[#94A3B8]'
                }`}
              />
            </button>
          </div>

          <div className="rounded-lg bg-[#3A280C]/55 border border-[#F59E0B]/40 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <p className="text-xs text-[#FDE68A] leading-relaxed">
              Warning: Audio processing mode may switch from <strong className="font-semibold">Native</strong>{' '}
              to <strong className="font-semibold">Background</strong> while enabled.
            </p>
          </div>

          <div className="rounded-lg bg-[#131822] border border-[#2C374D] px-3 py-2 flex flex-col gap-1">
            <p className="text-xs text-[#E2E8F0]">{backgroundEffects.statusDetail}</p>
            {isBgSupported && (
              <p className="text-[11px] text-[#94A3B8]">
                Native global-mix:{' '}
                <span className="text-[#22C55E]">
                  {[
                    backgroundEffects.equalizerSupported ? 'Equalizer' : null,
                    backgroundEffects.reverbSupported ? 'Reverb, Hall' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                {isBgEnabled && backgroundEffects.appliedEffects.length > 0
                  ? ` • Applied now: ${backgroundEffects.appliedEffects.join(', ')}`
                  : ''}
              </p>
            )}
            {backgroundEffects.unsupportedEffects.length > 0 && (
              <p className="text-[11px] text-[#64748B]">
                Unsupported for global background audio (not simulated):{' '}
                {backgroundEffects.unsupportedEffects.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
        {/* 1. Noise Gate */}
        <CollapsibleEffectCard
          title="Noise Gate"
          enabled={g.enabled}
          onEnabledChanged={(enabled) => onNoiseGateChanged({ ...g, enabled })}
          onReset={() => onNoiseGateChanged(defaultNoiseGate(g.enabled))}
        >
          <EffectSliderRow
            label="Mix"
            valueText={`${g.mixPercent}%`}
            value={g.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onNoiseGateChanged({ ...g, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Threshold"
            valueText={`${g.thresholdDb.toFixed(1)} dB`}
            value={g.thresholdDb}
            min={NoiseGateConstants.MIN_THRESHOLD_DB}
            max={NoiseGateConstants.MAX_THRESHOLD_DB}
            step={0.5}
            onChange={(v) =>
              onNoiseGateChanged({ ...g, thresholdDb: Math.round(v * 2) / 2 })
            }
          />
          <EffectSliderRow
            label="Attack"
            valueText={`${g.attackMs.toFixed(1)} ms`}
            value={g.attackMs}
            min={NoiseGateConstants.MIN_ATTACK_MS}
            max={NoiseGateConstants.MAX_ATTACK_MS}
            step={0.5}
            onChange={(v) => onNoiseGateChanged({ ...g, attackMs: Math.round(v * 2) / 2 })}
          />
          <EffectSliderRow
            label="Hold"
            valueText={`${Math.round(g.holdMs)} ms`}
            value={g.holdMs}
            min={NoiseGateConstants.MIN_HOLD_MS}
            max={NoiseGateConstants.MAX_HOLD_MS}
            step={5}
            onChange={(v) => onNoiseGateChanged({ ...g, holdMs: Math.round(v / 5) * 5 })}
          />
          <EffectSliderRow
            label="Release"
            valueText={`${Math.round(g.releaseMs)} ms`}
            value={g.releaseMs}
            min={NoiseGateConstants.MIN_RELEASE_MS}
            max={NoiseGateConstants.MAX_RELEASE_MS}
            step={10}
            onChange={(v) => onNoiseGateChanged({ ...g, releaseMs: Math.round(v / 10) * 10 })}
          />
          <EffectSliderRow
            label="Range"
            valueText={`${g.rangeDb.toFixed(1)} dB`}
            value={g.rangeDb}
            min={NoiseGateConstants.MIN_RANGE_DB}
            max={NoiseGateConstants.MAX_RANGE_DB}
            step={1}
            onChange={(v) => onNoiseGateChanged({ ...g, rangeDb: Math.round(v) })}
          />
        </CollapsibleEffectCard>

        {/* 2. Low-pass */}
        <CollapsibleEffectCard
          title="Low-pass"
          enabled={lp.enabled}
          onEnabledChanged={(enabled) => onLowPassChanged({ ...lp, enabled })}
          onReset={() => onLowPassChanged(defaultLowPass(lp.enabled))}
        >
          <EffectSliderRow
            label="Mix"
            valueText={`${lp.mixPercent}%`}
            value={lp.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onLowPassChanged({ ...lp, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Cutoff"
            valueText={formatFreqHz(lp.cutoffHz)}
            value={lp.cutoffHz}
            min={200}
            max={20000}
            step={50}
            onChange={(v) => onLowPassChanged({ ...lp, cutoffHz: Math.round(v / 50) * 50 })}
          />
          <EffectSliderRow
            label="Resonance"
            valueText={lp.resonance.toFixed(2)}
            value={lp.resonance}
            min={0.3}
            max={4.0}
            step={0.01}
            onChange={(v) => onLowPassChanged({ ...lp, resonance: Math.round(v * 100) / 100 })}
          />
          <EffectSegmentRow
            label="Slope"
            optionA="12 dB/oct"
            optionB="24 dB/oct"
            isBSelected={lp.slope === FilterSlope.SLOPE_24}
            onSelectB={(is24) =>
              onLowPassChanged({
                ...lp,
                slope: is24 ? FilterSlope.SLOPE_24 : FilterSlope.SLOPE_12,
              })
            }
          />
        </CollapsibleEffectCard>

        {/* 3. High-pass */}
        <CollapsibleEffectCard
          title="High-pass"
          enabled={hp.enabled}
          onEnabledChanged={(enabled) => onHighPassChanged({ ...hp, enabled })}
          onReset={() => onHighPassChanged(defaultHighPass(hp.enabled))}
        >
          <EffectSliderRow
            label="Mix"
            valueText={`${hp.mixPercent}%`}
            value={hp.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onHighPassChanged({ ...hp, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Cutoff"
            valueText={formatFreqHz(hp.cutoffHz)}
            value={hp.cutoffHz}
            min={20}
            max={2000}
            step={10}
            onChange={(v) => onHighPassChanged({ ...hp, cutoffHz: Math.round(v / 10) * 10 })}
          />
          <EffectSliderRow
            label="Resonance"
            valueText={hp.resonance.toFixed(2)}
            value={hp.resonance}
            min={0.3}
            max={4.0}
            step={0.01}
            onChange={(v) => onHighPassChanged({ ...hp, resonance: Math.round(v * 100) / 100 })}
          />
          <EffectSegmentRow
            label="Slope"
            optionA="12 dB/oct"
            optionB="24 dB/oct"
            isBSelected={hp.slope === FilterSlope.SLOPE_24}
            onSelectB={(is24) =>
              onHighPassChanged({
                ...hp,
                slope: is24 ? FilterSlope.SLOPE_24 : FilterSlope.SLOPE_12,
              })
            }
          />
        </CollapsibleEffectCard>

        {/* 4. Equalizer */}
        <CollapsibleEffectCard
          title="Equalizer"
          enabled={eq.enabled}
          onEnabledChanged={(enabled) => onEqualizerChanged({ ...eq, enabled })}
          onReset={() => onEqualizerChanged(defaultEqualizer(eq.enabled))}
        >
          <EqualizerResponseGraph config={eq} />
          <EffectSliderRow
            label="Mix"
            valueText={`${eq.mixPercent}%`}
            value={eq.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onEqualizerChanged({ ...eq, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Low Freq"
            valueText={formatFreqHz(eq.lowFreqHz)}
            value={eq.lowFreqHz}
            min={20}
            max={500}
            step={5}
            onChange={(v) => onEqualizerChanged({ ...eq, lowFreqHz: Math.round(v / 5) * 5 })}
          />
          <EffectSliderRow
            label="Low Gain"
            valueText={formatDb(eq.lowGainDb)}
            value={eq.lowGainDb}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => onEqualizerChanged({ ...eq, lowGainDb: Math.round(v * 2) / 2 })}
          />
          <EffectSliderRow
            label="Mid 1 Freq"
            valueText={formatFreqHz(eq.mid1FreqHz)}
            value={eq.mid1FreqHz}
            min={100}
            max={1500}
            step={10}
            onChange={(v) => onEqualizerChanged({ ...eq, mid1FreqHz: Math.round(v / 10) * 10 })}
          />
          <EffectSliderRow
            label="Mid 1 Gain"
            valueText={formatDb(eq.mid1GainDb)}
            value={eq.mid1GainDb}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => onEqualizerChanged({ ...eq, mid1GainDb: Math.round(v * 2) / 2 })}
          />
          <EffectSliderRow
            label="Mid 1 Q"
            valueText={eq.mid1Q.toFixed(2)}
            value={eq.mid1Q}
            min={0.1}
            max={10.0}
            step={0.05}
            onChange={(v) => onEqualizerChanged({ ...eq, mid1Q: Math.round(v * 20) / 20 })}
          />
          <EffectSliderRow
            label="Mid 2 Freq"
            valueText={formatFreqHz(eq.mid2FreqHz)}
            value={eq.mid2FreqHz}
            min={300}
            max={5000}
            step={25}
            onChange={(v) => onEqualizerChanged({ ...eq, mid2FreqHz: Math.round(v / 25) * 25 })}
          />
          <EffectSliderRow
            label="Mid 2 Gain"
            valueText={formatDb(eq.mid2GainDb)}
            value={eq.mid2GainDb}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => onEqualizerChanged({ ...eq, mid2GainDb: Math.round(v * 2) / 2 })}
          />
          <EffectSliderRow
            label="Mid 2 Q"
            valueText={eq.mid2Q.toFixed(2)}
            value={eq.mid2Q}
            min={0.1}
            max={10.0}
            step={0.05}
            onChange={(v) => onEqualizerChanged({ ...eq, mid2Q: Math.round(v * 20) / 20 })}
          />
          <EffectSliderRow
            label="Mid 3 Freq"
            valueText={formatFreqHz(eq.mid3FreqHz)}
            value={eq.mid3FreqHz}
            min={1000}
            max={12000}
            step={50}
            onChange={(v) => onEqualizerChanged({ ...eq, mid3FreqHz: Math.round(v / 50) * 50 })}
          />
          <EffectSliderRow
            label="Mid 3 Gain"
            valueText={formatDb(eq.mid3GainDb)}
            value={eq.mid3GainDb}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => onEqualizerChanged({ ...eq, mid3GainDb: Math.round(v * 2) / 2 })}
          />
          <EffectSliderRow
            label="Mid 3 Q"
            valueText={eq.mid3Q.toFixed(2)}
            value={eq.mid3Q}
            min={0.1}
            max={10.0}
            step={0.05}
            onChange={(v) => onEqualizerChanged({ ...eq, mid3Q: Math.round(v * 20) / 20 })}
          />
          <EffectSliderRow
            label="High Freq"
            valueText={formatFreqHz(eq.highFreqHz)}
            value={eq.highFreqHz}
            min={2000}
            max={16000}
            step={100}
            onChange={(v) => onEqualizerChanged({ ...eq, highFreqHz: Math.round(v / 100) * 100 })}
          />
          <EffectSliderRow
            label="High Gain"
            valueText={formatDb(eq.highGainDb)}
            value={eq.highGainDb}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => onEqualizerChanged({ ...eq, highGainDb: Math.round(v * 2) / 2 })}
          />
        </CollapsibleEffectCard>

        {/* 5. Reverb */}
        <CollapsibleEffectCard
          title="Reverb"
          enabled={rev.enabled}
          onEnabledChanged={(enabled) => onReverbChanged({ ...rev, enabled })}
          onReset={() => onReverbChanged(defaultReverb(rev.enabled))}
        >
          <EffectSliderRow
            label="Mix"
            valueText={`${rev.mixPercent}%`}
            value={rev.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Room Size"
            valueText={`${rev.roomSizePercent}%`}
            value={rev.roomSizePercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, roomSizePercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Decay Time"
            valueText={`${rev.decayTimeSec.toFixed(1)} s`}
            value={rev.decayTimeSec}
            min={0.2}
            max={8.0}
            step={0.1}
            onChange={(v) => onReverbChanged({ ...rev, decayTimeSec: Math.round(v * 10) / 10 })}
          />
          <EffectSliderRow
            label="Damping"
            valueText={`${rev.dampingPercent}%`}
            value={rev.dampingPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, dampingPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Wet"
            valueText={`${rev.wetPercent}%`}
            value={rev.wetPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, wetPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Dry"
            valueText={`${rev.dryPercent}%`}
            value={rev.dryPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, dryPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Width"
            valueText={`${rev.widthPercent}%`}
            value={rev.widthPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onReverbChanged({ ...rev, widthPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Pre-delay"
            valueText={`${rev.preDelayMs.toFixed(1)} ms`}
            value={rev.preDelayMs}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => onReverbChanged({ ...rev, preDelayMs: Math.round(v * 2) / 2 })}
          />
        </CollapsibleEffectCard>

        {/* 6. Echo */}
        <CollapsibleEffectCard
          title="Echo"
          enabled={ec.enabled}
          onEnabledChanged={(enabled) => onEchoChanged({ ...ec, enabled })}
          onReset={() => onEchoChanged(defaultEcho(ec.enabled))}
        >
          <EffectSliderRow
            label="Mix"
            valueText={`${ec.mixPercent}%`}
            value={ec.mixPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onEchoChanged({ ...ec, mixPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Time"
            valueText={`${ec.timeMs} ms`}
            value={ec.timeMs}
            min={20}
            max={1000}
            step={5}
            onChange={(v) => onEchoChanged({ ...ec, timeMs: Math.round(v / 5) * 5 })}
          />
          <EffectSliderRow
            label="Feedback"
            valueText={`${ec.feedbackPercent}%`}
            value={ec.feedbackPercent}
            min={0}
            max={90}
            step={1}
            onChange={(v) => onEchoChanged({ ...ec, feedbackPercent: Math.round(v) })}
          />
          <EffectSliderRow
            label="Echo Level"
            valueText={`${ec.echoLevelPercent}%`}
            value={ec.echoLevelPercent}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onEchoChanged({ ...ec, echoLevelPercent: Math.round(v) })}
          />
          <EffectSegmentRow
            label="Ping-pong"
            optionA="Off"
            optionB="On"
            isBSelected={ec.pingPong}
            onSelectB={(pingPong) => onEchoChanged({ ...ec, pingPong })}
          />
          <EffectSliderRow
            label="Low Cut"
            valueText={formatFreqHz(ec.lowCutHz)}
            value={ec.lowCutHz}
            min={20}
            max={1000}
            step={10}
            onChange={(v) => onEchoChanged({ ...ec, lowCutHz: Math.round(v / 10) * 10 })}
          />
        </CollapsibleEffectCard>

        {/* 7. Hall */}
        <CollapsibleEffectCard
          title="Hall"
          enabled={hall.enabled}
          onEnabledChanged={(enabled) => onHallChanged({ ...hall, enabled })}
          onReset={() => onHallChanged(defaultHall(hall.enabled))}
        >
          <EffectSliderRow
            label="Echo"
            valueText={`${hall.echoAmount}`}
            value={hall.echoAmount}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onHallChanged({ ...hall, echoAmount: Math.round(v) })}
          />
          <EffectSliderRow
            label="Reverberation"
            valueText={`${hall.reverberationAmount}`}
            value={hall.reverberationAmount}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onHallChanged({ ...hall, reverberationAmount: Math.round(v) })}
          />
        </CollapsibleEffectCard>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
});

EffectsScreen.displayName = 'EffectsScreen';

interface CollapsibleEffectCardProps {
  title: string;
  enabled: boolean;
  onEnabledChanged: (enabled: boolean) => void;
  onReset: () => void;
  children: React.ReactNode;
}

const CollapsibleEffectCard: React.FC<CollapsibleEffectCardProps> = React.memo(({
  title,
  enabled,
  onEnabledChanged,
  onReset,
  children,
}) => (
  <div
    className={`perf-card w-full rounded-xl bg-[#1A2130] border ${
      enabled ? 'border-[#22C55E]/65' : 'border-[#2C374D]'
    }`}
  >
    <div className="pl-3.5 pr-2.5 py-1.5 flex items-center justify-between gap-2">
      <h3
        className={`font-display text-base font-semibold ${
          enabled ? 'text-[#F1F5F9]' : 'text-[#94A3B8]'
        }`}
      >
        {title}
      </h3>

      <div className="flex items-center gap-1.5">
        {enabled ? (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${title}`}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#222B3D] cursor-pointer"
          >
            <RotateCcw className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <span className="text-[11px] font-medium text-[#64748B] mr-1">Enable</span>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${title}`}
          onClick={() => onEnabledChanged(!enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
            enabled ? 'bg-[#22C55E] border-[#22C55E]' : 'bg-[#131822] border-[#2C374D]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full transition-transform ${
              enabled ? 'translate-x-6 bg-[#131822]' : 'translate-x-1 bg-[#94A3B8]'
            }`}
          />
        </button>
      </div>
    </div>

    {enabled && (
      <>
        <div className="border-t border-[#2C374D]" />
        <div className="px-3.5 py-2.5 flex flex-col gap-2">{children}</div>
      </>
    )}
  </div>
));

CollapsibleEffectCard.displayName = 'CollapsibleEffectCard';

interface EffectSliderRowProps {
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const EffectSliderRow: React.FC<EffectSliderRowProps> = ({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
}) => {
  const clamped = Math.max(min, Math.min(max, value));
  return (
    <div className="flex items-center gap-2">
      <span className="w-[92px] shrink-0 text-sm text-[#94A3B8] truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="studio-slider flex-1"
      />
      <span className="w-[74px] shrink-0 rounded-md bg-[#131822] border border-[#2C374D] px-1.5 py-1.5 text-center font-mono-tabular text-[11px] text-[#F1F5F9] truncate">
        {valueText}
      </span>
    </div>
  );
};

interface EffectSegmentRowProps {
  label: string;
  optionA: string;
  optionB: string;
  isBSelected: boolean;
  onSelectB: (selectB: boolean) => void;
}

const EffectSegmentRow: React.FC<EffectSegmentRowProps> = ({
  label,
  optionA,
  optionB,
  isBSelected,
  onSelectB,
}) => (
  <div className="flex items-center gap-2 py-0.5">
    <span className="w-[92px] shrink-0 text-sm text-[#94A3B8] truncate">{label}</span>
    <div className="flex-1 h-10 rounded-lg bg-[#131822] border border-[#2C374D] grid grid-cols-2 overflow-hidden">
      <button
        type="button"
        onClick={() => onSelectB(false)}
        className={`h-full rounded-[7px] text-xs cursor-pointer transition-colors ${
          !isBSelected
            ? 'bg-[#123222] border border-[#22C55E] text-[#22C55E] font-bold'
            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
        }`}
      >
        {optionA}
      </button>
      <button
        type="button"
        onClick={() => onSelectB(true)}
        className={`h-full rounded-[7px] text-xs cursor-pointer transition-colors ${
          isBSelected
            ? 'bg-[#123222] border border-[#22C55E] text-[#22C55E] font-bold'
            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
        }`}
      >
        {optionB}
      </button>
    </div>
  </div>
);
