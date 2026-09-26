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
          title={`${t.title} (ainda não implementado)`}
          disabled
          className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-studio-panel2 text-sm opacity-40"
        >
          {t.icon}
        </button>
      ))}
      <span className="text-[10px] text-studio-textDim">(ferramentas de edição em breve)</span>
      <span className="ml-auto text-xs text-studio-textDim">Zoom</span>
      <span className="text-xs font-mono text-studio-textDim">{zoomLabel}</span>
    </div>
  );
}
