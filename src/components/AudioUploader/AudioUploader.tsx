import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp3'];

export default function AudioUploader({ onFileSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const isAccepted =
        ACCEPTED_TYPES.includes(file.type) || /\.(mp3|wav|flac)$/i.test(file.name);
      if (!isAccepted) {
        setError('Formato não suportado. Envie MP3, WAV ou FLAC.');
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors',
        isDragging ? 'border-studio-accent bg-studio-panel2' : 'border-studio-border bg-studio-panel',
        disabled && 'pointer-events-none opacity-50'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="text-4xl">🎵</div>
      <p className="text-lg font-medium">Arraste uma música aqui</p>
      <p className="text-sm text-studio-textDim">MP3, WAV ou FLAC — ou clique para selecionar</p>
      <button
        type="button"
        className="mt-2 rounded-lg bg-studio-accent px-4 py-2 text-sm font-semibold text-studio-bg hover:opacity-90"
        onClick={() => inputRef.current?.click()}
      >
        Selecionar arquivo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac,audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-sm text-studio-danger">{error}</p>}
    </div>
  );
}
