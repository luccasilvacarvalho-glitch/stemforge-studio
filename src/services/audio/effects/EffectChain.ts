import {
  CompressorSettings,
  DelaySettings,
  EffectInstance,
  EffectType,
  EQSettings,
  ReverbSettings
} from '@/types/effects';

interface EffectUnit {
  type: EffectType;
  input: AudioNode;
  output: AudioNode;
  applySettings: (settings: EffectInstance['settings']) => void;
  dispose: () => void;
}

/**
 * Builds and maintains a real Web Audio processing chain (EQ, compressor,
 * delay, reverb - all native Web Audio nodes, no third-party plugin) for
 * one channel (a stem or a recording). `input`/`output` are stable
 * GainNode endpoints you connect into your existing audio graph; the
 * internal node graph is rebuilt only when the effect list changes
 * structurally (added/removed/reordered/enabled toggled) - simple
 * parameter tweaks (moving a slider) update existing AudioParams in
 * place via `setTargetAtTime` so there's no click/glitch while dragging.
 */
export class EffectChain {
  readonly input: GainNode;
  readonly output: GainNode;
  private ctx: AudioContext;
  private units = new Map<string, EffectUnit>();
  private order: string[] = [];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.input.connect(this.output);
  }

  /** Call whenever the effect list for this channel changes. */
  sync(effects: EffectInstance[]): void {
    const newOrder = effects.map((e) => e.id);
    const structurallyChanged =
      newOrder.length !== this.order.length ||
      newOrder.some((id, i) => id !== this.order[i]) ||
      effects.some((e) => {
        const existing = this.units.get(e.id);
        if (!e.enabled) return !!existing; // was built, now disabled -> rebuild without it
        return !existing || existing.type !== e.type;
      });

    if (structurallyChanged) {
      this.rebuild(effects);
    } else {
      for (const e of effects) {
        if (e.enabled) this.units.get(e.id)?.applySettings(e.settings);
      }
    }
  }

  private rebuild(effects: EffectInstance[]): void {
    this.input.disconnect();
    for (const unit of this.units.values()) unit.dispose();
    this.units.clear();

    let prevOut: AudioNode = this.input;
    for (const effect of effects) {
      if (!effect.enabled) continue;
      const unit = createEffectUnit(this.ctx, effect);
      prevOut.connect(unit.input);
      prevOut = unit.output;
      this.units.set(effect.id, unit);
    }
    prevOut.connect(this.output);
    this.order = effects.map((e) => e.id);
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    for (const unit of this.units.values()) unit.dispose();
    this.units.clear();
  }
}

function createEffectUnit(ctx: AudioContext, effect: EffectInstance): EffectUnit {
  switch (effect.type) {
    case 'eq':
      return buildEQ(ctx, effect.settings as EQSettings);
    case 'compressor':
      return buildCompressor(ctx, effect.settings as CompressorSettings);
    case 'delay':
      return buildDelay(ctx, effect.settings as DelaySettings);
    case 'reverb':
      return buildReverb(ctx, effect.settings as ReverbSettings);
  }
}

// ---------- EQ: 3-band (low-shelf, mid peaking, high-shelf) ----------

function buildEQ(ctx: AudioContext, settings: EQSettings): EffectUnit {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';

  low.connect(mid).connect(high);

  function applySettings(s: EQSettings) {
    const t = ctx.currentTime;
    low.frequency.setTargetAtTime(s.lowFreq, t, 0.01);
    low.gain.setTargetAtTime(s.lowGainDb, t, 0.01);
    mid.frequency.setTargetAtTime(s.midFreq, t, 0.01);
    mid.gain.setTargetAtTime(s.midGainDb, t, 0.01);
    mid.Q.setTargetAtTime(s.midQ, t, 0.01);
    high.frequency.setTargetAtTime(s.highFreq, t, 0.01);
    high.gain.setTargetAtTime(s.highGainDb, t, 0.01);
  }
  applySettings(settings);

  return {
    type: 'eq',
    input: low,
    output: high,
    applySettings: (s) => applySettings(s as EQSettings),
    dispose: () => {
      low.disconnect();
      mid.disconnect();
      high.disconnect();
    }
  };
}

