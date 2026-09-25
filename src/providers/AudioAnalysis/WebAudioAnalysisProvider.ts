import { AudioAnalysisProvider } from './types';
import { AudioAnalysis } from '@/types/audio';
import { toMonoFloat32 } from '@/utils/audio';
import { detectBpm } from '@/utils/bpm';

/**
 * Real (non-mock) analysis provider. Uses the deterministic onset/
 * autocorrelation BPM detector in utils/bpm.ts. Downbeat detection is a
 * simplification: it assumes the first strong onset is beat 1 of bar 1
 * and a constant 4/4 signature, since robust downbeat/meter detection
 * needs a trained model. This is called out explicitly to the user via
 * `bpmConfidence` and should be correctable in the transport UI.
 */
export class WebAudioAnalysisProvider implements AudioAnalysisProvider {
  readonly name = 'Web Audio onset analysis (local, real DSP)';

  async analyze(buffer: AudioBuffer): Promise<AudioAnalysis> {
    const mono = toMonoFloat32(buffer);
    const { bpm, confidence, onsets } = detectBpm(mono, buffer.sampleRate);

    const beats: number[] = [];
    if (onsets.length > 0) {
      const secPerBeat = 60 / bpm;
      let t = onsets[0];
      while (t < buffer.duration) {
        beats.push(Math.round(t * 1000) / 1000);
        t += secPerBeat;
      }
    }

    const downbeats = beats.filter((_, i) => i % 4 === 0);

    return {
      bpm,
      bpmConfidence: confidence,
      timeSignature: { numerator: 4, denominator: 4 },
      downbeats,
      beats,
      durationSec: buffer.duration
    };
  }
}
