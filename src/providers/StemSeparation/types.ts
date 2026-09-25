import { StemSeparationResult } from '@/types/stems';

export interface StemSeparationProvider {
  /** Human-readable name shown in the UI ("Demucs (remote)", "Mock (local)", ...). */
  readonly name: string;
  /** Whether this provider calls a real trained model or is a local fallback. */
  readonly isMock: boolean;

  separate(
    audioFile: File,
    onProgress?: (pct: number) => void
  ): Promise<StemSeparationResult>;
}
