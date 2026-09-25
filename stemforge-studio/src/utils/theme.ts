import { DrumEventType } from '@/types/drums';
import { StemName } from '@/types/stems';

export const STEM_COLORS: Record<StemName, string> = {
  vocals: '#a78bfa',
  drums: '#fb923c',
  bass: '#60a5fa',
  other: '#4ade80',
  guitar: '#fbbf24',
  piano: '#f472b6'
};

export const STEM_ICONS: Record<StemName, string> = {
  vocals: '🎤',
  drums: '🥁',
  bass: '🎸',
  other: '🎹',
  guitar: '🎸',
  piano: '🎹'
};

export const DRUM_COLORS: Record<DrumEventType, string> = {
  kick: '#f87171',
  snare: '#fb923c',
  clap: '#c084fc',
  hihat: '#4ade80',
  open_hat: '#38bdf8',
  tom: '#38bdf8',
  crash: '#f87171',
  ride: '#facc15',
  percussion: '#60a5fa',
  other: '#8a8a92'
};

export const DRUM_LABELS: Record<DrumEventType, string> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  hihat: 'Hi-Hat',
  open_hat: 'Open Hat',
  tom: 'Tom',
  crash: 'Crash',
  ride: 'Ride',
  percussion: 'Percussion',
  other: 'Other'
};

export function dbFromVolume(volume: number): number {
  if (volume <= 0) return -60;
  return Math.round(20 * Math.log10(volume) * 10) / 10;
}

export function volumeFromDb(db: number): number {
  return Math.pow(10, db / 20);
}
