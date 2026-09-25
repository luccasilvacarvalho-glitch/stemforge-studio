# Arquitetura — StemForge Studio

## Visão geral

```
                          ┌───────────────────────────┐
                          │        Frontend (SPA)      │
                          │  React + TS + Vite + Tailwind │
                          └──────────────┬─────────────┘
                                         │
                     usa apenas interfaces, nunca implementações
                                         │
                          ┌──────────────▼─────────────┐
                          │   AudioProcessingEngine     │
                          │ (services/audio) - sem UI   │
                          └───┬───────────┬────────────┬┘
                              │           │            │
                 ┌────────────▼┐  ┌───────▼──────┐ ┌───▼──────────────┐
                 │StemSeparation│  │DrumTranscription│ │AudioAnalysis    │
                 │  Provider    │  │   Provider      │ │  Provider       │
                 └──────┬───────┘  └───────┬─────────┘ └───────┬─────────┘
                        │                  │                   │
             ┌──────────┴───────┐  ┌───────┴────────┐  ┌───────┴──────────┐
             │Mock (passthrough)│  │Heuristic (onset +│  │WebAudio (onset + │
             │RemoteDemucs      │  │spectral classif.)│  │autocorrelação)   │
             │(stub → API real) │  │                  │  │                  │
             └──────────────────┘  └──────────────────┘  └──────────────────┘
```

O objetivo dessa camada de adapters é permitir trocar qualquer motor de
IA (separação de stems, transcrição de bateria) sem tocar em componentes
React, stores ou lógica de export. Toda a UI só conhece os tipos em
`src/types/`, nunca a implementação concreta do provider.

## Fluxo de dados (upload → export)

1. `AudioUploader` recebe o arquivo → chama `useProjectStore.loadFile(file)`
2. `projectStore` chama `AudioProcessingEngine.processFile(file, onProgress)`
3. O engine, em sequência:
   - decodifica o áudio (`decodeAudioFile`)
   - roda `AudioAnalysisProvider.analyze()` → BPM, compasso, beats
   - roda `StemSeparationProvider.separate()` → vocals/drums/bass/other
   - re-decodifica o stem de drums e roda `DrumTranscriptionProvider.transcribe()`
   - reporta progresso em cada etapa via callback (`ProcessingProgress`)
4. Os resultados alimentam `projectStore` (stems, BPM) e `drumStore` (eventos)
5. `Studio.tsx` renderiza waveforms, drum grid, mixer, export panel a partir
   desses stores
6. Edição manual no `DrumGrid` atualiza `drumStore` (com histórico
   undo/redo)
7. `ExportPanel` lê `projectStore` + `drumStore` e gera os arquivos via
   `services/export/exportService.ts`

## Processamento assíncrono (Netlify)

Quando um provider remoto (ex: `RemoteDemucsProvider`) estiver em uso, o
fluxo muda para:

```
Frontend → POST /api/jobs (create-job.ts) → cria job em Netlify Blobs
Frontend → dispara Background Function (process-audio-background.ts)
Frontend → GET /api/jobs/:id (job-status.ts) [polling a cada 2s]
                → quando status = "completed", outputs contém o resultado
```

Isso evita rodar modelos pesados dentro do limite de 10s de uma function
síncrona da Netlify.

## Por que os stems ficam como `Stem` com `ChannelStrip` embutido

Cada stem carrega seu próprio estado de mixagem (`volume`, `mute`,
`solo`, `pan`, `gainDb`) para que o `Mixer` e o `StemTrack` sejam puros:
eles só leem/escrevem esse objeto, sem estado paralelo duplicado em
outro lugar.

## Extensibilidade prevista (seção 21 do spec original)

Novos providers a adicionar seguindo o mesmo contrato:
- `CloudDrumProvider`, `ReplicateProvider`, `HuggingFaceProvider`,
  `CustomModelProvider` → implementam `DrumTranscriptionProvider` ou
  `StemSeparationProvider`
- Basta trocar a instância usada em `src/stores/projectStore.ts`
