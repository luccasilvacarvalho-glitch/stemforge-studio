import { useState } from 'react';
import { useDrumStore } from '@/stores/drumStore';
import { useAudioStore } from '@/stores/audioStore';
import { useProjectStore } from '@/stores/projectStore';
import { useRecordingStore } from '@/stores/recordingStore';
import {
  buildProjectFile,
  exportDrumMidi,
  exportProjectJson,
  exportDrumPack,
  downloadBlob,
  audioBufferToWav
} from '@/services/export/exportService';
import { decodeAudioFile } from '@/utils/audio';

export default function ExportPanel() {
  const { events } = useDrumStore();
  const { bpm } = useAudioStore();
  const { analysis, stems, fileName, gridSubdivision, snapMode } = useProjectStore();
  const { tracks: recordings } = useRecordingStore();
  const [busy, setBusy] = useState<string | null>(null);

  const canExport = !!analysis && !!fileName;

  async function handleExportStems(format: 'wav') {
    if (!stems) return;
    setBusy('stems');
    try {
      for (const stem of Object.values(stems)) {
        if (!stem || typeof stem !== 'object' || !('fileUrl' in stem)) continue;
        const res = await fetch((stem as any).fileUrl);
        const blob = await res.blob();
        downloadBlob(blob, `${(stem as any).name}.${format}`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleExportRecordings() {
    if (recordings.length === 0) return;
    setBusy('recordings');
    try {
      for (const rec of recordings) {
        const res = await fetch(rec.fileUrl);
        const blob = await res.blob();
        const safeName = rec.label.replace(/[^a-z0-9-_]+/gi, '_');
        downloadBlob(blob, `${safeName}.wav`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleExportDrumPack() {
    if (!stems?.drums) return;
    setBusy('pack');
    try {
      const res = await fetch(stems.drums.fileUrl);
      const blob = await res.blob();
      const buffer = await decodeAudioFile(new File([blob], 'drums.wav'));
      await exportDrumPack(buffer, events, fileName?.replace(/\.[^.]+$/, '') ?? 'project');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-studio-border bg-studio-panel p-4">
      <h3 className="text-sm font-bold uppercase text-studio-textDim">Export</h3>

      <ExportButton
        label="Export Stems (WAV)"
        disabled={!canExport || !stems}
        loading={busy === 'stems'}
        onClick={() => handleExportStems('wav')}
      />
      <ExportButton
        label="Export Recordings (WAV)"
        disabled={recordings.length === 0}
        loading={busy === 'recordings'}
        onClick={handleExportRecordings}
      />
      <ExportButton
        label="Export Drum MIDI"
        disabled={!canExport || events.length === 0}
        onClick={() => exportDrumMidi(events, bpm, fileName?.replace(/\.[^.]+$/, ''))}
      />
      <ExportButton
        label="Export Project Data (JSON)"
        disabled={!canExport}
        onClick={() => {
          if (!analysis || !fileName) return;
          const project = buildProjectFile(fileName, analysis, stems, events, {
            subdivision: gridSubdivision,
            snap: snapMode
          });
          exportProjectJson(project);
        }}
      />
      <ExportButton
        label="Export Drum Pack (ZIP)"
        disabled={!canExport || events.length === 0}
        loading={busy === 'pack'}
        onClick={handleExportDrumPack}
      />
    </div>
  );
}

function ExportButton({
  label,
  onClick,
  disabled,
  loading
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="rounded-md bg-studio-panel2 px-3 py-2 text-left text-sm hover:bg-studio-border disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? 'Exportando…' : label}
    </button>
  );
}
