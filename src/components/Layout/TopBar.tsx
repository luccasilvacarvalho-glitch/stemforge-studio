import { useEffect } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useRecordingStore } from '@/stores/recordingStore';
import { useProjectStore } from '@/stores/projectStore';
import { formatTime } from '@/utils/audio';

export default function TopBar() {
  const {
    isPlaying,
    positionSec,
    durationSec,
    bpm,
    zoom,
    setPlaying,
    setBpm,
    setZoom
  } = useAudioStore();
  const { status: recStatus, toggleRecording } = useRecordingStore();
  const { fileName, analysis } = useProjectStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!useAudioStore.getState().isPlaying);
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleRecording();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPlaying, toggleRecording]);

  return (
    <header className="flex items-center gap-4 border-b border-studio-border bg-studio-panel px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-studio-accent to-studio-accent2 text-sm font-bold text-studio-bg">
          SF
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">StemForge Studio</p>
          <p className="text-[10px] text-studio-textDim">Separate · Rebuild · Create</p>
        </div>
      </div>

      <div className="mx-2 h-8 w-px bg-studio-border" />

      <div className="flex items-center gap-2 text-xs">
        <span>🔒</span>
        <div className="leading-tight">
          <p className="text-studio-textDim">Projeto Atual</p>
          <p className="font-medium">{fileName ? fileName.replace(/\.[^.]+$/, '') : 'Sem projeto'}</p>
        </div>
      </div>

      <div className="mx-2 h-8 w-px bg-studio-border" />

      <div className="flex items-center gap-1">
        <TransportIcon onClick={() => setPlaying(!isPlaying)} title="Play/Pause (Space)">
          {isPlaying ? '⏸' : '▶'}
        </TransportIcon>
        <TransportIcon onClick={() => setPlaying(false)} title="Stop">
          ⏹
        </TransportIcon>
        <TransportIcon onClick={toggleRecording} title="Record (R)" active={recStatus === 'recording'} danger>
          ⏺
        </TransportIcon>
      </div>

      <span className="font-mono text-sm text-studio-textDim">
        {formatTime(positionSec)} / {formatTime(durationSec)}
      </span>

      <div className="flex flex-1 items-center gap-2 px-4">
        <input
          type="range"
          min={10}
          max={400}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
          title="Zoom"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-md bg-studio-panel2 px-3 py-1 text-center">
          <p className="text-[9px] uppercase text-studio-textDim">BPM</p>
          <input
            type="number"
            value={Math.round(bpm)}
            onChange={(e) => setBpm(Number(e.target.value) || bpm)}
            className="w-14 bg-transparent text-center text-sm font-semibold"
          />
        </div>
        <div className="rounded-md bg-studio-panel2 px-3 py-1 text-center">
          <p className="text-[9px] uppercase text-studio-textDim">Compasso</p>
          <p className="text-sm font-semibold">
            {analysis ? `${analysis.timeSignature.numerator}/${analysis.timeSignature.denominator}` : '4/4'}
          </p>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-2 text-lg">
        <span title="Configurações" className="cursor-pointer opacity-70 hover:opacity-100">
          ⚙️
        </span>
        <span title="Tema" className="cursor-pointer opacity-70 hover:opacity-100">
          🌓
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-studio-accent text-xs font-bold text-studio-bg">
          LS
        </div>
      </div>
    </header>
  );
}

function TransportIcon({
  children,
  onClick,
  title,
  active,
  danger
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${
        active
          ? danger
            ? 'bg-studio-danger text-white'
            : 'bg-studio-accent text-studio-bg'
          : 'bg-studio-panel2 hover:bg-studio-border'
      }`}
    >
      {children}
    </button>
  );
}
