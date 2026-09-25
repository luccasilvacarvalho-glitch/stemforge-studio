import { create } from 'zustand';
import { TransportState } from '@/types/audio';

interface AudioState extends TransportState {
  masterVolume: number;
  setPlaying: (playing: boolean) => void;
  setPosition: (sec: number) => void;
  setDuration: (sec: number) => void;
  setBpm: (bpm: number) => void;
  setZoom: (zoom: number) => void;
  setMasterVolume: (v: number) => void;
  toggleMetronome: () => void;
  setLoop: (enabled: boolean, startSec?: number, endSec?: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  bpm: 120,
  loop: { enabled: false, startSec: 0, endSec: 0 },
  metronomeEnabled: false,
  zoom: 80,
  masterVolume: 1,

  setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(1, v)) }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (positionSec) => set({ positionSec }),
  setDuration: (durationSec) => set({ durationSec }),
  setBpm: (bpm) => set({ bpm }),
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(400, zoom)) }),
  toggleMetronome: () => set((s) => ({ metronomeEnabled: !s.metronomeEnabled })),
  setLoop: (enabled, startSec, endSec) =>
    set((s) => ({
      loop: {
        enabled,
        startSec: startSec ?? s.loop.startSec,
        endSec: endSec ?? s.loop.endSec
      }
    }))
}));
