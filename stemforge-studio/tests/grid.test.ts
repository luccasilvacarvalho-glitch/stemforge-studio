import { describe, it, expect } from 'vitest';
import { buildGridLines, snapTimeToGrid, secondsToBarsBeats } from '../src/utils/grid';

describe('buildGridLines', () => {
  it('generates evenly spaced 1/16 lines at 120 BPM', () => {
    const lines = buildGridLines(120, 16, 0, 2);
    // 120 BPM => 0.5s/beat => 0.125s per 1/16 note
    expect(lines[1] - lines[0]).toBeCloseTo(0.125, 3);
  });
});

describe('snapTimeToGrid', () => {
  it('snaps to the nearest 1/8 note at 120 BPM', () => {
    // 1/8 note = 0.25s at 120 BPM
    const snapped = snapTimeToGrid(0.28, 120, 8, 0);
    expect(snapped).toBeCloseTo(0.25, 3);
  });

  it('returns the original time when snap is off', () => {
    expect(snapTimeToGrid(1.234, 120, 'off', 0)).toBe(1.234);
  });
});

describe('secondsToBarsBeats', () => {
  it('computes bar/beat for a downbeat-aligned time', () => {
    // At 120 BPM, beat 5 (bar 2, beat 1) lands at 2s
    const { bar, beat } = secondsToBarsBeats(2, 120, 0);
    expect(bar).toBe(2);
    expect(beat).toBe(1);
  });
});
