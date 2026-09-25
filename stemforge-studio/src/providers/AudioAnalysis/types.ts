import { AudioAnalysis } from '@/types/audio';

export interface AudioAnalysisProvider {
  readonly name: string;
  analyze(buffer: AudioBuffer): Promise<AudioAnalysis>;
}
