import { AudioMeta, WaveformPeaks } from './audio';

export type StemName = 'vocals' | 'drums' | 'bass' | 'other' | 'guitar' | 'piano';

export interface ChannelStrip {
  volume: number; // 0..1
  mute: boolean;
  solo: boolean;
  pan: number; // -1..1
  gainDb: number;
}

export interface Stem {
  id: string;
  name: StemName;
  label: string;
  fileUrl: string; // object URL or remote URL
  meta: AudioMeta;
  waveform?: WaveformPeaks;
  strip: ChannelStrip;
}

export interface StemSeparationResult {
  vocals?: Stem;
  drums?: Stem;
  bass?: Stem;
  other?: Stem;
  guitar?: Stem;
  piano?: Stem;
  /** True when produced by a mock/heuristic provider instead of a real ML model. */
  isMock: boolean;
  providerName: string;
}

export function defaultChannelStrip(): ChannelStrip {
  return { volume: 1, mute: false, solo: false, pan: 0, gainDb: 0 };
}
