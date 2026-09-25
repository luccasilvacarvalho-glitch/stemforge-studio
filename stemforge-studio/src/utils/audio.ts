import { WaveformPeaks } from '@/types/audio';

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    // Suspend rather than close immediately in case caller reuses it elsewhere.
    ctx.close().catch(() => {});
  }
}

/** Mixes a (possibly multi-channel) AudioBuffer down to a single mono Float32Array. */
export function toMonoFloat32(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return mono;
}

/** Downsample a mono signal into min/max peak pairs for cheap waveform rendering. */
export function computePeaks(samples: Float32Array, samplesPerPixel: number): WaveformPeaks {
  const length = Math.ceil(samples.length / samplesPerPixel);
  const peaks = new Float32Array(length * 2);
  for (let i = 0; i < length; i++) {
    const start = i * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, samples.length);
    let min = 0;
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = samples[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  return { peaks, samplesPerPixel, length };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 100);
  return `${pad(m)}:${pad(s)}.${pad(ms)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
