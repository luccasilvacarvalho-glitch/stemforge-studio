export type DrumEventType =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'hihat'
  | 'open_hat'
  | 'tom'
  | 'crash'
  | 'ride'
  | 'percussion'
  | 'other';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DrumEvent {
  id: string;
  type: DrumEventType;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number; // 0..1 (raw score from the provider/heuristic)
  velocity: number; // 0..1
  /** true if a human edited this event after AI detection */
  manuallyEdited: boolean;
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

export const DRUM_EVENT_TYPES: DrumEventType[] = [
  'kick',
  'snare',
  'clap',
  'hihat',
  'open_hat',
  'tom',
  'crash',
  'ride',
  'percussion',
  'other'
];

export interface DrumTranscriptionResult {
  events: DrumEvent[];
  /** True when produced by the heuristic fallback instead of a trained model. */
  isMock: boolean;
  providerName: string;
}
