import { describe, it, expect } from 'vitest';
import { detectBpm } from '../src/utils/bpm';

function generateClickTrack(bpm: number, durationSec: number, sampleRate = 44100): Float32Array {
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  const secPerBeat = 60 / bpm;
  const clickLength = Math.floor(sampleRate * 0.01);

  for (let t = 0; t < durationSec; t += secPerBeat) {
    const startSample = Math.floor(t * sampleRate);
    for (let i = 0; i < clickLength && startSample + i < samples.length; i++) {
      // Decaying impulse to emulate a percussive click
      samples[startSample + i] = Math.exp(-i / (clickLength / 4));
    }
  }
  return samples;
}

describe('detectBpm', () => {
  it('detects a steady 120 BPM click track within a small tolerance', () => {
    const signal = generateClickTrack(120, 8);
    const result = detectBpm(signal, 44100);
    expect(Math.abs(result.bpm - 120)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('detects a 90 BPM click track', () => {
    const signal = generateClickTrack(90, 8);
    const result = detectBpm(signal, 44100);
    expect(Math.abs(result.bpm - 90)).toBeLessThanOrEqual(2);
  });

  it('returns low confidence for silence', () => {
    const signal = new Float32Array(44100 * 4);
    const result = detectBpm(signal, 44100);
    expect(result.confidence).toBe(0);
  });
});
