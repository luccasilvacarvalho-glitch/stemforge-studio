import { StemSeparationProvider } from '@/providers/StemSeparation/types';
import { DrumTranscriptionProvider } from '@/providers/DrumTranscription/types';
import { AudioAnalysisProvider } from '@/providers/AudioAnalysis/types';
import { decodeAudioFile } from '@/utils/audio';
import { AudioAnalysis } from '@/types/audio';
import { StemSeparationResult } from '@/types/stems';
import { DrumTranscriptionResult } from '@/types/drums';
import { ProcessingProgress } from '@/types/project';

export interface AudioProcessingEngineDeps {
  stemProvider: StemSeparationProvider;
  drumProvider: DrumTranscriptionProvider;
  analysisProvider: AudioAnalysisProvider;
}

export interface FullProcessingResult {
  analysis: AudioAnalysis;
  stems: StemSeparationResult;
  drums: DrumTranscriptionResult;
}

/**
 * Central orchestration layer. Deliberately has NO knowledge of React,
 * Zustand, or the DOM beyond the Web Audio APIs it needs - it can be
 * unit-tested and swapped between mock and real providers without
 * touching any component (spec section 2/21).
 */
export class AudioProcessingEngine {
  constructor(private readonly deps: AudioProcessingEngineDeps) {}

  async processFile(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<FullProcessingResult> {
    onProgress?.({ stage: 'uploading', progressPct: 100 });

    onProgress?.({ stage: 'analyzing_audio', progressPct: 0 });
    const sourceBuffer = await decodeAudioFile(file);
    const analysis = await this.deps.analysisProvider.analyze(sourceBuffer);
    onProgress?.({ stage: 'detecting_bpm', progressPct: 100, message: `${analysis.bpm} BPM` });

    onProgress?.({ stage: 'separating_stems', progressPct: 0 });
    const stems = await this.deps.stemProvider.separate(file, (pct) =>
      onProgress?.({ stage: 'separating_stems', progressPct: pct })
    );

    onProgress?.({ stage: 'analyzing_drums', progressPct: 0 });
    let drumsBuffer = sourceBuffer;
    if (stems.drums) {
      // In the real pipeline, stems.drums.fileUrl points at an isolated
      // drum stem; re-decode it so drum analysis runs on drums only.
      const res = await fetch(stems.drums.fileUrl);
      const blob = await res.blob();
      drumsBuffer = await decodeAudioFile(new File([blob], 'drums.wav'));
    }
    const drums = await this.deps.drumProvider.transcribe(drumsBuffer, (pct) =>
      onProgress?.({ stage: 'analyzing_drums', progressPct: pct })
    );

    onProgress?.({ stage: 'creating_grid', progressPct: 100 });
    onProgress?.({ stage: 'ready', progressPct: 100 });

    return { analysis, stems, drums };
  }
}