// ---------- Compressor ----------

function buildCompressor(ctx: AudioContext, settings: CompressorSettings): EffectUnit {
  const node = ctx.createDynamicsCompressor();

  function applySettings(s: CompressorSettings) {
    const t = ctx.currentTime;
    node.threshold.setTargetAtTime(s.thresholdDb, t, 0.01);
    node.ratio.setTargetAtTime(s.ratio, t, 0.01);
    node.attack.setTargetAtTime(s.attackSec, t, 0.01);
    node.release.setTargetAtTime(s.releaseSec, t, 0.01);
    node.knee.setTargetAtTime(s.kneeDb, t, 0.01);
  }
  applySettings(settings);

  return {
    type: 'compressor',
    input: node,
    output: node,
    applySettings: (s) => applySettings(s as CompressorSettings),
    dispose: () => node.disconnect()
  };
}

// ---------- Delay (wet/dry, with feedback) ----------

function buildDelay(ctx: AudioContext, settings: DelaySettings): EffectUnit {
  const entry = ctx.createGain();
  const exit = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const delayNode = ctx.createDelay(5); // up to 5s max delay time
  const feedbackGain = ctx.createGain();

  entry.connect(dryGain).connect(exit);
  entry.connect(delayNode);
  delayNode.connect(feedbackGain).connect(delayNode); // feedback loop
  delayNode.connect(wetGain).connect(exit);

  function applySettings(s: DelaySettings) {
    const t = ctx.currentTime;
    delayNode.delayTime.setTargetAtTime(s.timeSec, t, 0.01);
    feedbackGain.gain.setTargetAtTime(s.feedback, t, 0.01);
    wetGain.gain.setTargetAtTime(s.mix, t, 0.01);
    dryGain.gain.setTargetAtTime(1 - s.mix, t, 0.01);
  }
  applySettings(settings);

  return {
    type: 'delay',
    input: entry,
    output: exit,
    applySettings: (s) => applySettings(s as DelaySettings),
    dispose: () => {
      entry.disconnect();
      exit.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      delayNode.disconnect();
      feedbackGain.disconnect();
    }
  };
}

// ---------- Reverb (algorithmic: noise-burst impulse response via ConvolverNode) ----------

function generateImpulseResponse(ctx: AudioContext, decaySec: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * decaySec));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // White noise shaped by an exponential decay envelope - a standard,
      // real (if simple) algorithmic reverb technique. Not a sampled IR
      // from a real space, but genuine convolution reverb.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  return impulse;
}

function buildReverb(ctx: AudioContext, settings: ReverbSettings): EffectUnit {
  const entry = ctx.createGain();
  const exit = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  let convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, settings.decaySec);

  entry.connect(dryGain).connect(exit);
  entry.connect(convolver).connect(wetGain).connect(exit);

  let lastDecay = settings.decaySec;

  function applySettings(s: ReverbSettings) {
    const t = ctx.currentTime;
    wetGain.gain.setTargetAtTime(s.mix, t, 0.01);
    dryGain.gain.setTargetAtTime(1 - s.mix, t, 0.01);

    if (Math.abs(s.decaySec - lastDecay) > 0.05) {
      // Regenerating the impulse response is the only way to change
      // decay time with a ConvolverNode - swap it in place.
      convolver.disconnect();
      convolver = ctx.createConvolver();
      convolver.buffer = generateImpulseResponse(ctx, s.decaySec);
      entry.connect(convolver).connect(wetGain);
      lastDecay = s.decaySec;
    }
  }

  return {
    type: 'reverb',
    input: entry,
    output: exit,
    applySettings: (s) => applySettings(s as ReverbSettings),
    dispose: () => {
      entry.disconnect();
      exit.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      convolver.disconnect();
    }
  };
}
