import { useEffect, useRef } from 'react';
import { WaveformPeaks } from '@/types/audio';

interface Props {
  peaks?: WaveformPeaks;
  color?: string;
  height?: number;
  positionSec?: number;
  durationSec?: number;
}

/**
 * Renders a stem's waveform on a <canvas> from pre-computed min/max peaks
 * (see utils/audio.ts#computePeaks). Canvas is used instead of drawing
 * every sample so long songs stay responsive (spec section 24).
 */
export default function Waveform({ peaks, color = '#5eead4', height = 64, positionSec = 0, durationSec = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) {
      ctx.strokeStyle = '#2a2a2e';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const mid = height / 2;
    const step = peaks.length / width;
    ctx.fillStyle = color;

    for (let x = 0; x < width; x++) {
      const peakIndex = Math.floor(x * step);
      const min = peaks.peaks[peakIndex * 2] ?? 0;
      const max = peaks.peaks[peakIndex * 2 + 1] ?? 0;
      const yMin = mid - max * mid;
      const yMax = mid - min * mid;
      ctx.fillRect(x, yMin, 1, Math.max(1, yMax - yMin));
    }

    if (durationSec > 0) {
      const playheadX = (positionSec / durationSec) * width;
      ctx.strokeStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [peaks, color, height, positionSec, durationSec]);

  return <canvas ref={canvasRef} className="w-full" style={{ height }} />;
}
