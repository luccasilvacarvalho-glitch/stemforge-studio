import { ProcessingProgress, ProcessingStage } from '@/types/project';
import { currentStageLabel } from '@/stores/projectStore';

const STAGES: ProcessingStage[] = [
  'uploading',
  'analyzing_audio',
  'separating_stems',
  'analyzing_drums',
  'detecting_bpm',
  'creating_grid',
  'ready'
];

export default function ProcessingStatus({ progress }: { progress: ProcessingProgress }) {
  if (progress.stage === 'idle') return null;

  const currentIndex = STAGES.indexOf(progress.stage);

  return (
    <div className="w-full max-w-xl rounded-xl border border-studio-border bg-studio-panel p-5">
      <ul className="space-y-2">
        {STAGES.map((stage, i) => {
          const isDone = currentIndex > i || progress.stage === 'ready';
          const isCurrent = stage === progress.stage;
          return (
            <li key={stage} className="flex items-center gap-3 text-sm">
              <span
                className={
                  isDone
                    ? 'text-studio-accent'
                    : isCurrent
                    ? 'text-studio-warn'
                    : 'text-studio-textDim'
                }
              >
                {isDone ? '✓' : isCurrent ? '●' : '○'}
              </span>
              <span className={isCurrent ? 'font-medium text-studio-text' : 'text-studio-textDim'}>
                {currentStageLabel(stage).toUpperCase()}
              </span>
              {isCurrent && stage !== 'ready' && (
                <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-studio-panel2">
                  <div
                    className="h-full bg-studio-accent transition-all"
                    style={{ width: `${progress.progressPct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {progress.stage === 'failed' && (
        <p className="mt-3 text-sm text-studio-danger">Erro: {progress.error}</p>
      )}
    </div>
  );
}
