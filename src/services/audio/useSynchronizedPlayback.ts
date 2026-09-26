import { useEffect, useRef } from 'react';
import { StemSeparationResult } from '@/types/stems';
import { RecordedTrack } from '@/types/recording';
import { useAudioStore } from '@/stores/audioStore';
import { useEffectsStore } from '@/stores/effectsStore';
import { EffectChain } from '@/services/audio/effects/EffectChain';

/**
 * Plays every stem's <audio> element in sync, respecting per-stem
 * mute/solo/volume/pan, and routes each track through its own effect
 * chain (EQ/compressor/delay/reverb - see stores/effectsStore.ts and
 * services/audio/effects/EffectChain.ts) before the gain/pan stage. Uses
 * plain HTMLAudioElement + WebAudio nodes rather than decoding everything
 * into memory again, to keep this responsive for multi-minute songs
 * (spec section 24).
 */
interface PlayableTrack {
  id: string;
  fileUrl: string;
  strip: { volume: number; mute: boolean; solo: boolean; pan: number };
  /** Seconds into the project timeline where this track should start playing. Stems default to 0. */
  startOffsetSec?: number;
}

export function useSynchronizedPlayback(
  stems: StemSeparationResult | null,
  recordings: RecordedTrack[] = []
) {
  const { isPlaying, positionSec, setPosition, setPlaying, durationSec, loop, masterVolume } = useAudioStore();
  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Map<string, { gain: GainNode; pan: StereoPannerNode }>>(new Map());
  const offsetsRef = useRef<Map<string, number>>(new Map());
  const effectChainsRef = useRef<Map<string, EffectChain>>(new Map());
  const rafRef = useRef<number>();

  const tracks: PlayableTrack[] = [
    ...(stems
      ? (Object.values(stems).filter((s) => s && typeof s === 'object' && 'fileUrl' in s) as any[]).map(
          (s) => ({ id: s.name, fileUrl: s.fileUrl, strip: s.strip, startOffsetSec: 0 })
        )
      : []),
    ...recordings.map((r) => ({
      id: r.id,
      fileUrl: r.fileUrl,
      strip: r.strip,
      startOffsetSec: r.startOffsetSec
    }))
  ];
  const trackKey = tracks.map((t) => t.id).join(',');

  // (Re)build audio elements whenever the set of playable tracks changes.
  useEffect(() => {
    const els = elementsRef.current;
    els.forEach((el) => el.pause());
    els.clear();
    nodesRef.current.clear();
    offsetsRef.current.clear();
    effectChainsRef.current.forEach((chain) => chain.dispose());
    effectChainsRef.current.clear();

    if (tracks.length === 0) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    for (const t of tracks) {
      const audioEl = new Audio(t.fileUrl);
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'auto';

      const source = ctx.createMediaElementSource(audioEl);
      const chain = new EffectChain(ctx);
      chain.sync(useEffectsStore.getState().getChain(t.id));
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      source.connect(chain.input);
      chain.output.connect(gain).connect(pan).connect(ctx.destination);

      els.set(t.id, audioEl);
      nodesRef.current.set(t.id, { gain, pan });
      offsetsRef.current.set(t.id, t.startOffsetSec ?? 0);
      effectChainsRef.current.set(t.id, chain);
      applyStrip(t.id, t.strip);
    }

    return () => {
      els.forEach((el) => el.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey]);

  // Keep each track's effect chain in sync with the effects store (EQ,
  // compressor, delay, reverb settings/enable/order) without needing to
  // rebuild the whole audio element graph.
  useEffect(() => {
    const unsubscribe = useEffectsStore.subscribe((state) => {
      effectChainsRef.current.forEach((chain, id) => {
        chain.sync(state.chains[id] ?? []);
      });
    });
    // Apply once immediately too, in case effects were set before this ran.
    effectChainsRef.current.forEach((chain, id) => {
      chain.sync(useEffectsStore.getState().getChain(id));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey]);

  function applyStrip(id: string, strip: { volume: number; mute: boolean; solo: boolean; pan: number }) {
    const node = nodesRef.current.get(id);
    if (!node) return;
    const anySoloed = tracks.some((t) => t.strip.solo);
    const audible = strip.solo || (!anySoloed && !strip.mute);
    const masterVolume = useAudioStore.getState().masterVolume;
    node.gain.gain.value = audible ? strip.volume * masterVolume : 0;
    node.pan.pan.value = strip.pan;
  }

  useEffect(() => {
    for (const t of tracks) applyStrip(t.id, t.strip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, JSON.stringify(tracks.map((t) => t.strip)), masterVolume]);

  useEffect(() => {
    const els = elementsRef.current;
    if (isPlaying) {
      audioCtxRef.current?.resume();
      els.forEach((el, id) => {
        const offset = offsetsRef.current.get(id) ?? 0;
        const localTime = positionSec - offset;
        if (localTime < 0) {
          el.pause();
          return;
        }
        if (Math.abs(el.currentTime - localTime) > 0.15) el.currentTime = localTime;
        el.play().catch(() => {});
      });
      const tick = () => {
        // Drive the shared clock from the first stem/recording, falling
        // back to wall-clock stepping if nothing is loaded to sync from.
        const first = els.values().next().value as HTMLAudioElement | undefined;
        let t = first ? first.currentTime + (offsetsRef.current.values().next().value ?? 0) : positionSec;
        if (loop.enabled && t >= loop.endSec) {
          t = loop.startSec;
          els.forEach((el, id) => {
            const offset = offsetsRef.current.get(id) ?? 0;
            el.currentTime = Math.max(0, loop.startSec - offset);
          });
        }
        setPosition(t);
        if (t >= durationSec && durationSec > 0) setPlaying(false);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      els.forEach((el) => el.pause());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  return { seek: (t: number) => elementsRef.current.forEach((el) => (el.currentTime = t)) };
}
