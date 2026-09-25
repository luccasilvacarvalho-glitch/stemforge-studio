# Deploy na Netlify

## 1. Criar o projeto na Netlify

- Acesse [app.netlify.com](https://app.netlify.com) e clique em **Add new site → Import an existing project**.

## 2. Conectar o GitHub

- Suba este repositório para o GitHub (ou GitLab/Bitbucket).
- Na Netlify, selecione o repositório `stemforge-studio`.

## 3. Configurar as variáveis de ambiente

Em **Site settings → Environment variables**, adicione (conforme
`.env.example`):

```
SEPARATION_API_URL
SEPARATION_API_KEY
DRUM_MODEL_API_URL
DRUM_MODEL_API_KEY
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY_ID
STORAGE_SECRET_ACCESS_KEY
STORAGE_BUCKET
```

Sem essas variáveis o app ainda funciona (usando os providers mock/
heurísticos locais) — elas só são necessárias quando você conectar um
motor de IA real.

## 4. Build command

```
npm run build
```

(já configurado em `netlify.toml`)

## 5. Publish directory

```
dist
```

(já configurado em `netlify.toml`)

## 6. Configurar backend/provider

- As Netlify Functions em `netlify/functions/create-job.ts` e
  `job-status.ts` usam [Netlify Blobs](https://docs.netlify.com/blobs/overview/)
  como armazenamento de job — não precisa de banco de dados externo.
- Habilite Netlify Blobs no site (normalmente automático em sites
  criados após 2024).
- Para processamento pesado (>10s), o projeto já está estruturado com
  uma **Background Function** em
  `netlify/background/process-audio-background.ts` (sufixo `-background`
  = timeout de até 15 minutos). Implemente ali a chamada real ao seu
  serviço de separação/transcrição, conforme os comentários `TODO:
  CONNECT REAL MODEL`.

## 7. Deploy

- Clique em **Deploy site**.
- Após o primeiro deploy, cada `git push` na branch principal dispara um
  novo deploy automático.

## Rodando as Functions localmente

```bash
npm install -g netlify-cli
netlify dev
```

Isso sobe o Vite dev server junto com as Functions em
`http://localhost:8888`, já com os redirects de `netlify.toml`
(`/api/jobs` → `/.netlify/functions/create-job`, etc).
