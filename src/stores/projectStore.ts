import { create } from 'zustand';
import { AudioAnalysis } from '@/types/audio';
import { ProcessingProgress, ProcessingStage, GridSubdivision, SnapMode } from '@/types/project';
import { StemSeparationResult } from '@/types/stems';
import { AudioProcessingEngine } from '@/services/audio/AudioProcessingEngine';
import { MockStemSeparationProvider } from '@/providers/StemSeparation/MockStemSeparationProvider';
import { HeuristicDrumProvider } from '@/providers/DrumTranscription/HeuristicDrumProvider';
import { WebAudioAnalysisProvider } from '@/providers/AudioAnalysis/WebAudioAnalysisProvider';
import { useDrumStore } from './drumStore';
import { useAudioStore } from './audioStore';
import { decodeAudioFile } from '@/utils/audio';

interface ProjectState {
  fileName: string | null;
  analysis: AudioAnalysis | null;
  stems: StemSeparationResult | null;
  progress: ProcessingProgress;
  gridSubdivision: GridSubdivision;
  snapMode: SnapMode;

  loadFile: (file: File) => Promise<void>;
  reanalyzeDrums: () => Promise<void>;
  setGridSubdivision: (s: GridSubdivision) => void;
  setSnapMode: (s: SnapMode) => void;
  reset: () => void;
}

// Default wiring: mock/heuristic providers, so the app is fully usable
// without any external API key. Swap these for Remote* providers once
// SEPARATION_API_URL / DRUM_MODEL_API_URL are configured (see .env.example).
const engine = new AudioProcessingEngine({
  stemProvider: new MockStemSeparationProvider(),
  drumProvider: new HeuristicDrumProvider(),
  analysisProvider: new WebAudioAnalysisProvider()
});

const initialProgress: ProcessingProgress = { stage: 'idle', progressPct: 0 };

export const useProjectStore = create<ProjectState>((set, get) => ({
  fileName: null,
  analysis: null,
  stems: null,
  progress: initialProgress,
  gridSubdivision: 16,
  snapMode: 16,

  loadFile: async (file: File) => {
    set({ fileName: file.name, progress: { stage: 'uploading', progressPct: 0 } });
    try {
      const result = await engine.processFile(file, (progress: ProcessingProgress) => {
        set({ progress });
      });

      set({ analysis: result.analysis, stems: result.stems });
      useDrumStore.getState().setEvents(result.drums.events, result.drums.isMock);
      useAudioStore.getState().setDuration(result.analysis.durationSec);
      useAudioStore.getState().setBpm(result.analysis.bpm);
    } catch (err) {
      set({
        progress: {
          stage: 'failed',
          progressPct: 0,
          error: err instanceof Error ? err.message : String(err)
        }
      });
    }
  },

  reanalyzeDrums: async () => {
    const { stems } = get();
    if (!stems?.drums) return;
    const res = await fetch(stems.drums.fileUrl);
    const blob = await res.blob();
    const buffer = await decodeAudioFile(new File([blob], 'drums.wav'));
    const provider = new HeuristicDrumProvider();
    const result = await provider.transcribe(buffer);
    useDrumStore.getState().setEvents(result.events, result.isMock);
  },

  setGridSubdivision: (s) => set({ gridSubdivision: s }),
  setSnapMode: (s) => set({ snapMode: s }),

  reset: () =>
    set({ fileName: null, analysis: null, stems: null, progress: initialProgress })
}));

export function currentStageLabel(stage: ProcessingStage): string {
  const labels: Record<ProcessingStage, string> = {
    idle: 'Aguardando arquivo',
    uploading: 'Enviando',
    analyzing_audio: 'Analisando áudio',
    separating_stems: 'Separando stems',
    analyzing_drums: 'Analisando bateria',
    detecting_bpm: 'Detectando BPM',
    creating_grid: 'Criando grid',
    ready: 'Pronto',
    failed: 'Falhou'
  };
  return labels[stage];
}
