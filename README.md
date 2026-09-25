# StemForge Studio

Um mini estúdio de produção musical no navegador: envie uma música, separe
os stems, analise a bateria (kick, snare, clap, hi-hat, etc.), edite os
eventos detectados num drum grid, e exporte stems, MIDI de bateria, um
sample pack e o projeto completo em JSON.

Este repositório implementa o **MVP** descrito na prioridade do projeto:
funcionamento real primeiro, interface depois, recursos avançados por
último.

## O que é processamento real vs. mock/fallback

Seja honesto sobre isso é uma exigência do próprio projeto (seção 31 do
spec). Aqui está o estado atual:

| Parte | Status | Onde |
|---|---|---|
| Detecção de BPM | **Real** (DSP: onset detection + autocorrelação) | `src/utils/bpm.ts`, `src/providers/AudioAnalysis/WebAudioAnalysisProvider.ts` |
| Grid musical / snapping | **Real** (cálculo determinístico) | `src/utils/grid.ts` |
| Waveform | **Real** (peaks calculados do áudio decodificado) | `src/utils/audio.ts`, `src/components/Waveform` |
| Separação de stems (vocals/drums/bass/other) | **Mock** — devolve o áudio original como "stem" | `src/providers/StemSeparation/MockStemSeparationProvider.ts` |
| Transcrição de bateria (kick/snare/clap/hi-hat...) | **Heurística real de DSP** (onset + análise espectral + classificador por regras), não um modelo treinado | `src/providers/DrumTranscription/HeuristicDrumProvider.ts` |
| Exportação (WAV, MIDI, ZIP, JSON) | **Real** — gera arquivos de verdade a partir dos dados acima | `src/services/export/exportService.ts` |
| Job queue assíncrono (Netlify Functions) | **Contrato pronto, execução ainda stub** | `netlify/functions/`, `netlify/background/` |

Todo ponto que ainda depende de um modelo de IA externo está marcado no
código com `TODO: CONNECT REAL MODEL`.

## Arquitetura

```
Frontend (React + TS + Vite + Tailwind)
  └─ AudioProcessingEngine (services/audio)
       ├─ StemSeparationProvider   (providers/StemSeparation)
       ├─ DrumTranscriptionProvider (providers/DrumTranscription)
       └─ AudioAnalysisProvider    (providers/AudioAnalysis)

Backend (Netlify Functions)
  ├─ create-job   → cria job, dispara background function
  ├─ job-status   → consulta status/outputs
  └─ background/process-audio-background → trabalho pesado (>10s)
```

O `AudioProcessingEngine` não conhece React nem a UI: ele só depende das
interfaces `*Provider`. Isso permite trocar o `MockStemSeparationProvider`
por um `RemoteDemucsProvider` real (já implementado em
`RemoteDemucsProvider.ts`, esperando a API configurada) sem tocar em
nenhum componente.

## Interface (redesign em andamento)

A interface foi reconstruída pra se aproximar de uma referência visual
enviada pelo usuário (layout com navegação lateral, editor de bateria por
abas, mixer expandido com canais individuais por instrumento de bateria,
painel de detalhes à direita). Pontos a saber:

- **Funcional**: navegação entre views (Visão Geral, Stems, Editor de
  Bateria, Samples, Exportar, Configurações), fader de cada stem em dB,
  aba por instrumento de bateria com volume/pan/mute/solo reais, grid
  sempre mostrando todas as categorias, quantizar/limpar por instrumento,
  "Detectar eventos" (roda a heurística de novo), mixer com canal Master
  + stems + gravações + canais de bateria individuais, análise de bateria
  com confiança por categoria.
- **Só visual por enquanto**: os ícones da toolbar de edição (seleção,
  lápis, split, seleção livre) ainda não têm funcionalidade — são
  placeholders pra próxima etapa. A waveform mostrada no Editor de
  Bateria é o stem de bateria inteiro (ainda não temos isolamento por
  instrumento individual). A aba "Samples" é só um aviso do roadmap.
  O dropdown de "Sample" por instrumento (ex: kick_default) ainda não
  troca o som de fato — é preparação de UI pra quando a Biblioteca de
  Samples existir.

