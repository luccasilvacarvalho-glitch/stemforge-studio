import { AudioMeta, WaveformPeaks } from './audio';
import { ChannelStrip } from './stems';

/**
 * A track captured from the microphone/audio interface, as opposed to a
 * Stem which comes from separation. Shares the same mixing shape
 * (ChannelStrip) so it can reuse StemTrack/Mixer components.
 */
export interface RecordedTrack {
  id: string;
  label: string;
  fileUrl: string; // object URL (WAV, converted from the recorder's native format)
  meta: AudioMeta;
  waveform?: WaveformPeaks;
  strip: ChannelStrip;
  createdAt: string;
  /** Offset (seconds) into the project timeline where this recording starts. */
  startOffsetSec: number;
}

export type RecordingStatus = 'idle' | 'requesting_permission' | 'recording' | 'processing' | 'error';
