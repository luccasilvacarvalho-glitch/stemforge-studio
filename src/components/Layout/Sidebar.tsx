import { useProjectStore } from '@/stores/projectStore';
import { Stem, StemName } from '@/types/stems';
import { STEM_COLORS, STEM_ICONS, dbFromVolume, volumeFromDb } from '@/utils/theme';

export type StudioView = 'overview' | 'stems' | 'drum-editor' | 'samples' | 'export' | 'settings';

const NAV_ITEMS: { id: StudioView; label: string; icon: string }[] = [
  { id: 'overview', label: 'Visão Geral', icon: '🏠' },
  { id: 'stems', label: 'Stems', icon: '🎛️' },
  { id: 'drum-editor', label: 'Editor de Bateria', icon: '🥁' },
  { id: 'samples', label: 'Samples', icon: '🎧' },
  { id: 'export', label: 'Exportar', icon: '⬆️' },
  { id: 'settings', label: 'Configurações', icon: '⚙️' }
];

interface Props {
  activeView: StudioView;
  onChangeView: (v: StudioView) => void;
}

export default function Sidebar({ activeView, onChangeView }: Props) {
  const { stems, analysis, progress, fileName } = useProjectStore();

  const stemList: Stem[] = stems
    ? (Object.values(stems).filter((s) => s && typeof s === 'object' && 'fileUrl' in s) as Stem[])
    : [];

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-studio-border bg-studio-panel">
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
              activeView === item.id
                ? 'bg-studio-panel2 text-studio-accent'
                : 'text-studio-textDim hover:bg-studio-panel2 hover:text-studio-text'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {stemList.length > 0 && (
        <div className="border-t border-studio-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-studio-textDim">Stems</h3>
          </div>
          <div className="flex flex-col gap-2">
            {stemList.map((stem) => (
              <StemFader key={stem.id} stem={stem} />
            ))}
          </div>
        </div>
      )}

      {analysis && fileName && (
        <div className="border-t border-studio-border p-3">
          <h3 className="mb-2 text-xs font-bold uppercase text-studio-textDim">Projeto</h3>
          <dl className="space-y-1 text-xs">
            <Row label="Duração" value={`${analysis.durationSec.toFixed(2)}s`} />
            <Row label="BPM Detectado" value={analysis.bpm.toFixed(2)} />
            <Row label="Compasso" value={`${analysis.timeSignature.numerator}/${analysis.timeSignature.denominator}`} />
          </dl>
          {progress.stage === 'ready' && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-studio-accent/10 px-2 py-1.5 text-xs text-studio-accent">
              <span>✓</span> Stems e análise de bateria prontos.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function StemFader({ stem }: { stem: Stem }) {
  const db = dbFromVolume(stem.strip.volume);

  function setDb(newDb: number) {
    const current = useProjectStore.getState().stems;
    if (!current) return;
    const s = (current as any)[stem.name] as Stem | undefined;
    if (!s) return;
    const updated = {
      ...current,
      [stem.name]: { ...s, strip: { ...s.strip, volume: volumeFromDb(newDb) } }
    };
    useProjectStore.setState({ stems: updated as any });
  }

  return (
    <div className="rounded-md bg-studio-panel2 p-2">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-xs"
          style={{ backgroundColor: `${STEM_COLORS[stem.name]}33`, color: STEM_COLORS[stem.name] }}
        >
          {STEM_ICONS[stem.name]}
        </span>
        <span className="text-xs font-medium capitalize">{stem.name}</span>
        <span className="ml-auto text-[10px] text-studio-textDim">{db.toFixed(1)} dB</span>
      </div>
      <input
        type="range"
        min={-60}
        max={6}
        step={0.1}
        value={db}
        onChange={(e) => setDb(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-studio-textDim">
      <dt>{label}</dt>
      <dd className="font-medium text-studio-text">{value}</dd>
    </div>
  );
}
