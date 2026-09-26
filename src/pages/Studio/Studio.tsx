import { useState } from 'react';
import AudioUploader from '@/components/AudioUploader/AudioUploader';
import ProcessingStatus from '@/components/AudioUploader/ProcessingStatus';
import StemTrack from '@/components/StemTrack/StemTrack';
import RecordedTrackRow from '@/components/StemTrack/RecordedTrackRow';
import DrumEditorPanel from '@/components/DrumEditor/DrumEditorPanel';
import MixerBar from '@/components/Mixer/MixerBar';
import ExportPanel from '@/components/ExportPanel/ExportPanel';
import TopBar from '@/components/Layout/TopBar';
import EditToolbar from '@/components/Layout/EditToolbar';
import Sidebar, { StudioView } from '@/components/Layout/Sidebar';
import DetailsSidebar from '@/components/Layout/DetailsSidebar';
import { useProjectStore } from '@/stores/projectStore';
import { useDrumStore } from '@/stores/drumStore';
import { useRecordingStore } from '@/stores/recordingStore';
import { useSynchronizedPlayback } from '@/services/audio/useSynchronizedPlayback';
import { Stem, StemName } from '@/types/stems';

export default function Studio() {
  const { fileName, stems, progress, loadFile } = useProjectStore();
  const { events } = useDrumStore();
  const { tracks: recordings, updateTrackStrip: updateRecordingStrip } = useRecordingStore();
  const [selectedStem, setSelectedStem] = useState<StemName | null>(null);
  const [view, setView] = useState<StudioView>('overview');
  const [startedBlank, setStartedBlank] = useState(false);
  useSynchronizedPlayback(stems, recordings);

  const stemList: Stem[] = stems
    ? (Object.values(stems).filter((s) => s && typeof s === 'object' && 'fileUrl' in s) as Stem[])
    : [];

  const isReady = progress.stage === 'ready';
  // A blank project (recording-only, no uploaded song) shows the same
  // workstation shell, just without any stems/drum-analysis content.
  const showWorkstation = isReady || startedBlank;

  function handleMixerChange(id: string, patch: Partial<Stem['strip']>) {
    if (stemList.some((s) => s.name === id)) {
      updateStemStrip(id, patch);
    } else {
      updateRecordingStrip(id, patch);
    }
  }

  function updateStemStrip(name: string, patch: Partial<Stem['strip']>) {
    const current = useProjectStore.getState().stems;
    if (!current) return;
    const stem = (current as any)[name] as Stem | undefined;
    if (!stem) return;
    const updated = { ...current, [name]: { ...stem, strip: { ...stem.strip, ...patch } } };
    useProjectStore.setState({ stems: updated as any });
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={view} onChangeView={setView} />

        <main className="flex flex-1 flex-col overflow-hidden">
          {!fileName && !startedBlank && (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="w-full max-w-xl space-y-4">
                <AudioUploader onFileSelected={loadFile} />
                <div className="flex items-center gap-3 text-xs text-studio-textDim">
                  <div className="h-px flex-1 bg-studio-border" />
                  ou
                  <div className="h-px flex-1 bg-studio-border" />
                </div>
                <button
                  onClick={() => setStartedBlank(true)}
                  className="w-full rounded-lg border border-studio-border bg-studio-panel2 py-3 text-sm font-medium hover:bg-studio-border"
                >
                  🎙️ Começar do zero (gravar sem enviar nenhuma música)
                </button>
              </div>
            </div>
          )}

          {fileName && !isReady && (
            <div className="flex flex-1 items-center justify-center p-4">
              <ProcessingStatus progress={progress} />
            </div>
          )}

          {showWorkstation && (
            <>
              {(view === 'overview' || view === 'stems') && <EditToolbar />}

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {stems?.isMock && (view === 'overview' || view === 'stems') && (
                  <div className="rounded-lg border border-studio-warn/40 bg-studio-warn/10 px-3 py-2 text-xs text-studio-warn">
                    ⚠ Estes stems são um <strong>mock</strong>: hoje o app copia o mesmo áudio
                    original em Vocals/Drums/Bass/Other — ainda não há separação de fato.
                    Mutar/isolar um "stem" não isola o som de verdade até conectarmos um modelo
                    real (veja Configurações → Providers ativos, e o README).
                  </div>
                )}

                {(view === 'overview' || view === 'stems') && (
                  <section className="flex flex-col gap-2">
                    {stemList.map((stem) => (
                      <StemTrack
                        key={stem.id}
                        stem={stem}
                        isSelected={selectedStem === stem.name}
                        onSelect={() => setSelectedStem(stem.name)}
                        onToggleMute={() => updateStemStrip(stem.name, { mute: !stem.strip.mute })}
                        onToggleSolo={() => updateStemStrip(stem.name, { solo: !stem.strip.solo })}
                      />
                    ))}
                    {recordings.map((rec) => (
                      <RecordedTrackRow key={rec.id} track={rec} />
                    ))}
                    {stemList.length === 0 && recordings.length === 0 && (
                      <p className="text-sm text-studio-textDim">
                        Nenhuma track ainda. Aperte ⏺ (ou tecla R) na barra de transporte pra
                        gravar algo.
                      </p>
                    )}
                  </section>
                )}

                {view === 'drum-editor' &&
                  (stems?.drums ? (
                    <>
                      <div className="rounded-lg border border-studio-warn/40 bg-studio-warn/10 px-3 py-2 text-xs text-studio-warn">
                        ⚠ A detecção de bateria roda hoje em cima do stem de bateria <em>mock</em>
                        {' '}(= a música inteira, não só a bateria isolada), então instrumentos
                        que tocam nas mesmas frequências podem ser classificados errado. A
                        precisão mostrada ao lado reflete isso.
                      </div>
                      {events.length === 0 ? (
                        <p className="text-sm text-studio-textDim">
                          Nenhum evento de bateria detectado ainda. Use "Detectar eventos" no
                          Editor de Bateria.
                        </p>
                      ) : (
                        <DrumEditorPanel />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-studio-textDim">
                      Nenhum stem de bateria disponível — envie uma música primeiro (a gravação
                      do zero não passa pela análise de bateria).
                    </p>
                  ))}

                {view === 'samples' && (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="max-w-sm text-center text-sm text-studio-textDim">
                      🎧 Biblioteca de Samples ainda não implementada — está no roadmap
                      (próxima fase, junto com efeitos ajustáveis e autotune). Por enquanto
                      você pode extrair amostras de bateria via "Export Drum Pack" na aba
                      Exportar.
                    </p>
                  </div>
                )}

                {view === 'export' && (
                  <div className="max-w-md">
                    <ExportPanel />
                  </div>
                )}

                {view === 'settings' && <SettingsPanel />}

                {(view === 'overview' || view === 'stems' || view === 'drum-editor') &&
                  (stemList.length > 0 || recordings.length > 0) && (
                    <MixerBar
                      stems={stemList}
                      recordings={recordings}
                      onChangeStemStrip={handleMixerChange}
                    />
                  )}
              </div>
            </>
          )}
        </main>

        {showWorkstation && <DetailsSidebar selectedStemName={selectedStem} />}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { stems } = useProjectStore();
  const { isMock: drumIsMock } = useDrumStore();

  return (
    <div className="max-w-lg space-y-3 text-sm">
      <h3 className="text-xs font-bold uppercase text-studio-textDim">Configurações</h3>
      <div className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
        <p className="mb-1 font-medium">Providers ativos</p>
        <ul className="space-y-1 text-studio-textDim">
          <li>
            Separação de stems: {stems?.isMock ? '⚠ Mock (passthrough local)' : '✓ Modelo real'}
          </li>
          <li>
            Transcrição de bateria:{' '}
            {drumIsMock ? '⚠ Heurística local (onset + espectral)' : '✓ Modelo real'}
          </li>
        </ul>
      </div>
      <div className="rounded-lg border border-studio-border bg-studio-panel2 p-3">
        <p className="mb-1 font-medium">Canais de bateria no Mixer</p>
        <p className="text-studio-textDim">
          ⚠ Os faders individuais de Kick/Snare/Clap/etc. no Mixer ainda não controlam áudio de
          verdade — não existe isolamento de áudio por instrumento de bateria ainda (isso
          depende de um modelo real de separação ou de re-síntese via MIDI). Eles preparam a
          interface pra quando isso existir.
        </p>
      </div>
      <p className="text-xs text-studio-textDim">
        Para conectar modelos reais, configure as variáveis de ambiente descritas em{' '}
        <code>.env.example</code> e troque os providers em{' '}
        <code>src/stores/projectStore.ts</code>. Veja o README para o passo a passo.
      </p>
    </div>
  );
}
