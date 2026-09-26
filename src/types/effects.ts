export type EffectType = 'eq' | 'compressor' | 'delay' | 'reverb';

export interface EQSettings {
  lowFreq: number;
  lowGainDb: number;
  midFreq: number;
  midGainDb: number;
  midQ: number;
  highFreq: number;
  highGainDb: number;
}

export interface CompressorSettings {
  thresholdDb: number;
  ratio: number;
  attackSec: number;
  releaseSec: number;
  kneeDb: number;
}

export interface DelaySettings {
  mix: number; // 0..1 wet amount
  timeSec: number;
  feedback: number; // 0..0.95
}

export interface ReverbSettings {
  mix: number; // 0..1 wet amount
  decaySec: number; // impulse response length/decay
}

export type EffectSettingsFor<T extends EffectType> = T extends 'eq'
  ? EQSettings
  : T extends 'compressor'
  ? CompressorSettings
  : T extends 'delay'
  ? DelaySettings
  : ReverbSettings;

export interface EffectInstance {
  id: string;
  type: EffectType;
  enabled: boolean;
  settings: EQSettings | CompressorSettings | DelaySettings | ReverbSettings;
}

export const EFFECT_LABELS: Record<EffectType, string> = {
  eq: 'EQ (3 bandas)',
  compressor: 'Compressor',
  delay: 'Delay',
  reverb: 'Reverb'
};

export function defaultSettingsFor(type: EffectType): EffectInstance['settings'] {
  switch (type) {
    case 'eq':
      return {
        lowFreq: 120,
        lowGainDb: 0,
        midFreq: 1000,
        midGainDb: 0,
        midQ: 1,
        highFreq: 6000,
        highGainDb: 0
      } satisfies EQSettings;
    case 'compressor':
      return {
        thresholdDb: -24,
        ratio: 3,
        attackSec: 0.01,
        releaseSec: 0.2,
        kneeDb: 12
      } satisfies CompressorSettings;
    case 'delay':
      return { mix: 0.3, timeSec: 0.3, feedback: 0.35 } satisfies DelaySettings;
    case 'reverb':
      return { mix: 0.25, decaySec: 2 } satisfies ReverbSettings;
  }
}
