import MidiWriter from 'midi-writer-js';
import { DrumEvent, DrumEventType } from '@/types/drums';

/**
 * Maps our internal drum event types to General MIDI percussion key numbers
 * (channel 10 / index 9), so the exported .mid opens correctly in any DAW.
 */
export const GM_DRUM_MAP: Record<DrumEventType, number> = {
  kick: 36, // Bass Drum 1
  snare: 38, // Acoustic Snare
  clap: 39, // Hand Clap
  hihat: 42, // Closed Hi-Hat
  open_hat: 46, // Open Hi-Hat
  tom: 45, // Low Tom
  crash: 49, // Crash Cymbal 1
  ride: 51, // Ride Cymbal 1
  percussion: 60, // Hi Bongo (generic slot)
  other: 37 // Side Stick (fallback)
};

const TICKS_PER_BEAT = 128; // matches midi-writer-js default resolution

export function exportDrumEventsToMidi(events: DrumEvent[], bpm: number): Uint8Array {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1, channel: 10 }));

  const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
  let lastTick = 0;

  for (const evt of sorted) {
    const startTick = Math.round((evt.startTime / 60) * bpm * TICKS_PER_BEAT);
    const wait = Math.max(0, startTick - lastTick);
    const durationTicks = Math.max(
      1,
      Math.round(((evt.endTime - evt.startTime) / 60) * bpm * TICKS_PER_BEAT)
    );

    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: [GM_DRUM_MAP[evt.type]],
        channel: 10,
        velocity: Math.round(evt.velocity * 100) + 27, // MIDI velocity 27..127
        wait: `T${wait}`,
        duration: `T${durationTicks}`
      })
    );
    lastTick = startTick + durationTicks;
  }

  const writer = new MidiWriter.Writer(track);
  return writer.buildFile();
}

/**
 * Intermediate JSON representation, used when a real .mid file isn't needed
 * yet (e.g. for the project export) - see spec section 14.
 */
export function drumEventsToJsonNotes(events: DrumEvent[], bpm: number) {
  return events.map((evt) => ({
    type: evt.type,
    gmNote: GM_DRUM_MAP[evt.type],
    startBeat: (evt.startTime / 60) * bpm,
    durationBeats: ((evt.endTime - evt.startTime) / 60) * bpm,
    velocity: evt.velocity,
    confidence: evt.confidence
  }));
}
