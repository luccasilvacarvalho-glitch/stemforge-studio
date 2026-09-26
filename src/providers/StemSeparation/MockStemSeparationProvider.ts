import { StemSeparationProvider } from './types';
import { StemSeparationResult } from '@/types/stems';
import { decodeAudioFile, computePeaks, toMonoFloat32 } from '@/utils/audio';
import { defaultChannelStrip } from '@/types/stems';

/**
 * TODO: CONNECT REAL MODEL
 *
 * This provider does NOT perform real source separation. Demucs (and
 * similar models) cannot run inside a browser/Netlify Function at
 * acceptable speed, so real separation must happen on an external
 * inference service (see providers/StemSeparation/RemoteDemucsProvider.ts
 * and netlify/functions/create-job for the intended wiring).
 *
 * What this provider actually does, so the rest of the app (UI, drum
 * analysis, mixer, export) can be built and tested end-to-end without a
 * paid GPU backend:
 *   - It decodes the uploaded file once.
 *   - It exposes the SAME uploaded audio as all four stems.
 *   - It is explicitly flagged `isMock: true`, and the UI must show that
 *     flag to the user (see ProcessingStatus component) instead of
 *     pretending this is a real separation.
 *
 * This keeps the StemSeparationProvider contract stable so a real
 * provider can be dropped in later without touching any component.
 */
export class MockStemSeparationProvider implements StemSeparationProvider {
  readonly name = 'Mock (passthrough, local)';
  readonly isMock = true;

  async separate(
    audioFile: File,
    onProgress?: (pct: number) => void
  ): Promise<StemSeparationResult> {
    onProgress?.(10);
    const buffer = await decodeAudioFile(audioFile);
    onProgress?.(40);

    const mono = toMonoFloat32(buffer);
    const peaks = computePeaks(mono, Math.max(1, Math.floor(buffer.sampleRate / 100)));
    onProgress?.(70);

    const url = URL.createObjectURL(audioFile);
    const meta = {
      durationSec: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      format: audioFile.type || 'audio/wav'
    };

    const makeStem = (
      name: 'vocals' | 'drums' | 'bass' | 'other',
      label: string,
      muteByDefault: boolean
    ) => ({
      id: `${name}-${crypto.randomUUID()}`,
      name,
      label,
      fileUrl: url,
      meta,
      waveform: peaks,
      // Since every "stem" here is literally the same audio file, playing
      // all four unmuted at once would sum to ~4x the original loudness
      // and clip/distort. Only one starts unmuted so the mix sounds
      // normal on load; the others are there to explore the UI, not to
      // be layered on top of the first (they're not actually separate
      // audio - see the TODO above).
      strip: { ...defaultChannelStrip(), mute: muteByDefault }
    });

    onProgress?.(100);

    return {
      vocals: makeStem('vocals', 'Vocals (mock: same as source)', false),
      drums: makeStem('drums', 'Drums (mock: same as source)', true),
      bass: makeStem('bass', 'Bass (mock: same as source)', true),
      other: makeStem('other', 'Other (mock: same as source)', true),
      isMock: true,
      providerName: this.name
    };
  }
}
