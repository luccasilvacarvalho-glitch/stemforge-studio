import { DrumTranscriptionProvider } from './types';
import { DrumEvent, DrumEventType, DrumTranscriptionResult } from '@/types/drums';
import { toMonoFloat32 } from '@/utils/audio';

/**
 * Local/HeuristicDrumProvider
 *
 * This is a REAL signal-processing pipeline (onset detection + spectral
 * feature classification), not a trained neural model. It follows the
 * hybrid approach mandated by the spec (section 4) when no specialized
 * drum-transcription model is connected:
 *
 *   1. Onset detection   - spectral-flux based, more robust than plain
 *                           energy for percussive attacks.
 *   2. Spectral analysis - per-onset FFT to get low/mid/high band energy,
 *                           spectral centroid and zero-crossing rate.
 *   3. Classification    - simple rule-based classifier over those
 *                           features (kick = low-heavy + low centroid,
 *                           hi-hat = high-heavy + high ZCR, etc).
 *   4. Confidence score   - how strongly the features matched the winning
 *                           class vs. the runner-up, NOT a calibrated
 *                           probability from a trained model.
 *   5. Manual correction  - every event stays fully editable in the UI;
 *                           this provider must never block correction.
 *
 * PERFORMANCE NOTE: the per-frame spectrum uses a real FFT (radix-2
 * Cooley-Tukey, O(N log N)) rather than a naive DFT (O(N^2)). On a full
 * song this is the difference between a few hundred milliseconds and the
 * browser tab freezing/"Page Unresponsive" for minutes - a naive DFT at
 * fftSize=1024 over tens of thousands of frames is billions of
 * operations. The main frame loop also yields to the browser every few
 * hundred frames (`yieldToMain`) so the tab stays responsive and progress
 * updates are visible, even though everything still runs on the main
 * thread. A future step (see ROADMAP.md) would move this into a Web
 * Worker/AudioWorklet for true off-thread processing on very long files.
 *
 * TODO: CONNECT REAL MODEL
 * Swap this for a trained drum-transcription model (e.g. an ADT/ODT
 * model served behind DrumTranscriptionProvider) when available - the
 * DrumEditor, DrumGrid, MIDI export etc. only depend on the
 * DrumTranscriptionProvider interface, not on this implementation.
 */
export class HeuristicDrumProvider implements DrumTranscriptionProvider {
  readonly name = 'Heuristic onset+spectral classifier (local)';
  readonly isMock = true;

  async transcribe(
    buffer: AudioBuffer,
    onProgress?: (pct: number) => void
  ): Promise<DrumTranscriptionResult> {
    const sampleRate = buffer.sampleRate;
    const mono = toMonoFloat32(buffer);
    onProgress?.(5);

    const fftSize = 1024;
    const hopSize = 512; // ~11.6ms at 44.1kHz - fine-grained enough for drum onsets
    const frames = frameSignal(mono, fftSize, hopSize);
    onProgress?.(10);

    const spectralFlux = await computeSpectralFluxAsync(frames, fftSize, (pct) =>
      onProgress?.(10 + Math.round(pct * 0.6)) // spectral flux is the bulk of the work: 10-70%
    );
    onProgress?.(70);

    const onsetFrameIndices = pickOnsetPeaks(spectralFlux);
    onProgress?.(80);

    const events: DrumEvent[] = [];
    const window = hannWindowTable(fftSize);
    let processed = 0;
    for (const frameIdx of onsetFrameIndices) {
      const startSample = frameIdx * hopSize;
      const analysisWindow = mono.subarray(
        startSample,
        Math.min(startSample + fftSize, mono.length)
      );
      const features = extractFeatures(analysisWindow, sampleRate, fftSize, window);
      const { type, confidence } = classify(features);

      events.push({
        id: crypto.randomUUID(),
        type,
        startTime: startSample / sampleRate,
        endTime: (startSample + hopSize * 3) / sampleRate,
        confidence,
        velocity: clamp01(features.rms * 3),
        manuallyEdited: false
      });

      processed++;
      if (processed % 200 === 0) {
        onProgress?.(80 + Math.round((processed / onsetFrameIndices.length) * 20));
        await yieldToMain();
      }
    }
    onProgress?.(100);

    return { events, isMock: true, providerName: this.name };
  }
}

// ---------- DSP helpers ----------

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function frameSignal(samples: Float32Array, fftSize: number, hopSize: number): Float32Array[] {
  const frames: Float32Array[] = [];
  for (let start = 0; start + fftSize <= samples.length; start += hopSize) {
    frames.push(samples.subarray(start, start + fftSize));
  }
  return frames;
}

function hannWindowTable(N: number): Float32Array {
  const table = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    table[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
  }
  return table;
}

/**
 * Iterative radix-2 Cooley-Tukey FFT, in place. `real`/`imag` must have a
 * power-of-two length. This is what makes analyzing a full song feasible
 * in the browser - see the performance note in the file header.
 */
function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let curWr = 1;
      let curWi = 0;
      for (let j = 0; j < half; j++) {
        const ur = real[i + j];
        const ui = imag[i + j];
        const vr = real[i + j + half] * curWr - imag[i + j + half] * curWi;
        const vi = real[i + j + half] * curWi + imag[i + j + half] * curWr;
        real[i + j] = ur + vr;
        imag[i + j] = ui + vi;
        real[i + j + half] = ur - vr;
        imag[i + j + half] = ui - vi;
        const nextWr = curWr * wr - curWi * wi;
        const nextWi = curWr * wi + curWi * wr;
        curWr = nextWr;
        curWi = nextWi;
      }
    }
  }
}