## Gravação

Já implementado (veja `ROADMAP.md` para as próximas fases — efeitos,
autotune, instrumentos):

- Botão ⏺ ou atalho `R` na barra de transporte
- Botão 🎧 liga o monitoramento (ouvir a si mesmo enquanto grava)
- A gravação começa na posição atual da timeline, então dá pra fazer
  overdub em cima de stems já carregados
- Toda gravação vira uma track normal: aparece na seção "Recordings",
  no mixer (mute/solo/volume/pan) e pode ser exportada em WAV

100% local — usa `getUserMedia` + `MediaRecorder` do navegador, sem
nenhum serviço externo.

## Roadmap

Veja [`ROADMAP.md`](./ROADMAP.md) para o plano de evolução do projeto
rumo a um ambiente de trabalho completo para produção solo (efeitos
ajustáveis, autotune, instrumentos básicos).

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Sem nenhuma variável de ambiente
configurada, o app funciona 100% localmente usando os providers
mock/heurísticos — você pode fazer upload de uma música, ver BPM
detectado, waveform, "separação" (passthrough) de stems, detecção de
eventos de bateria, editar no drum grid e exportar tudo.

```bash
npm run build      # build de produção
npm run preview    # servir o build localmente
npm test           # rodar os testes (vitest)
```

## Como conectar o modelo de separação de stems (Demucs ou equivalente)

1. Suba um serviço de inferência compatível com Demucs (ex: um endpoint
   no Replicate, um servidor próprio com `demucs` rodando atrás de uma
   API HTTP, etc).
2. Configure `SEPARATION_API_URL` e `SEPARATION_API_KEY` (veja
   `.env.example`) — nunca no frontend, sempre nas env vars da Netlify.
3. Implemente a chamada real dentro de
   `netlify/background/process-audio-background.ts` (os TODOs já indicam
   onde).
4. No frontend, troque `MockStemSeparationProvider` por
   `RemoteDemucsProvider` em `src/stores/projectStore.ts`.

## Como conectar o modelo de transcrição de bateria

1. Se você tiver um modelo de ADT (automatic drum transcription) servido
   via API, configure `DRUM_MODEL_API_URL` / `DRUM_MODEL_API_KEY`.
2. Implemente um novo `RemoteDrumProvider implements DrumTranscriptionProvider`
   em `src/providers/DrumTranscription/`, seguindo o mesmo contrato do
   `HeuristicDrumProvider`.
3. Troque a instância em `src/stores/projectStore.ts`.
4. Sem isso, o `HeuristicDrumProvider` (onset detection + classificação
   espectral por regras) continua funcionando como fallback — com scores
   de confiança mais conservadores, já que não é um modelo treinado.

## Estrutura do projeto

Veja `docs/ARCHITECTURE.md` para o detalhamento completo. Resumo:

```
src/
  components/   UI (uploader, waveform, drum grid, mixer, export...)
  pages/Studio  Layout principal
  services/     AudioProcessingEngine, playback, export
  providers/    Adapters de IA (stem separation, drum transcription, analysis)
  stores/       Zustand (project, audio/transport, drums)
  types/        Tipos compartilhados
  utils/        BPM, grid, MIDI, helpers de áudio
netlify/
  functions/    create-job, job-status
  background/   process-audio-background (stub)
```

## Publicar na Netlify

Veja [`DEPLOY.md`](./DEPLOY.md).

## Limitações conhecidas (honestas, de propósito)

- A separação de stems é um **passthrough mock** até você conectar um
  motor real — isso é visível na UI (`⚠ mock`).
- A classificação de bateria é uma heurística de sinal, não um modelo
  treinado; funciona razoavelmente bem em bateria "seca" e isolada, mas
  erra mais em material denso ou com muito bleed de outros instrumentos.
  Por isso toda a correção manual (seção 12 do spec original) é
  obrigatória e sempre disponível.
- Detecção de compasso assume 4/4 fixo; downbeat assume que o primeiro
  onset forte é o beat 1.
- O job queue da Netlify está com o contrato pronto (create-job /
  job-status / background function) mas a chamada real ao modelo externo
  ainda não está implementada — ver TODOs.
