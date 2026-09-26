import { create } from 'zustand';
import { EffectInstance, EffectType, defaultSettingsFor } from '@/types/effects';

interface EffectsState {
  /** channelId (stem name or recording id) -> ordered effect list */
  chains: Record<string, EffectInstance[]>;

  getChain: (channelId: string) => EffectInstance[];
  addEffect: (channelId: string, type: EffectType) => void;
  removeEffect: (channelId: string, effectId: string) => void;
  toggleEffect: (channelId: string, effectId: string) => void;
  updateSettings: (channelId: string, effectId: string, settings: EffectInstance['settings']) => void;
  moveEffect: (channelId: string, effectId: string, direction: 'up' | 'down') => void;
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  chains: {},

  getChain: (channelId) => get().chains[channelId] ?? [],

  addEffect: (channelId, type) =>
    set((s) => {
      const current = s.chains[channelId] ?? [];
      const instance: EffectInstance = {
        id: crypto.randomUUID(),
        type,
        enabled: true,
        settings: defaultSettingsFor(type)
      };
      return { chains: { ...s.chains, [channelId]: [...current, instance] } };
    }),

  removeEffect: (channelId, effectId) =>
    set((s) => ({
      chains: {
        ...s.chains,
        [channelId]: (s.chains[channelId] ?? []).filter((e) => e.id !== effectId)
      }
    })),

  toggleEffect: (channelId, effectId) =>
    set((s) => ({
      chains: {
        ...s.chains,
        [channelId]: (s.chains[channelId] ?? []).map((e) =>
          e.id === effectId ? { ...e, enabled: !e.enabled } : e
        )
      }
    })),

  updateSettings: (channelId, effectId, settings) =>
    set((s) => ({
      chains: {
        ...s.chains,
        [channelId]: (s.chains[channelId] ?? []).map((e) =>
          e.id === effectId ? { ...e, settings } : e
        )
      }
    })),

  moveEffect: (channelId, effectId, direction) =>
    set((s) => {
      const list = [...(s.chains[channelId] ?? [])];
      const idx = list.findIndex((e) => e.id === effectId);
      if (idx === -1) return s;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return s;
      [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
      return { chains: { ...s.chains, [channelId]: list } };
    })
}));
