import { describe, it, expect } from 'vitest';
import { exportDrumEventsToMidi, drumEventsToJsonNotes, GM_DRUM_MAP } from '../src/utils/midi';
import { DrumEvent } from '../src/types/drums';

const sampleEvents: DrumEvent[] = [
  { id: '1', type: 'kick', startTime: 0, endTime: 0.1, confidence: 0.9, velocity: 0.8, manuallyEdited: false },
  { id: '2', type: 'snare', startTime: 0.5, endTime: 0.6, confidence: 0.85, velocity: 0.7, manuallyEdited: false }
];

describe('exportDrumEventsToMidi', () => {
  it('produces a non-empty MIDI byte stream with a valid header', () => {
    const bytes = exportDrumEventsToMidi(sampleEvents, 120);
    expect(bytes.length).toBeGreaterThan(0);
    // MIDI files start with the "MThd" chunk header.
    const header = String.fromCharCode(...bytes.slice(0, 4));
    expect(header).toBe('MThd');
  });
});

describe('drumEventsToJsonNotes', () => {
  it('maps event types to General MIDI percussion notes', () => {
    const notes = drumEventsToJsonNotes(sampleEvents, 120);
    expect(notes[0].gmNote).toBe(GM_DRUM_MAP.kick);
    expect(notes[1].gmNote).toBe(GM_DRUM_MAP.snare);
  });

  it('converts start time to beats correctly at 120 BPM', () => {
    const notes = drumEventsToJsonNotes(sampleEvents, 120);
    // 0.5s at 120 BPM (0.5s/beat) = 1 beat
    expect(notes[1].startBeat).toBeCloseTo(1, 3);
  });
});
