import { RecordedTrack } from '@/types/recording';
import Waveform from '../Waveform/Waveform';
import { useAudioStore } from '@/stores/audioStore';
import { useRecordingStore } from '@/stores/recordingStore';

interface Props {
  track: RecordedTrack;
}

export default function RecordedTrackRow({ track }: Props) {
  const { positionSec, durationSec } = useAudioStore();
  const { updateTrackStrip, removeTrack } = useRecordingStore();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-studio-border bg-studio-panel p-2">
      <div className="w-32 shrink-0">
        <p className="truncate text-sm font-semibold">{track.label}</p>
        <p className="text-xs text-studio-textDim">
          início: {track.startOffsetSec.toFixed(2)}s
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => updateTrackStrip(track.id, { mute: !track.strip.mute })}
          className={`h-6 w-6 rounded text-xs font-bold ${
            track.strip.mute ? 'bg-studio-danger text-white' : 'bg-studio-panel2 text-studio-textDim'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={() => updateTrackStrip(track.id, { solo: !track.strip.solo })}
          className={`h-6 w-6 rounded text-xs font-bold ${
            track.strip.solo ? 'bg-studio-accent text-studio-bg' : 'bg-studio-panel2 text-studio-textDim'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>

      <div className="flex-1">
        <Waveform peaks={track.waveform} color="#fbbf24" positionSec={positionSec} durationSec={durationSec} />
      </div>

      <button
        onClick={() => removeTrack(track.id)}
        className="shrink-0 rounded bg-studio-panel2 px-2 py-1 text-xs text-studio-textDim hover:bg-studio-danger hover:text-white"
        title="Remover gravação"
      >
        ✕
      </button>
    </div>
  );
}
