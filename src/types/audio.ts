/**
 * Core audio-related types shared across the app.
 */

export interface AudioMeta {
  durationSec: number;
  sampleRate: number;
  channels: number;
  format: string; // 'wav' | 'mp3' | 'flac' | ...
}

export interface AudioAnalysis {
  bpm: number;
  bpmConfidence: number; // 0..1
  timeSignature: { numerator: number; denominator: number };
  downbeats: number[]; // seconds
  beats: number[]; // seconds
  durationSec: number;
}

export interface WaveformPeaks {
  // Downsampled min/max pairs per channel, for cheap rendering at any zoom level.
  peaks: Float32Array; // interleaved [min0,max0,min1,max1,...]
  samplesPerPixel: number;
  length: number;
}

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export interface TransportState {
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  bpm: number;
  loop: { enabled: boolean; startSec: number; endSec: number };
  metronomeEnabled: boolean;
  zoom: number; // pixels per second
}
