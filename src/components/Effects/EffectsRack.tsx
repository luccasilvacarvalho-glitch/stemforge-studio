import { useEffectsStore } from '@/stores/effectsStore';
import {
  CompressorSettings,
  DelaySettings,
  EffectInstance,
  EffectType,
  EFFECT_LABELS,
  EQSettings,
  ReverbSettings
} from '@/types/effects';

interface Props {
  channelId: string;
  channelLabel: string;
}

const EFFECT_TYPES: EffectType[] = ['eq', 'compressor', 'delay', 'reverb'];

export default function EffectsRack({ channelId, channelLabel }: Props) {
  const chain = useEffectsStore((s) => s.chains[channelId] ?? []);
  const { addEffect, removeEffect, toggleEffect, updateSettings, moveEffect } = useEffectsStore();

  return (
    <section className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-studio-textDim">
          Efeitos · {channelLabel}
        </h3>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {EFFECT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => addEffect(channelId, type)}
            className="rounded bg-studio-panel px-2 py-1 text-[11px] hover:bg-studio-border"
          >
            + {EFFECT_LABELS[type]}
          </button>
        ))}
      </div>

      {chain.length === 0 ? (
        <p className="text-[11px] text-studio-textDim">
          Nenhum efeito ainda. Adiciona um EQ, compressor, delay ou reverb acima — roda direto
          no navegador via Web Audio, sem plugin nenhum.
        </p>
      ) : (
        <div className="space-y-2">
          {chain.map((effect, i) => (
            <EffectCard
              key={effect.id}
              effect={effect}
              canMoveUp={i > 0}
              canMoveDown={i < chain.length - 1}
              onToggle={() => toggleEffect(channelId, effect.id)}
              onRemove={() => removeEffect(channelId, effect.id)}
              onMoveUp={() => moveEffect(channelId, effect.id, 'up')}
              onMoveDown={() => moveEffect(channelId, effect.id, 'down')}
              onChange={(settings) => updateSettings(channelId, effect.id, settings)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EffectCard({
  effect,
  canMoveUp,
  canMoveDown,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  onChange
}: {
  effect: EffectInstance;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (settings: EffectInstance['settings']) => void;
}) {
  return (
    <div className="rounded-md border border-studio-border bg-studio-panel p-2">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`h-4 w-4 shrink-0 rounded-full border ${
            effect.enabled ? 'border-studio-accent bg-studio-accent' : 'border-studio-textDim'
          }`}
          title={effect.enabled ? 'Desativar (bypass)' : 'Ativar'}
        />
        <span className="flex-1 text-xs font-semibold">{EFFECT_LABELS[effect.type]}</span>
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-xs text-studio-textDim disabled:opacity-30"
          title="Mover pra cima"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-xs text-studio-textDim disabled:opacity-30"
          title="Mover pra baixo"
        >
          ↓
        </button>
        <button
          onClick={onRemove}
          className="text-xs text-studio-danger"
          title="Remover"
        >
          ✕
        </button>
      </div>

      <div className={effect.enabled ? '' : 'pointer-events-none opacity-40'}>
        {effect.type === 'eq' && (
          <EQControls settings={effect.settings as EQSettings} onChange={onChange} />
        )}
        {effect.type === 'compressor' && (
          <CompressorControls settings={effect.settings as CompressorSettings} onChange={onChange} />
        )}
        {effect.type === 'delay' && (
          <DelayControls settings={effect.settings as DelaySettings} onChange={onChange} />
        )}
        {effect.type === 'reverb' && (
          <ReverbControls settings={effect.settings as ReverbSettings} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-studio-textDim">
        <span>{label}</span>
        <span>
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function EQControls({
  settings,
  onChange
}: {
  settings: EQSettings;
  onChange: (s: EQSettings) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-studio-textDim">Low</p>
        <Slider
          label="Freq"
          value={settings.lowFreq}
          min={40}
          max={500}
          step={1}
          unit="Hz"
          onChange={(v) => onChange({ ...settings, lowFreq: v })}
        />
        <Slider
          label="Ganho"
          value={settings.lowGainDb}
          min={-24}
          max={24}
          step={0.5}
          unit="dB"
          onChange={(v) => onChange({ ...settings, lowGainDb: v })}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-studio-textDim">Mid</p>
        <Slider
          label="Freq"
          value={settings.midFreq}
          min={200}
          max={5000}
          step={10}
          unit="Hz"
          onChange={(v) => onChange({ ...settings, midFreq: v })}
        />
        <Slider
          label="Ganho"
          value={settings.midGainDb}
          min={-24}
          max={24}
          step={0.5}
          unit="dB"
          onChange={(v) => onChange({ ...settings, midGainDb: v })}
        />
        <Slider
          label="Q"
          value={settings.midQ}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ ...settings, midQ: v })}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-studio-textDim">High</p>
        <Slider
          label="Freq"
          value={settings.highFreq}
          min={1000}
          max={16000}
          step={100}
          unit="Hz"
          onChange={(v) => onChange({ ...settings, highFreq: v })}
        />
        <Slider
          label="Ganho"
          value={settings.highGainDb}
          min={-24}
          max={24}
          step={0.5}
          unit="dB"
          onChange={(v) => onChange({ ...settings, highGainDb: v })}
        />
      </div>
    </div>
  );
}

function CompressorControls({
  settings,
  onChange
}: {
  settings: CompressorSettings;
  onChange: (s: CompressorSettings) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Slider
        label="Threshold"
        value={settings.thresholdDb}
        min={-60}
        max={0}
        step={1}
        unit="dB"
        onChange={(v) => onChange({ ...settings, thresholdDb: v })}
      />
      <Slider
        label="Ratio"
        value={settings.ratio}
        min={1}
        max={20}
        step={0.5}
        unit=":1"
        onChange={(v) => onChange({ ...settings, ratio: v })}
      />
      <Slider
        label="Attack"
        value={settings.attackSec}
        min={0}
        max={1}
        step={0.005}
        unit="s"
        onChange={(v) => onChange({ ...settings, attackSec: v })}
      />
      <Slider
        label="Release"
        value={settings.releaseSec}
        min={0}
        max={1}
        step={0.01}
        unit="s"
        onChange={(v) => onChange({ ...settings, releaseSec: v })}
      />
      <Slider
        label="Knee"
        value={settings.kneeDb}
        min={0}
        max={40}
        step={1}
        unit="dB"
        onChange={(v) => onChange({ ...settings, kneeDb: v })}
      />
    </div>
  );
}

function DelayControls({
  settings,
  onChange
}: {
  settings: DelaySettings;
  onChange: (s: DelaySettings) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Slider
        label="Mix"
        value={settings.mix}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, mix: v })}
      />
      <Slider
        label="Tempo"
        value={settings.timeSec}
        min={0.01}
        max={2}
        step={0.01}
        unit="s"
        onChange={(v) => onChange({ ...settings, timeSec: v })}
      />
      <Slider
        label="Feedback"
        value={settings.feedback}
        min={0}
        max={0.95}
        step={0.01}
        onChange={(v) => onChange({ ...settings, feedback: v })}
      />
    </div>
  );
}

function ReverbControls({
  settings,
  onChange
}: {
  settings: ReverbSettings;
  onChange: (s: ReverbSettings) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Slider
        label="Mix"
        value={settings.mix}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, mix: v })}
      />
      <Slider
        label="Decay"
        value={settings.decaySec}
        min={0.2}
        max={6}
        step={0.1}
        unit="s"
        onChange={(v) => onChange({ ...settings, decaySec: v })}
      />
    </div>
  );
}
