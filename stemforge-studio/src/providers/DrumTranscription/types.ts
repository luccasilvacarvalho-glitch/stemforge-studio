import { DrumTranscriptionResult } from '@/types/drums';

export interface DrumTranscriptionProvider {
  readonly name: string;
  readonly isMock: boolean;

  transcribe(
    drumsAudioBuffer: AudioBuffer,
    onProgress?: (pct: number) => void
  ): Promise<DrumTranscriptionResult>;
}