/** Windowed magnitude spectrum (first half of bins) via FFT. `fftSize` must be a power of 2. */
function magnitudeSpectrumFFT(frame: Float32Array, fftSize: number, window: Float32Array): Float32Array {
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const len = Math.min(frame.length, fftSize);
  for (let n = 0; n < len; n++) real[n] = frame[n] * window[n];
  // Remaining samples (if frame is shorter than fftSize, e.g. the last
  // frame of the song) stay zero - implicit zero-padding.

  fftInPlace(real, imag);

  const half = fftSize / 2;
  const mags = new Float32Array(half);
  for (let k = 0; k < half; k++) {
    mags[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
  }
  return mags;
}

async function computeSpectralFluxAsync(
  frames: Float32Array[],
  fftSize: number,
  onProgress?: (pct: number) => void
): Promise<Float32Array> {
  const flux = new Float32Array(frames.length);
  const window = hannWindowTable(fftSize);
  let prevMag: Float32Array | null = null;

  for (let i = 0; i < frames.length; i++) {
    const mag = magnitudeSpectrumFFT(frames[i], fftSize, window);
    if (prevMag) {
      let sum = 0;
      for (let k = 0; k < mag.length; k++) {
        const diff = mag[k] - prevMag[k];
        if (diff > 0) sum += diff;
      }
      flux[i] = sum;
    }
    prevMag = mag;

    if (i % 300 === 0) {
      onProgress?.(Math.round((i / frames.length) * 100));
      await yieldToMain();
    }
  }
  return flux;
}

function pickOnsetPeaks(flux: Float32Array): number[] {
  const peaks: number[] = [];
  const windowSize = 15;
  for (let i = 2; i < flux.length - 2; i++) {
    const windowStart = Math.max(0, i - windowSize);
    let mean = 0;
    for (let j = windowStart; j < i; j++) mean += flux[j];
    mean /= Math.max(1, i - windowStart);

    const threshold = mean * 1.5 + 0.0005;
    const isPeak = flux[i] > threshold && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1];
    if (isPeak) {
      const last = peaks[peaks.length - 1];
      if (last === undefined || i - last > 4) peaks.push(i);
    }
  }
  return peaks;
}

interface DrumFeatures {
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  rms: number;
}

function extractFeatures(
  window: Float32Array,
  sampleRate: number,
  fftSize: number,
  windowTable: Float32Array
): DrumFeatures {
  const mags = magnitudeSpectrumFFT(window, fftSize, windowTable);
  const binHz = sampleRate / fftSize;

  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;
  let weightedFreqSum = 0;
  let totalMag = 0;

  for (let k = 0; k < mags.length; k++) {
    const freq = k * binHz;
    const mag = mags[k];
    totalMag += mag;
    weightedFreqSum += freq * mag;
    if (freq < 200) lowEnergy += mag;
    else if (freq < 2000) midEnergy += mag;
    else highEnergy += mag;
  }

  const spectralCentroid = totalMag > 0 ? weightedFreqSum / totalMag : 0;

  let zcr = 0;
  for (let i = 1; i < window.length; i++) {
    if ((window[i - 1] >= 0) !== (window[i] >= 0)) zcr++;
  }
  zcr /= window.length;

  let rmsSum = 0;
  for (let i = 0; i < window.length; i++) rmsSum += window[i] * window[i];
  const rms = Math.sqrt(rmsSum / window.length);

  const total = lowEnergy + midEnergy + highEnergy || 1;
  return {
    lowEnergy: lowEnergy / total,
    midEnergy: midEnergy / total,
    highEnergy: highEnergy / total,
    spectralCentroid,
    zeroCrossingRate: zcr,
    rms
  };
}

function classify(f: DrumFeatures): { type: DrumEventType; confidence: number } {
  // Rule-based scoring: each drum class gets a score from 0..1 based on
  // how well the features match its typical spectral signature. This is
  // deliberately simple and transparent - see file header for caveats.
  const scores: Record<DrumEventType, number> = {
    kick: f.lowEnergy * 1.4 - f.spectralCentroid / 8000 - f.zeroCrossingRate,
    snare: f.midEnergy * 1.1 + Math.min(f.zeroCrossingRate * 1.5, 0.4) - f.lowEnergy * 0.3,
    clap: f.midEnergy * 0.9 + f.highEnergy * 0.6 + f.zeroCrossingRate * 0.8,
    hihat: f.highEnergy * 1.5 + f.zeroCrossingRate * 1.2 - f.lowEnergy,
    open_hat: f.highEnergy * 1.3 + f.zeroCrossingRate - f.lowEnergy * 0.8,
    tom: f.lowEnergy * 0.9 + f.midEnergy * 0.6 - f.zeroCrossingRate,
    crash: f.highEnergy * 1.1 + f.spectralCentroid / 10000,
    ride: f.highEnergy * 0.9 + f.midEnergy * 0.3,
    percussion: f.midEnergy * 0.5 + f.highEnergy * 0.5,
    other: 0.1
  };

  let bestType: DrumEventType = 'other';
  let bestScore = -Infinity;
  let secondBest = -Infinity;

  for (const [type, score] of Object.entries(scores) as [DrumEventType, number][]) {
    if (score > bestScore) {
      secondBest = bestScore;
      bestScore = score;
      bestType = type;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  const margin = bestScore - (secondBest === -Infinity ? 0 : secondBest);
  const confidence = clamp01(0.5 + margin * 0.8);

  return { type: bestType, confidence };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
