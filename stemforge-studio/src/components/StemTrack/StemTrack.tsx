import { Stem } from '@/types/stems';
import Waveform from '../Waveform/Waveform';
import { useAudioStore } from '@/stores/audioStore';

interface Props {
  stem: Stem;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

const STEM_COLORS: Record<string, string> = {
  vocals: '#f472b6',
  drums: '#fbbf24',
  bass: '#60a5fa',
  other: '#a78bfa',
  guitar: '#4ade80',
  piano: '#22d3ee'
};

export default function StemTrack({ stem, onToggleMute, onToggleSolo, onSelect, isSelected }: Props) {
  const { positionSec, durationSec } = useAudioStore();

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-2 ${
        isSelected ? 'border-studio-accent bg-studio-panel2' : 'border-studio-border bg-studio-panel'
      }`}
      onClick={onSelect}
    >
      <div className="w-24 shrink-0">
        <p className="text-sm font-semibold uppercase tracking-wide">{stem.name}</p>
        <p className="truncate text-xs text-studio-textDim">{stem.label}</p>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className={`h-6 w-6 rounded text-xs font-bold ${
            stem.strip.mute ? 'bg-studio-danger text-white' : 'bg-studio-panel2 text-studio-textDim'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSolo();
          }}
          className={`h-6 w-6 rounded text-xs font-bold ${
            stem.strip.solo ? 'bg-studio-accent text-studio-bg' : 'bg-studio-panel2 text-studio-textDim'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>

      <div className="flex-1">
        <Waveform
          peaks={stem.waveform}
          color={STEM_COLORS[stem.name] ?? '#5eead4'}
          positionSec={positionSec}
          durationSec={durationSec}
        />
      </div>
    </div>
  );
}
