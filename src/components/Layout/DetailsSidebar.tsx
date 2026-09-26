import { useMemo, useState } from 'react';
import { Stem, StemName } from '@/types/stems';
import { useProjectStore } from '@/stores/projectStore';
import { useDrumStore } from '@/stores/drumStore';
import { useAudioStore } from '@/stores/audioStore';
import Waveform from '@/components/Waveform/Waveform';
import EffectsRack from '@/components/Effects/EffectsRack';
import { DRUM_COLORS, DRUM_LABELS, STEM_COLORS, STEM_ICONS } from '@/utils/theme';
import { DRUM_EVENT_TYPES, confidenceLevel } from '@/types/drums';

interface Props {
  selectedStemName: StemName | null;
}

export default function DetailsSidebar({ selectedStemName }: Props) {
  const { stems, analysis } = useProjectStore();
  const { events } = useDrumStore();
  const { positionSec, durationSec } = useAudioStore();
  const [tab, setTab] = useState<'preview' | 'library'>('preview');

  const selectedStem: Stem | null =
    stems && selectedStemName ? ((stems as any)[selectedStemName] as Stem) ?? null : null;

  const categoryStats = useMemo(() => {
    const counts = new Map<string, { count: number; confSum: number }>();
    for (const evt of events) {
      const c = counts.get(evt.type) ?? { count: 0, confSum: 0 };
      c.count += 1;
      c.confSum += evt.confidence;
      counts.set(evt.type, c);
    }
    return DRUM_EVENT_TYPES.filter((t) => counts.has(t)).map((type) => {
      const c = counts.get(type)!;
      return { type, count: c.count, avgConfidence: c.confSum / c.count };
    });
  }, [events]);

  const overallConfidence =
    events.length > 0 ? events.reduce((s, e) => s + e.confidence, 0) / events.length : 0;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-studio-border bg-studio-panel p-3">
      {selectedStem && (
        <section className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-studio-textDim">Detalhes do Stem</h3>
            <span className="cursor-pointer text-studio-textDim">⋮</span>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
              style={{
                backgroundColor: `${STEM_COLORS[selectedStem.name]}33`,
                color: STEM_COLORS[selectedStem.name]
              }}
            >
              {STEM_ICONS[selectedStem.name]}
            </span>
            <div>
              <p className="text-sm font-bold capitalize">{selectedStem.name}</p>
              <p className="text-[11px] text-studio-textDim">Stems · Projeto</p>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <Stat label="Duração" value={`${selectedStem.meta.durationSec.toFixed(2)}s`} />
            <Stat label="BPM" value={analysis ? analysis.bpm.toFixed(0) : '—'} />
            <Stat label="Canais" value={selectedStem.meta.channels === 2 ? 'Estéreo' : 'Mono'} />
          </div>
          <p className="mb-2 text-[11px] text-studio-textDim">
            Formato: {selectedStem.meta.format} · {selectedStem.meta.sampleRate / 1000}kHz
          </p>

          <Waveform
            peaks={selectedStem.waveform}
            color={STEM_COLORS[selectedStem.name]}
            height={48}
            positionSec={positionSec}
            durationSec={durationSec}
          />

          <div className="mt-2 flex items-center gap-2">
            <span>🔈</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedStem.strip.volume}
              className="flex-1"
              readOnly
            />
            <span title="Preview com fone">🎧</span>
          </div>
        </section>
      )}

      {selectedStem && (
        <EffectsRack channelId={selectedStem.name} channelLabel={selectedStem.name} />
      )}

      {events.length > 0 && (
        <section className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
          <h3 className="mb-2 text-xs font-bold uppercase text-studio-textDim">Análise da Bateria</h3>
          <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
            <Stat label="BPM detectado" value={analysis ? analysis.bpm.toFixed(2) : '—'} />
            <Stat
              label="Compasso"
              value={analysis ? `${analysis.timeSignature.numerator}/${analysis.timeSignature.denominator}` : '—'}
            />
          </div>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[11px] text-studio-textDim">
              <span>Precisão da detecção</span>
              <span>{Math.round(overallConfidence * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-studio-panel">
              <div
                className="h-full bg-studio-accent"
                style={{ width: `${overallConfidence * 100}%` }}
              />
            </div>
          </div>

          <h4 className="mb-1 text-[11px] font-bold uppercase text-studio-textDim">
            Categorias encontradas
          </h4>
          <ul className="space-y-1">
            {categoryStats.map(({ type, count, avgConfidence }) => (
              <li key={type} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: DRUM_COLORS[type] }}
                />
                <span className="flex-1">{DRUM_LABELS[type]}</span>
                <span className="text-studio-textDim">{count} eventos</span>
                <span
                  className={
                    confidenceLevel(avgConfidence) === 'high'
                      ? 'text-studio-accent'
                      : confidenceLevel(avgConfidence) === 'medium'
                      ? 'text-studio-warn'
                      : 'text-studio-danger'
                  }
                >
                  {Math.round(avgConfidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
        <div className="mb-2 flex gap-3 text-xs font-bold uppercase">
          <button
            onClick={() => setTab('preview')}
            className={tab === 'preview' ? 'text-studio-accent' : 'text-studio-textDim'}
          >
            Preview
          </button>
          <button
            onClick={() => setTab('library')}
            className={tab === 'library' ? 'text-studio-accent' : 'text-studio-textDim'}
          >
            Biblioteca
          </button>
        </div>
        {tab === 'preview' ? (
          <p className="text-[11px] text-studio-textDim">
            Selecione um evento no Editor de Bateria pra ouvir o sample extraído aqui.
          </p>
        ) : (
          <p className="text-[11px] text-studio-textDim">
            Biblioteca de samples ainda não implementada — próximo passo do roadmap.
          </p>
        )}
      </section>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-studio-panel px-2 py-1">
      <p className="text-studio-textDim">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
