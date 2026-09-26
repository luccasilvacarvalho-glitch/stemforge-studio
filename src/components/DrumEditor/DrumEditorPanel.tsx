import { useMemo, useState } from 'react';
import { useDrumStore } from '@/stores/drumStore';
import { useAudioStore } from '@/stores/audioStore';
import { useProjectStore } from '@/stores/projectStore';
import { DRUM_EVENT_TYPES, DrumEvent, DrumEventType, confidenceLevel } from '@/types/drums';
import { DRUM_COLORS, DRUM_LABELS } from '@/utils/theme';
import Waveform from '@/components/Waveform/Waveform';
import { snapTimeToGrid } from '@/utils/grid';
import clsx from 'clsx';

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'bg-studio-accent',
  medium: 'bg-studio-warn',
  low: 'bg-studio-danger'
};

const QUANTIZE_OPTIONS = [4, 8, 16, 32] as const;

export default function DrumEditorPanel() {
  const {
    events,
    channels,
    selectedType,
    setSelectedType,
    updateChannel,
    toggleSoloType,
    changeType,
    updateEvent,
    removeEvent,
    duplicateEvent,
    moveEvent,
    clearType,
    quantizeType,
    undo,
    redo
  } = useDrumStore();
  const { bpm, positionSec, durationSec } = useAudioStore();
  const { stems, reanalyzeDrums } = useProjectStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [quantizeStep, setQuantizeStep] = useState<(typeof QUANTIZE_OPTIONS)[number]>(16);
  const [detecting, setDetecting] = useState(false);

  const pixelsPerSecond = 60;
  const totalWidth = Math.max(600, durationSec * pixelsPerSecond);

  const eventsByType = useMemo(() => {
    const map = new Map<DrumEventType, DrumEvent[]>();
    for (const type of DRUM_EVENT_TYPES) map.set(type, []);
    for (const evt of events) map.get(evt.type)?.push(evt);
    return map;
  }, [events]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const activeType = selectedType === 'overview' ? null : selectedType;
  const activeChannel = activeType ? channels[activeType] : null;

  async function handleDetect() {
    setDetecting(true);
    try {
      await reanalyzeDrums();
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-studio-border bg-studio-panel">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-studio-border px-3 py-2">
        <span className="mr-2 text-sm font-semibold">🥁 Editor de Bateria</span>
        <TabButton active={selectedType === 'overview'} onClick={() => setSelectedType('overview')}>
          Visão Geral
        </TabButton>
        {DRUM_EVENT_TYPES.map((type) => (
          <TabButton key={type} active={selectedType === type} onClick={() => setSelectedType(type)}>
            {DRUM_LABELS[type]}
          </TabButton>
        ))}
      </div>

      <div className="flex">
        {/* Left inspector panel */}
        {activeType && activeChannel && (
          <div className="w-56 shrink-0 space-y-3 border-r border-studio-border p-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DRUM_COLORS[activeType] }} />
              <span className="text-sm font-semibold">{DRUM_LABELS[activeType]}</span>
            </div>

            <LabeledSlider
              label="Volume"
              value={activeChannel.volume}
              min={0}
              max={1}
              onChange={(v) => updateChannel(activeType, { volume: v })}
              displayValue={`${Math.round((activeChannel.volume - 1) * 60)} dB`}
            />
            <LabeledSlider
              label="Pan"
              value={activeChannel.pan}
              min={-1}
              max={1}
              onChange={(v) => updateChannel(activeType, { pan: v })}
              displayValue={`${Math.round(activeChannel.pan * 100)}%`}
            />

            <div>
              <p className="mb-1 text-xs text-studio-textDim">Sample (em breve)</p>
              <select
                value={activeChannel.sampleName}
                disabled
                title="Troca de sample ainda não implementada — precisa da Biblioteca de Samples (roadmap)"
                onChange={(e) => updateChannel(activeType, { sampleName: e.target.value })}
                className="w-full cursor-not-allowed rounded bg-studio-panel2 px-2 py-1 text-sm opacity-50"
              >
                <option value={`${activeType}_default`}>{DRUM_LABELS[activeType]}_default</option>
                <option value={`${activeType}_alt`}>{DRUM_LABELS[activeType]}_alt</option>
              </select>
            </div>

            <div>
              <p className="mb-1 text-xs text-studio-textDim">Quantização</p>
              <select
                value={quantizeStep}
                onChange={(e) => setQuantizeStep(Number(e.target.value) as any)}
                className="w-full rounded bg-studio-panel2 px-2 py-1 text-sm"
              >
                {QUANTIZE_OPTIONS.map((q) => (
                  <option key={q} value={q}>
                    1/{q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1 text-xs text-studio-textDim">Cor</p>
              <div
                className="h-6 w-full rounded"
                style={{ backgroundColor: DRUM_COLORS[activeType] }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => toggleSoloType(activeType)}
                className="flex-1 rounded bg-studio-panel2 py-1 text-xs hover:bg-studio-border"
              >
                Solo
              </button>
              <button
                onClick={() => updateChannel(activeType, { mute: !activeChannel.mute })}
                className={clsx(
                  'flex-1 rounded py-1 text-xs',
                  activeChannel.mute ? 'bg-studio-danger text-white' : 'bg-studio-panel2 hover:bg-studio-border'
                )}
              >
                Mute
              </button>
            </div>
          </div>
        )}

        {/* Center: mini waveform + full grid */}
        <div className="flex-1 overflow-x-auto">
          {activeType && stems?.drums && (
            <div className="border-b border-studio-border p-2" style={{ width: totalWidth }}>
              <p className="mb-1 text-[10px] uppercase text-studio-textDim">
                Waveform (stem de bateria completo — isolamento por instrumento ainda não disponível)
              </p>
              <Waveform
                peaks={stems.drums.waveform}
                color={DRUM_COLORS[activeType]}
                height={56}
                positionSec={positionSec}
                durationSec={durationSec}
              />
            </div>
          )}

          <div style={{ width: totalWidth }}>
            {DRUM_EVENT_TYPES.map((type) => {
              const rowEvents = eventsByType.get(type) ?? [];
              return (
                <div
                  key={type}
                  className={clsx(
                    'flex border-b border-studio-border last:border-b-0',
                    selectedType === type && 'bg-studio-panel2/60'
                  )}
                >
                  <button
                    onClick={() => setSelectedType(type)}
                    className="sticky left-0 z-10 flex w-24 shrink-0 items-center gap-1.5 border-r border-studio-border bg-studio-panel px-2 py-2 text-left text-[11px] font-semibold"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DRUM_COLORS[type] }} />
                    {DRUM_LABELS[type]}
                  </button>
                  <div className="relative h-8 flex-1">
                    {rowEvents.map((evt) => {
                      const left = evt.startTime * pixelsPerSecond;
                      const width = Math.max(4, (evt.endTime - evt.startTime) * pixelsPerSecond);
                      const level = confidenceLevel(evt.confidence);
                      return (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEventId(evt.id)}
                          draggable
                          onDragEnd={(e) => {
                            const container = e.currentTarget.parentElement;
                            if (!container) return;
                            const rect = container.getBoundingClientRect();
                            const newX = e.clientX - rect.left;
                            const newTime = Math.max(0, newX / pixelsPerSecond);
                            const snapped = snapTimeToGrid(newTime, bpm, quantizeStep, 0);
                            moveEvent(evt.id, snapped);
                          }}
                          title={`${DRUM_LABELS[type]} @ ${evt.startTime.toFixed(3)}s · conf ${(evt.confidence * 100).toFixed(0)}%`}
                          className={clsx(
                            'absolute top-1 h-6 rounded-sm opacity-90 hover:opacity-100',
                            CONFIDENCE_COLOR[level],
                            selectedEventId === evt.id && 'ring-2 ring-white'
                          )}
                          style={{ left, width, opacity: 0.4 + evt.velocity * 0.6 }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Velocity lane */}
            <div className="flex border-t border-studio-border">
              <span className="sticky left-0 z-10 w-24 shrink-0 border-r border-studio-border bg-studio-panel px-2 py-1 text-[10px] text-studio-textDim">
                Velocity
              </span>
              <div className="relative h-10 flex-1">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="absolute bottom-0 w-1 rounded-t"
                    style={{
                      left: evt.startTime * pixelsPerSecond,
                      height: `${evt.velocity * 100}%`,
                      backgroundColor: DRUM_COLORS[evt.type]
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              className="pointer-events-none relative h-0 w-full"
              style={{ marginLeft: 96 }}
            >
              <div
                className="pointer-events-none absolute -top-full h-full w-px bg-studio-accent2"
                style={{ left: positionSec * pixelsPerSecond, height: '400px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event inspector (when an event is selected) */}
      {selectedEvent && (
        <div className="flex flex-wrap items-center gap-3 border-t border-studio-border bg-studio-panel2 p-2 text-xs">
          <span className="font-semibold">Evento selecionado</span>
          <label className="flex items-center gap-1">
            Tipo:
            <select
              value={selectedEvent.type}
              onChange={(e) => changeType(selectedEvent.id, e.target.value as DrumEventType)}
              className="rounded bg-studio-panel px-1.5 py-0.5"
            >
              {DRUM_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DRUM_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Velocity:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedEvent.velocity}
              onChange={(e) => updateEvent(selectedEvent.id, { velocity: parseFloat(e.target.value) })}
            />
          </label>
          <button
            onClick={() => duplicateEvent(selectedEvent.id)}
            className="rounded bg-studio-panel px-2 py-1 hover:bg-studio-border"
          >
            Duplicar
          </button>
          <button
            onClick={() => {
              removeEvent(selectedEvent.id);
              setSelectedEventId(null);
            }}
            className="rounded bg-studio-danger px-2 py-1 text-white hover:opacity-90"
          >
            Remover
          </button>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 border-t border-studio-border px-3 py-2">
        <button onClick={undo} title="Desfazer (Ctrl+Z)" className="rounded bg-studio-panel2 px-2 py-1 text-xs hover:bg-studio-border">
          ↶
        </button>
        <button onClick={redo} title="Refazer (Ctrl+Shift+Z)" className="rounded bg-studio-panel2 px-2 py-1 text-xs hover:bg-studio-border">
          ↷
        </button>

        <select
          value={quantizeStep}
          onChange={(e) => setQuantizeStep(Number(e.target.value) as any)}
          className="rounded bg-studio-panel2 px-2 py-1 text-xs"
        >
          {QUANTIZE_OPTIONS.map((q) => (
            <option key={q} value={q}>
              1/{q}
            </option>
          ))}
        </select>
        <button
          disabled={!activeType}
          onClick={() => activeType && quantizeType(activeType, quantizeStep, bpm)}
          className="rounded bg-studio-panel2 px-3 py-1 text-xs hover:bg-studio-border disabled:opacity-40"
        >
          Quantizar
        </button>
        <button
          disabled={!activeType}
          onClick={() => activeType && clearType(activeType)}
          className="rounded bg-studio-panel2 px-3 py-1 text-xs hover:bg-studio-border disabled:opacity-40"
        >
          Limpar
        </button>
        <button
          onClick={handleDetect}
          disabled={detecting || !stems?.drums}
          className="ml-auto rounded bg-studio-accent px-3 py-1 text-xs font-semibold text-studio-bg hover:opacity-90 disabled:opacity-40"
        >
          {detecting ? 'Detectando…' : 'Detectar eventos'}
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-md px-3 py-1 text-xs font-medium',
        active ? 'bg-studio-accent text-studio-bg' : 'bg-studio-panel2 text-studio-textDim hover:bg-studio-border'
      )}
    >
      {children}
    </button>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  onChange,
  displayValue
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  displayValue: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-studio-textDim">
        <span>{label}</span>
        <span>{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
