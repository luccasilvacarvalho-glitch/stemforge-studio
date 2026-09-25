import { create } from 'zustand';
import { DrumEvent, DrumEventType, DRUM_EVENT_TYPES } from '@/types/drums';
import { ChannelStrip, defaultChannelStrip } from '@/types/stems';

export interface DrumChannelSettings extends ChannelStrip {
  sampleName: string;
}

function defaultDrumChannels(): Record<DrumEventType, DrumChannelSettings> {
  const result = {} as Record<DrumEventType, DrumChannelSettings>;
  for (const type of DRUM_EVENT_TYPES) {
    result[type] = { ...defaultChannelStrip(), sampleName: `${type}_default` };
  }
  return result;
}

interface DrumState {
  events: DrumEvent[];
  isMock: boolean;
  history: DrumEvent[][];
  future: DrumEvent[][];
  soloedTypes: Set<DrumEventType>;
  channels: Record<DrumEventType, DrumChannelSettings>;
  selectedType: DrumEventType | 'overview';

  setEvents: (events: DrumEvent[], isMock: boolean) => void;
  addEvent: (event: Omit<DrumEvent, 'id' | 'manuallyEdited'>) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, patch: Partial<DrumEvent>) => void;
  changeType: (id: string, type: DrumEventType) => void;
  moveEvent: (id: string, newStartTime: number) => void;
  duplicateEvent: (id: string) => void;
  toggleSoloType: (type: DrumEventType) => void;
  updateChannel: (type: DrumEventType, patch: Partial<DrumChannelSettings>) => void;
  setSelectedType: (type: DrumEventType | 'overview') => void;
  clearType: (type: DrumEventType) => void;
  quantizeType: (type: DrumEventType, subdivision: number, bpm: number) => void;
  undo: () => void;
  redo: () => void;
}

function snapshot(events: DrumEvent[]): DrumEvent[] {
  return events.map((e) => ({ ...e }));
}

export const useDrumStore = create<DrumState>((set, get) => ({
  events: [],
  isMock: false,
  history: [],
  future: [],
  soloedTypes: new Set(),
  channels: defaultDrumChannels(),
  selectedType: 'overview',

  setEvents: (events, isMock) => set({ events, isMock, history: [], future: [] }),

  addEvent: (event) => {
    const { events, history } = get();
    const newEvent: DrumEvent = {
      ...event,
      id: crypto.randomUUID(),
      manuallyEdited: true
    };
    set({
      events: [...events, newEvent].sort((a, b) => a.startTime - b.startTime),
      history: [...history, snapshot(events)],
      future: []
    });
  },

  removeEvent: (id) => {
    const { events, history } = get();
    set({
      events: events.filter((e) => e.id !== id),
      history: [...history, snapshot(events)],
      future: []
    });
  },

  updateEvent: (id, patch) => {
    const { events, history } = get();
    set({
      events: events.map((e) =>
        e.id === id ? { ...e, ...patch, manuallyEdited: true } : e
      ),
      history: [...history, snapshot(events)],
      future: []
    });
  },

  changeType: (id, type) => get().updateEvent(id, { type }),

  moveEvent: (id, newStartTime) => {
    const evt = get().events.find((e) => e.id === id);
    if (!evt) return;
    const duration = evt.endTime - evt.startTime;
    get().updateEvent(id, { startTime: newStartTime, endTime: newStartTime + duration });
  },

  duplicateEvent: (id) => {
    const evt = get().events.find((e) => e.id === id);
    if (!evt) return;
    get().addEvent({
      type: evt.type,
      startTime: evt.endTime + 0.05,
      endTime: evt.endTime + 0.05 + (evt.endTime - evt.startTime),
      confidence: evt.confidence,
      velocity: evt.velocity
    });
  },

  toggleSoloType: (type) => {
    const soloed = new Set(get().soloedTypes);
    if (soloed.has(type)) soloed.delete(type);
    else soloed.add(type);
    set({ soloedTypes: soloed });
  },

  updateChannel: (type, patch) =>
    set((s) => ({
      channels: { ...s.channels, [type]: { ...s.channels[type], ...patch } }
    })),

  setSelectedType: (type) => set({ selectedType: type }),

  clearType: (type) => {
    const { events, history } = get();
    set({
      events: events.filter((e) => e.type !== type),
      history: [...history, snapshot(events)],
      future: []
    });
  },

  quantizeType: (type, subdivision, bpm) => {
    const { events, history } = get();
    const secPerStep = 60 / bpm / (subdivision / 4);
    set({
      events: events.map((e) => {
        if (e.type !== type) return e;
        const duration = e.endTime - e.startTime;
        const snapped = Math.round(e.startTime / secPerStep) * secPerStep;
        return { ...e, startTime: snapped, endTime: snapped + duration, manuallyEdited: true };
      }),
      history: [...history, snapshot(events)],
      future: []
    });
  },

  undo: () => {
    const { history, events, future } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      events: prev,
      history: history.slice(0, -1),
      future: [snapshot(events), ...future]
    });
  },

  redo: () => {
    const { future, events, history } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      events: next,
      future: future.slice(1),
      history: [...history, snapshot(events)]
    });
  }
}));
