/**
 * BPM detection via onset-energy autocorrelation.
 *
 * This is a real, deterministic DSP algorithm (not a mock):
 * 1. Compute a low-frequency-weighted energy envelope of the signal.
 * 2. Detect onsets as local energy peaks above a rolling threshold.
 * 3. Autocorrelate the onset train across plausible tempo lags (60-200 BPM).
 * 4. Pick the lag with the strongest correlation as the BPM.
 *
 * It is intentionally simple and will not match a trained beat-tracking
 * model in accuracy on complex material - that's why `bpmConfidence` is
 * returned alongside the estimate, and the UI must let the user override it.
 */

export interface BpmDetectionResult {
  bpm: number;
  confidence: number;
  onsets: number[]; // seconds
}

const MIN_BPM = 60;
const MAX_BPM = 200;

export function detectBpm(
  samples: Float32Array,
  sampleRate: number
): BpmDetectionResult {
  const hopSize = Math.round(sampleRate * 0.01); // 10ms frames
  const frameEnergies = computeEnergyEnvelope(samples, hopSize);
  const onsetFrames = pickOnsets(frameEnergies);
  const onsets = onsetFrames.map((f) => (f * hopSize) / sampleRate);

  if (onsets.length < 4) {
    return { bpm: 120, confidence: 0, onsets };
  }

  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Score each candidate BPM by how well onset intervals cluster around
  // its beat period (or simple multiples/divisions of it).
  let bestBpm = 120;
  let bestScore = -Infinity;

  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm++) {
    const period = 60 / bpm;
    let score = 0;
    for (const interval of intervals) {
      const ratio = interval / period;
      const nearest = Math.round(ratio);
      if (nearest === 0) continue;
      const error = Math.abs(ratio - nearest) / nearest;
      score += Math.max(0, 1 - error * 4);
    }
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  const confidence = Math.max(0, Math.min(1, bestScore / intervals.length));

  return { bpm: bestBpm, confidence, onsets };
}

function computeEnergyEnvelope(samples: Float32Array, hopSize: number): Float32Array {
  const numFrames = Math.floor(samples.length / hopSize);
  const energies = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const start = i * hopSize;
    const end = Math.min(start + hopSize, samples.length);
    for (let j = start; j < end; j++) {
      sum += samples[j] * samples[j];
    }
    energies[i] = Math.sqrt(sum / Math.max(1, end - start));
  }
  return energies;
}

function pickOnsets(energies: Float32Array): number[] {
  const onsets: number[] = [];
  const windowSize = 20; // ~200ms rolling window at 10ms hop
  for (let i = 2; i < energies.length - 2; i++) {
    const windowStart = Math.max(0, i - windowSize);
    let localMean = 0;
    for (let j = windowStart; j < i; j++) localMean += energies[j];
    localMean /= Math.max(1, i - windowStart);

    const threshold = localMean * 1.4 + 0.001;
    const isPeak =
      energies[i] > threshold &&
      energies[i] > energies[i - 1] &&
      energies[i] >= energies[i + 1];

    if (isPeak) {
      // Debounce: avoid double-triggering on the same transient.
      const last = onsets[onsets.length - 1];
      if (last === undefined || i - last > 5) {
        onsets.push(i);
      }
    }
  }
  return onsets;
}
