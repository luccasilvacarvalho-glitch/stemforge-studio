import { Stem } from '@/types/stems';
import { RecordedTrack } from '@/types/recording';
import { useAudioStore } from '@/stores/audioStore';
import { useDrumStore } from '@/stores/drumStore';
import { DRUM_EVENT_TYPES } from '@/types/drums';
import { DRUM_COLORS, DRUM_LABELS, STEM_COLORS, dbFromVolume } from '@/utils/theme';

interface Props {
  stems: Stem[];
  recordings: RecordedTrack[];
  onChangeStemStrip: (id: string, patch: Partial<Stem['strip']>) => void;
}

export default function MixerBar({ stems, recordings, onChangeStemStrip }: Props) {
  const { masterVolume, setMasterVolume } = useAudioStore();
  const { channels, updateChannel } = useDrumStore();
  const drumTypesWithEvents = useDrumStore((s) =>
    DRUM_EVENT_TYPES.filter((t) => s.events.some((e) => e.type === t))
  );

  return (
    <div className="flex gap-3 overflow-x-auto rounded-lg border border-studio-border bg-studio-panel p-3">
      <ChannelStripUI
        label="Master"
        color="#5eead4"
        volume={masterVolume}
        pan={0}
        mute={false}
        solo={false}
        onVolumeChange={setMasterVolume}
        isMaster
      />

      <div className="w-px shrink-0 self-stretch bg-studio-border" />

      {stems.map((s) => (
        <ChannelStripUI
          key={s.id}
          label={s.name}
          color={STEM_COLORS[s.name]}
          volume={s.strip.volume}
          pan={s.strip.pan}
          mute={s.strip.mute}
          solo={s.strip.solo}
          onVolumeChange={(v) => onChangeStemStrip(s.name, { volume: v })}
          onPanChange={(p) => onChangeStemStrip(s.name, { pan: p })}
          onToggleMute={() => onChangeStemStrip(s.name, { mute: !s.strip.mute })}
          onToggleSolo={() => onChangeStemStrip(s.name, { solo: !s.strip.solo })}
        />
      ))}

      {recordings.map((r) => (
        <ChannelStripUI
          key={r.id}
          label={r.label.slice(0, 10)}
          color="#fbbf24"
          volume={r.strip.volume}
          pan={r.strip.pan}
          mute={r.strip.mute}
          solo={r.strip.solo}
          onVolumeChange={(v) => onChangeStemStrip(r.id, { volume: v })}
          onPanChange={(p) => onChangeStemStrip(r.id, { pan: p })}
          onToggleMute={() => onChangeStemStrip(r.id, { mute: !r.strip.mute })}
          onToggleSolo={() => onChangeStemStrip(r.id, { solo: !r.strip.solo })}
        />
      ))}

      {drumTypesWithEvents.length > 0 && (
        <>
          <div className="flex flex-col justify-center border-l border-studio-border pl-3">
            <span className="text-[10px] uppercase text-studio-textDim [writing-mode:vertical-lr]">
              Drum Channels
            </span>
          </div>
          {drumTypesWithEvents.map((type) => (
            <ChannelStripUI
              key={type}
              label={DRUM_LABELS[type]}
              color={DRUM_COLORS[type]}
              volume={channels[type].volume}
              pan={channels[type].pan}
              mute={channels[type].mute}
              solo={channels[type].solo}
              onVolumeChange={(v) => updateChannel(type, { volume: v })}
              onPanChange={(p) => updateChannel(type, { pan: p })}
              onToggleMute={() => updateChannel(type, { mute: !channels[type].mute })}
              onToggleSolo={() => updateChannel(type, { solo: !channels[type].solo })}
            />
          ))}
        </>
      )}
    </div>
  );
}

function ChannelStripUI({
  label,
  color,
  volume,
  pan,
  mute,
  solo,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  isMaster
}: {
  label: string;
  color: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  onVolumeChange: (v: number) => void;
  onPanChange?: (p: number) => void;
  onToggleMute?: () => void;
  onToggleSolo?: () => void;
  isMaster?: boolean;
}) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-lg border border-studio-border bg-studio-panel2 p-2">
      <span
        className="w-full truncate text-center text-[10px] font-bold uppercase"
        style={{ color }}
        title={label}
      >
        {label}
      </span>

      {onPanChange && (
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={pan}
          onChange={(e) => onPanChange(parseFloat(e.target.value))}
          className="w-full"
          title="Pan"
        />
      )}

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        {...{ orient: 'vertical' }}
        className="h-20 [writing-mode:vertical-lr] [direction:rtl]"
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
      />

      {!isMaster && (
        <div className="flex gap-1">
          <button
            onClick={onToggleMute}
            className={`h-4 w-4 rounded text-[9px] font-bold ${
              mute ? 'bg-studio-danger text-white' : 'bg-studio-panel text-studio-textDim'
            }`}
          >
            M
          </button>
          <button
            onClick={onToggleSolo}
            className={`h-4 w-4 rounded text-[9px] font-bold ${
              solo ? 'bg-studio-accent text-studio-bg' : 'bg-studio-panel text-studio-textDim'
            }`}
          >
            S
          </button>
        </div>
      )}

      <span className="text-[9px] text-studio-textDim">{dbFromVolume(volume).toFixed(1)}</span>
    </div>
  );
}
