import { GridSubdivision, SnapMode } from '@/types/project';

/**
 * Given a BPM, time signature and first downbeat, compute the time (in
 * seconds) of every grid line at a given subdivision, across a duration.
 */
export function buildGridLines(
  bpm: number,
  subdivision: GridSubdivision,
  firstDownbeatSec: number,
  durationSec: number,
  beatsPerBar = 4
): number[] {
  const secPerBeat = 60 / bpm;
  const secPerSubdivision = secPerBeat * (4 / subdivision);
  const lines: number[] = [];

  let t = firstDownbeatSec % secPerSubdivision;
  // Walk backward to include lines before the first downbeat if any.
  while (t > 0) t -= secPerSubdivision;

  for (; t < durationSec; t += secPerSubdivision) {
    if (t >= 0) lines.push(round(t));
  }
  return lines;
}

export function snapTimeToGrid(
  timeSec: number,
  bpm: number,
  snap: SnapMode,
  firstDownbeatSec: number
): number {
  if (snap === 'off') return timeSec;
  const secPerBeat = 60 / bpm;
  const secPerSubdivision = secPerBeat * (4 / snap);
  const offset = timeSec - firstDownbeatSec;
  const snappedOffset = Math.round(offset / secPerSubdivision) * secPerSubdivision;
  return round(firstDownbeatSec + snappedOffset);
}

export function secondsToBarsBeats(
  timeSec: number,
  bpm: number,
  firstDownbeatSec: number,
  beatsPerBar = 4
): { bar: number; beat: number; tick: number } {
  const secPerBeat = 60 / bpm;
  const totalBeats = (timeSec - firstDownbeatSec) / secPerBeat;
  const bar = Math.floor(totalBeats / beatsPerBar);
  const beatInBar = totalBeats - bar * beatsPerBar;
  const beat = Math.floor(beatInBar);
  const tick = Math.round((beatInBar - beat) * 960); // 960 ticks/beat (MIDI-ish resolution)
  return { bar: bar + 1, beat: beat + 1, tick };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
