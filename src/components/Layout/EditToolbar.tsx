interface Props {
  zoomLabel?: string;
}

const TOOLS = [
  { icon: '↖', title: 'Selecionar' },
  { icon: '✎', title: 'Desenhar evento' },
  { icon: '✂', title: 'Split' },
  { icon: '⬡', title: 'Seleção livre' },
  { icon: '✨', title: 'Detecção automática' }
];

export default function EditToolbar({ zoomLabel = '1:1' }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-studio-border bg-studio-panel px-3 py-2">
      {TOOLS.map((t) => (
        <button
          key={t.title}
          title={t.title}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-studio-panel2 text-sm hover:bg-studio-border"
        >
          {t.icon}
        </button>
      ))}
      <span className="ml-auto text-xs text-studio-textDim">Zoom</span>
      <span className="text-xs font-mono text-studio-textDim">{zoomLabel}</span>
    </div>
  );
}
