import JSZip from 'jszip';
import { DrumEvent } from '@/types/drums';
import { AudioAnalysis } from '@/types/audio';
import { StemSeparationResult } from '@/types/stems';
import { GridSubdivision, SnapMode, ProjectFile } from '@/types/project';
import { exportDrumEventsToMidi } from '@/utils/midi';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildProjectFile(
  sourceFileName: string,
  analysis: AudioAnalysis,
  stems: StemSeparationResult | null,
  drumEvents: DrumEvent[],
  grid: { subdivision: GridSubdivision; snap: SnapMode }
): ProjectFile {
  return {
    version: '0.1',
    name: sourceFileName.replace(/\.[^.]+$/, ''),
    createdAt: new Date().toISOString(),
    sourceFileName,
    analysis,
    stems,
    drumEvents,
    grid
  };
}

export function exportProjectJson(project: ProjectFile) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${project.name}.stemforge.json`);
}

export function exportDrumMidi(events: DrumEvent[], bpm: number, name = 'drums') {
  const bytes = exportDrumEventsToMidi(events, bpm);
  // `bytes` is a Uint8Array whose ArrayBufferLike type isn't narrow enough
  // for the DOM lib's BlobPart typing (it also allows SharedArrayBuffer-
  // backed views, which Blob doesn't accept) - copy into a fresh
  // ArrayBuffer-backed Uint8Array to satisfy the type checker safely.
  const arrayBuffer = new Uint8Array(bytes).buffer;
  const blob = new Blob([arrayBuffer], { type: 'audio/midi' });
  downloadBlob(blob, `${name}.mid`);
}

/**
 * EXPORT DRUM PACK: extracts each drum event as an individual audio slice
 * from the drums stem and bundles them into a ZIP organized by category
 * (spec section 15/16).
 */
export async function exportDrumPack(
  drumsBuffer: AudioBuffer,
  events: DrumEvent[],
  projectName: string
): Promise<void> {
  const zip = new JSZip();
  const counters: Record<string, number> = {};

  for (const evt of events) {
    counters[evt.type] = (counters[evt.type] ?? 0) + 1;
    const index = counters[evt.type].toString().padStart(3, '0');
    const folder = evt.type.replace('_', '-');
    const filename = `${folder}/${evt.type}_${index}.wav`;

    const sliceBuffer = sliceAudioBuffer(drumsBuffer, evt.startTime, evt.endTime);
    const wavBytes = audioBufferToWav(sliceBuffer);
    zip.file(filename, wavBytes);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `${projectName}-drum-pack.zip`);
}

export function sliceAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.max(1, Math.round((endSec - startSec) * buffer.sampleRate)),
    buffer.sampleRate
  );
  const startSample = Math.floor(startSec * buffer.sampleRate);
  const endSample = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
  const length = Math.max(1, endSample - startSample);
  const sliced = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch).subarray(startSample, startSample + length);
    sliced.getChannelData(ch).set(src);
  }
  return sliced;
}

/** Minimal 16-bit PCM WAV encoder - no external deps needed for export. */
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
