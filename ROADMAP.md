# Roadmap — StemForge Studio como ambiente de trabalho solo

Objetivo confirmado: **não** é substituir 100% o FL Studio (isso exigiria
suporte a VSTs de terceiros, o que um app web não faz). O objetivo real é
um **ambiente de trabalho próprio, suficiente para uma carreira solo**:
gravar, tratar a voz/instrumentos com autotune e efeitos ajustáveis, tocar
instrumentos básicos, editar a bateria (já existe), e exportar o
resultado. Tudo local, sem depender de plugins de terceiros.

## Fase 1 — Gravação (✅ implementado nesta sessão)

- `AudioRecorderService` (`src/services/audio/AudioRecorderService.ts`):
  captura de microfone via `getUserMedia` + `MediaRecorder`, decodifica
  para `AudioBuffer` e converte para WAV usando o mesmo encoder já usado
  no export de samples.
- `recordingStore` (`src/stores/recordingStore.ts`): estado de gravação,
  lista de tracks gravadas, monitoramento (ouvir a si mesmo em tempo
  real via `enableMonitoring`).
- Atalho `R` e botão ⏺ no `Transport`, com indicador visual de REC e
  status de permissão/processamento.
- Overdub: a gravação começa no `positionSec` atual da timeline
  (`startOffsetSec`), e o playback sincronizado (`useSynchronizedPlayback`)
  já entende esse offset — ou seja, dá pra gravar em cima de uma faixa
  já carregada.
- Gravações aparecem como uma track normal: waveform, mute/solo, mixer,
  export em WAV.

**Limitações atuais, para você saber:**
- Só grava uma entrada de cada vez (sem múltiplas tracks simultâneas
  ainda).
- Não tem punch-in/punch-out (grava do ponto atual até você parar).
- Sem edição de waveform da gravação ainda (cortar, normalizar) — só
  visualização, mute/solo, volume/pan.

## Fase 2 — Efeitos ajustáveis (✅ implementado nesta sessão)

Tudo via Web Audio API nativa (sem VST, sem dependências externas), como planejado:

- **EQ de 3 bandas** (`BiquadFilterNode`: low-shelf, peaking, high-shelf) —
  frequência, ganho e Q ajustáveis por banda.
- **Compressor** (`DynamicsCompressorNode` nativo) — threshold, ratio,
  attack, release, knee.
- **Delay** — `DelayNode` com loop de feedback e mix wet/dry, sincronizável
  manualmente ao tempo da música.
- **Reverb algorítmico** — `ConvolverNode` com impulse response gerada
  proceduralmente (ruído branco com envelope de decaimento exponencial;
  não é uma resposta de sala real amostrada, mas é convolução de verdade,
  não um efeito fake).

Arquitetura: `src/services/audio/effects/EffectChain.ts` monta e mantém a
cadeia de nós de áudio por canal; `src/stores/effectsStore.ts` guarda a
lista de efeitos por canal (chave = nome do stem ou id da gravação);
`src/components/Effects/EffectsRack.tsx` é a interface pra adicionar,
remover, reordenar, ativar/desativar (bypass) e ajustar parâmetros.
Mudar um parâmetro (arrastar um slider) atualiza o `AudioParam` direto
via `setTargetAtTime`, sem reconstruir o grafo de áudio — só muda quando
você adiciona/remove/reordena/liga-desliga um efeito.

**Limitação atual**: o rack de efeitos hoje só aparece pra stems
selecionados (clique num stem na área de Stems). Gravações e canais de
bateria ainda não têm essa interface conectada — é o próximo ajuste
rápido, não uma reconstrução grande.

## Fase 3 — Autotune

Essa é a peça mais técnica. Duas abordagens possíveis, em ordem de
complexidade:

1. **Pitch correction simples** (mais rápido de implementar): detecção
   de pitch em tempo real via autocorrelação (parecido com o que já
   fizemos para BPM, mas em janelas curtas para detectar frequência
   fundamental), e correção via `AudioWorklet` com um algoritmo de
   pitch-shifting tipo PSOLA (Pitch Synchronous Overlap-Add) — mais leve
   e mais fácil de rodar no navegador que uma FFT-based full.
2. **Pitch correction estilo "Auto-Tune clássico"** (correção forte,
   robótica quando exagerada): quantiza o pitch detectado para a nota
   mais próxima da escala escolhida, com uma velocidade de correção
   ajustável (retune speed) — é esse parâmetro que dá o efeito "T-Pain"
   quando baixo, ou correção sutil/transparente quando alto.

Isso roda melhor como um `AudioWorkletProcessor` dedicado
(`src/services/audio/worklets/pitchCorrection.worklet.ts`), processando
em tempo real durante gravação/playback. É a peça que exige mais tempo de
desenvolvimento e testes de qualidade sonora.

## Fase 4 — Instrumentos básicos

Para cobrir "preciso tocar algo simples por cima" sem precisar de um
plugin de synth:

- **Synth básico**: osciladores (`OscillatorNode`: sine, square, saw,
  triangle) + envelope ADSR (via `GainNode` automatizado) + filtro
  (`BiquadFilterNode`) — dá pra fazer bass, pad, lead simples.
- **Sampler simples**: carregar um sample (ou usar um da Sample Library
  que já existe no spec original) e tocar em diferentes pitches via
  `AudioBufferSourceNode.playbackRate`, disparado por MIDI ou pelo
  teclado do computador.
- **Web MIDI API**: se você tiver um teclado MIDI controlador, dá pra
  conectar direto (`navigator.requestMIDIAccess()`) e tocar o synth/
  sampler com ele.

## Fase 5 — Amarrando tudo num fluxo de produção

- Arrangement view: múltiplos clipes de gravação/instrumento numa
  timeline única (não só uma gravação por vez).
- Save/load de projeto persistente (hoje só existe export de snapshot
  em JSON, não um "abrir projeto depois").
- Bounce final: renderizar o mix inteiro (stems + gravações + efeitos +
  instrumentos) num único WAV/MP3 de saída.

## Ordem sugerida para as próximas sessões

1. **Efeitos ajustáveis** (Fase 2) — é a base que o autotune e os
   instrumentos vão usar (mesmo effects chain), e já melhora muito o
   resultado das gravações que você já consegue fazer hoje.
2. **Autotune** (Fase 3) — mais técnico, mas é o pedido mais específico
   pra carreira solo em voz.
3. **Instrumentos básicos** (Fase 4) — depois que a base de efeitos e
   gravação estiver sólida.
4. **Save/load de projeto e arrangement view** (Fase 5) — quando o
   fluxo diário já estiver estabelecido e você sentir falta de "guardar
   e continuar depois" de forma mais robusta que o JSON atual.
