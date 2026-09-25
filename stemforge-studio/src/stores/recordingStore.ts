import { create } from 'zustand';
import { RecordedTrack, RecordingStatus } from '@/types/recording';
import { AudioRecorderService } from '@/services/audio/AudioRecorderService';
import { useAudioStore } from './audioStore';

interface RecordingState {
  tracks: RecordedTrack[];
  status: RecordingStatus;
  monitoring: boolean;
  error: string | null;

  toggleRecording: () => Promise<void>;
  toggleMonitoring: () => void;
  removeTrack: (id: string) => void;
  updateTrackStrip: (id: string, patch: Partial<RecordedTrack['strip']>) => void;
}

// Kept outside the store: MediaStream/MediaRecorder instances aren't
// serializable state and don't need to trigger re-renders themselves.
const recorder = new AudioRecorderService();

export const useRecordingStore = create<RecordingState>((set, get) => ({
  tracks: [],
  status: 'idle',
  monitoring: false,
  error: null,

  toggleRecording: async () => {
    const { status } = get();

    if (status === 'recording') {
      set({ status: 'processing' });
      try {
        const startOffsetSec = useAudioStore.getState().positionSec;
        const track = await recorder.stop(startOffsetSec);
        set((s) => ({ tracks: [...s.tracks, track], status: 'idle' }));
      } catch (err) {
        set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    try {
      set({ status: 'requesting_permission', error: null });
      await recorder.requestPermission();
      if (get().monitoring) recorder.enableMonitoring(true);
      recorder.start();
      set({ status: 'recording' });
    } catch (err) {
      set({
        status: 'error',
        error:
          err instanceof Error
            ? `Não foi possível acessar o microfone: ${err.message}`
            : 'Não foi possível acessar o microfone.'
      });
    }
  },

  toggleMonitoring: () => {
    const next = !get().monitoring;
    recorder.enableMonitoring(next);
    set({ monitoring: next });
  },

  removeTrack: (id) => set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),

  updateTrackStrip: (id, patch) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, strip: { ...t.strip, ...patch } } : t))
    }))
}));
