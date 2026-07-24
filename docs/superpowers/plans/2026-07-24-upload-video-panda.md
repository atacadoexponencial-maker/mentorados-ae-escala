# Upload de Vídeo no App (Entrega 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O mentorado (e o admin) envia o arquivo de vídeo pelo app; o navegador sobe direto pro Panda (chave no servidor), com status ao vivo e organização em pastas App/Mentorado/Módulo.

**Architecture:** Upload TUS em dois passos — o backend cria o slot (com `PANDA_API_KEY`) e devolve a URL; o navegador dá PATCH do arquivo nessa URL via `tus-js-client`. Pastas no Panda criadas sob demanda. Status/duração por polling de uma action que consulta o Panda.

**Tech Stack:** Next.js 16 (server actions + route handlers), TypeScript, Supabase, Panda Video API (`api-v2.pandavideo.com.br` + hosts de upload TUS), `tus-js-client`.

> **Decisão da Task 1 (2026-07-24): CORS DIRETO OK.** Probe no navegador (localhost) deu PATCH no slot do Panda com status 204 e `upload-offset: 3`. Upload direto navegador→Panda é viável; **não** usar proxy. Pasta raiz do app criada: `PANDA_ROOT_FOLDER_ID=4356755d-6f5d-4c60-8a14-5c24240ce25a` (no `.env`). Campo do id de pasta na resposta: `id`.

## Global Constraints

- `PANDA_API_KEY` **nunca** vai ao cliente nem ao bundle: só em código server-only. `NEXT_PUBLIC_*` é o único prefixo exposto.
- Escrita/autorização no backend; reusar `exigirEscopoConteudo` + `conteudoNoEscopo` (Entrega 1) nas novas actions.
- `types.ts` auto-gerado; ajustar como nas entregas anteriores (Docker indisponível).
- Migrations via `npx supabase db push --db-url "$SUPABASE_DB_URL"`.
- Este Next tem breaking changes; consultar `node_modules/next/dist/docs/` antes de padrões novos.
- Verificação: `npm run lint` + `npm run build` + Playwright. Execução mexe na conta REAL do Panda (cria pastas, sobe vídeo) — avisar a usuária antes.
- UI em pt-BR.

---

### Task 1: Spike de CORS + pasta raiz do app no Panda (GATE)

**Files:**
- Create (temporário): `_tmp_panda_setup.mjs` (raiz; apagar após uso)
- Modify: `.env` (adicionar `PANDA_ROOT_FOLDER_ID`)

**Interfaces:**
- Produces: `PANDA_ROOT_FOLDER_ID` no `.env`; decisão documentada direto-vs-proxy.

- [ ] **Step 1: Criar a pasta raiz e um slot de teste (script)**

Escrever `_tmp_panda_setup.mjs` que lê `PANDA_API_KEY` do `.env` e:
1. `POST https://api-v2.pandavideo.com.br/folders` `{ name: 'AE Escala (app)' }` (header `Authorization: <key>`) → imprime o `id` da pasta raiz.
2. `GET https://api-v2.pandavideo.com.br/hosts/uploader` → pega um host.
3. `POST https://{host}.pandavideo.com.br/files` com headers `Tus-Resumable: 1.0.0`, `Upload-Length: 10`, `Upload-Metadata: authorization <b64(key)>, filename <b64("probe.bin")>, video_id <b64(uuid)>` → imprime o header `location`.

Rodar (cópia p/ raiz, padrão da sessão). Anotar o `id` da raiz e a `location`.

- [ ] **Step 2: Guardar o id da raiz**

Adicionar ao `.env`: `PANDA_ROOT_FOLDER_ID=<id impresso>`.

- [ ] **Step 3: Probe de CORS no navegador (Playwright)**

Com o dev server no ar e a `location` do Step 1, abrir `http://localhost:3000` no Playwright e executar via `browser_evaluate`:

```js
async () => {
  try {
    const r = await fetch(LOCATION, {
      method: 'PATCH',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': '0',
        'Content-Type': 'application/offset+octet-stream',
      },
      body: new Uint8Array([1,2,3]),
    })
    return { ok: true, status: r.status }
  } catch (e) { return { ok: false, error: String(e) } }
}
```

(substituir `LOCATION` pela URL real). Se retornar status HTTP (mesmo 4xx de offset) sem erro de CORS → **upload direto viável**. Se der `TypeError: Failed to fetch`/CORS → **usar proxy** (plano B).

- [ ] **Step 4: Registrar a decisão**

Anotar no topo do plano (comentário/commit) "CORS direto: OK" ou "CORS bloqueado: proxy". As Tarefas 4-5 assumem **direto**; se proxy, ajustar a Tarefa 4 para uma rota que recebe o arquivo e faz o PATCH no servidor (documentado na própria Tarefa 4).

- [ ] **Step 5: Limpar e commitar a nota**

Remover `_tmp_panda_setup.mjs`. Commit:

```bash
git add .env.example 2>/dev/null; git commit --allow-empty -m "chore: pasta raiz do Panda + spike de CORS (decisao: <direto|proxy>)"
```

(`.env` não é versionado; o commit registra só a decisão.)

---

### Task 2: Migration — pastas e status de vídeo

**Files:**
- Create: `supabase/migrations/20260724110000_panda_pastas_status.sql`
- Modify: `src/integrations/supabase/types.ts`

- [ ] **Step 1: Migration**

```sql
ALTER TABLE public.espacos ADD COLUMN panda_folder_id TEXT;
ALTER TABLE public.modulos ADD COLUMN panda_folder_id TEXT;
ALTER TABLE public.aulas   ADD COLUMN video_status TEXT; -- 'processando' | 'pronto'; null = sem video/legado
```

- [ ] **Step 2: Aplicar**

Run: `DBURL=$(grep '^SUPABASE_DB_URL=' .env | cut -d= -f2-) && npx supabase db push --db-url "$DBURL"`
Expected: aplica sem erro.

- [ ] **Step 3: Tipos**

Ajustar `types.ts`: `panda_folder_id: string | null` em Row/Insert/Update de `espacos` e `modulos`; `video_status: string | null` em Row/Insert/Update de `aulas` (padrão da sessão: `?` no Insert/Update).

- [ ] **Step 4: Build + commit**

Run: `npm run build` (esperado: verde).
```bash
git add supabase/migrations/20260724110000_panda_pastas_status.sql src/integrations/supabase/types.ts
git commit -m "feat: colunas panda_folder_id (espacos/modulos) e video_status (aulas)"
```

---

### Task 3: Cliente Panda (server-only)

**Files:**
- Create: `src/integrations/panda/server.ts`

**Interfaces:**
- Produces:
  - `garantirPastaModulo(moduloId: string): Promise<string>`
  - `criarSlotUpload(input: { folderId: string; filename: string; size: number }): Promise<{ uploadUrl: string; videoId: string }>`
  - `propriedadesVideo(videoId: string): Promise<{ status: string; duracaoSegundos: number | null }>`

- [ ] **Step 1: Base do cliente**

Criar `src/integrations/panda/server.ts` com `import 'server-only'`, lendo `process.env.PANDA_API_KEY` e `process.env.PANDA_ROOT_FOLDER_ID`. Helper interno:

```ts
const API = 'https://api-v2.pandavideo.com.br'
async function pandaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: process.env.PANDA_API_KEY ?? '', 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Panda ${path} -> ${res.status}`)
  return res
}
```

- [ ] **Step 2: `garantirPastaModulo`**

```ts
import { createAdminClient } from '@/integrations/supabase/admin'

async function criarPasta(name: string, parentFolderId: string): Promise<string> {
  const res = await pandaFetch('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parent_folder_id: parentFolderId }),
  })
  const data = await res.json()
  return data.id ?? data.folder_id // confirmar o nome do campo na resposta real
}

export async function garantirPastaModulo(moduloId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: modulo } = await admin
    .from('modulos')
    .select('id, titulo, espaco_id, panda_folder_id')
    .eq('id', moduloId)
    .single()
  if (modulo.panda_folder_id) return modulo.panda_folder_id

  const raiz = process.env.PANDA_ROOT_FOLDER_ID as string
  let parent = raiz
  if (modulo.espaco_id) {
    const { data: espaco } = await admin
      .from('espacos')
      .select('id, nome_curso, panda_folder_id')
      .eq('id', modulo.espaco_id)
      .single()
    parent = espaco.panda_folder_id ?? (await criarPasta(espaco.nome_curso, raiz))
    if (!espaco.panda_folder_id) {
      await admin.from('espacos').update({ panda_folder_id: parent }).eq('id', espaco.id)
    }
  }
  const folderId = await criarPasta(modulo.titulo, parent)
  await admin.from('modulos').update({ panda_folder_id: folderId }).eq('id', modulo.id)
  return folderId
}
```

- [ ] **Step 3: `criarSlotUpload`**

```ts
import { randomUUID } from 'node:crypto'
const b64 = (s: string) => Buffer.from(s).toString('base64')

export async function criarSlotUpload({ folderId, filename, size }: { folderId: string; filename: string; size: number }) {
  const hostsRes = await pandaFetch('/hosts/uploader')
  const hostsData = await hostsRes.json()
  const all = Object.values(hostsData.hosts).flat() as string[]
  const host = all[Math.floor(Math.random() * all.length)]

  const videoId = randomUUID()
  const key = process.env.PANDA_API_KEY ?? ''
  const metadata = [
    `authorization ${b64(key)}`,
    `folder_id ${b64(folderId)}`,
    `filename ${b64(filename)}`,
    `video_id ${b64(videoId)}`,
  ].join(', ')

  const res = await fetch(`https://${host}.pandavideo.com.br/files`, {
    method: 'POST',
    headers: { 'Tus-Resumable': '1.0.0', 'Upload-Length': String(size), 'Upload-Metadata': metadata },
  })
  const uploadUrl = res.headers.get('location')
  if (!uploadUrl) throw new Error('Panda não retornou location')
  return { uploadUrl, videoId }
}
```

- [ ] **Step 4: `propriedadesVideo`**

```ts
export async function propriedadesVideo(videoId: string): Promise<{ status: string; duracaoSegundos: number | null }> {
  const res = await pandaFetch(`/videos/${videoId}`)
  const v = await res.json()
  // CONFIRMAR contra a resposta real: nome do campo de status e de duração.
  return { status: v.status, duracaoSegundos: v.length ?? v.duration ?? null }
}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` (verde).
```bash
git add src/integrations/panda/server.ts
git commit -m "feat: cliente server-only do Panda (pastas, slot de upload, status)"
```

---

### Task 4: Server actions de upload e status

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/actions.ts`

**Interfaces:**
- Produces:
  - `iniciarUploadVideo(aulaId, filename, size): Promise<{ ok: boolean; erro?: string; uploadUrl?: string; videoId?: string }>`
  - `sincronizarStatusVideo(aulaId): Promise<{ status: 'processando' | 'pronto' | 'sem-video' }>`

- [ ] **Step 1: `iniciarUploadVideo`**

Adicionar em `actions.ts` (reusa escopo/posse; resolve a pasta e cria o slot):

```ts
import { garantirPastaModulo, criarSlotUpload, propriedadesVideo } from '@/integrations/panda/server'

export async function iniciarUploadVideo(aulaId: string, filename: string, size: number) {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }
  const admin = createAdminClient()
  const { data: aula } = await admin.from('aulas').select('id, modulo_id').eq('id', aulaId).single()
  const folderId = await garantirPastaModulo(aula.modulo_id)
  const { uploadUrl, videoId } = await criarSlotUpload({ folderId, filename, size })
  await admin.from('aulas').update({ panda_video_id: videoId, video_status: 'processando' }).eq('id', aulaId)
  revalidarConteudo()
  return { ok: true, uploadUrl, videoId }
}
```

- [ ] **Step 2: `sincronizarStatusVideo`**

```ts
export async function sincronizarStatusVideo(
  aulaId: string
): Promise<{ status: 'processando' | 'pronto' | 'sem-video' }> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { status: 'sem-video' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return { status: 'sem-video' }
  const admin = createAdminClient()
  const { data: aula } = await admin
    .from('aulas')
    .select('panda_video_id, video_status')
    .eq('id', aulaId)
    .single()
  if (!aula.panda_video_id) return { status: 'sem-video' }
  const { status, duracaoSegundos } = await propriedadesVideo(aula.panda_video_id)
  // 'CONVERTED'/'READY' etc. -> confirmar o valor real de "pronto" na Task 7
  const pronto = /convert(ed)?|ready|done|pronto/i.test(status)
  if (pronto) {
    await admin
      .from('aulas')
      .update({ video_status: 'pronto', duracao_segundos: duracaoSegundos })
      .eq('id', aulaId)
    revalidarConteudo()
    return { status: 'pronto' }
  }
  return { status: 'processando' }
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build` (verdes).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/actions.ts"
git commit -m "feat: actions iniciarUploadVideo e sincronizarStatusVideo (com escopo)"
```

---

### Task 5: Dialog de "Enviar vídeo" (client) com `tus-js-client`

**Files:**
- Create: `src/app/(auth)/admin/conteudo/video-dialog.tsx`
- Modify: `src/app/(auth)/admin/conteudo/conteudo-lista.tsx` (item de menu "Enviar vídeo")
- Modify: `package.json` (dependência `tus-js-client`)

**Interfaces:**
- Consumes: `iniciarUploadVideo`, `sincronizarStatusVideo` (Task 4), `editarAula` (colar ID).

- [ ] **Step 1: Instalar a dependência**

Run: `npm install tus-js-client`
Expected: adiciona a `package.json`/lockfile.

- [ ] **Step 2: Componente do dialog**

Criar `video-dialog.tsx` (client). Ler antes `conteudo-lista.tsx` para casar o padrão dos outros diálogos (capa/materiais) — abertura via item de menu, `aulaId` por prop, fechar em sucesso. Corpo:
- input `type="file" accept="video/*"`;
- ao escolher, chama `iniciarUploadVideo(aulaId, file.name, file.size)`; com o `uploadUrl`, usa `tus-js-client`:

```ts
import * as tus from 'tus-js-client'
const upload = new tus.Upload(file, {
  uploadUrl,
  chunkSize: 50 * 1024 * 1024,
  onProgress: (enviado, total) => setPct(Math.round((enviado / total) * 100)),
  onSuccess: () => setFase('processando'),
  onError: () => setErro('Falha no upload'),
})
upload.start()
```

- ao entrar em "processando", faz polling de `sincronizarStatusVideo(aulaId)` a cada ~8s até `pronto`;
- seção avançada recolhível "Colar ID do Panda" → form que chama `editarAula`.

(Se a Task 1 decidiu **proxy**, trocar o bloco tus por um POST do arquivo à rota de proxy — descrito na decisão da Task 1.)

- [ ] **Step 3: Item de menu na lista**

Em `conteudo-lista.tsx`, adicionar no menu "Ações da aula" um item **"Enviar vídeo"** que abre o `VideoDialog` com o `aulaId` (mesmo padrão de "Definir capa").

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build` (verdes).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/video-dialog.tsx" "src/app/(auth)/admin/conteudo/conteudo-lista.tsx" package.json package-lock.json
git commit -m "feat: dialog de enviar video (upload direto ao Panda) + colar ID avancado"
```

---

### Task 6: Status do vídeo na lista de conteúdo

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/dados.ts` (incluir `video_status`)
- Modify: `src/app/(auth)/admin/conteudo/conteudo-lista.tsx` (coluna/indicador)

- [ ] **Step 1: Trazer `video_status` no carregamento**

Em `dados.ts`, adicionar `video_status` ao `select` de aulas e ao tipo `AulaLinha` (`videoStatus: string | null`).

- [ ] **Step 2: Mostrar o estado**

Em `conteudo-lista.tsx`, na linha da aula, indicar: sem `panda_video_id` → "Sem vídeo"; `video_status==='processando'` → "Vídeo processando"; senão → "Vídeo pronto".

- [ ] **Step 3: Lint + build + commit**

Run: `npm run lint && npm run build` (verdes).
```bash
git add "src/app/(auth)/admin/conteudo/dados.ts" "src/app/(auth)/admin/conteudo/conteudo-lista.tsx"
git commit -m "feat: indicador de status do video na lista de conteudo"
```

---

### Task 7: Verificação real (Panda) + isolamento + segurança

**Files:** vídeo de teste pequeno em `.playwright-mcp/`; script temporário se necessário.

- [ ] **Step 1: Confirmar os campos reais da API**

Com um vídeo já enviado (Step 2), inspecionar a resposta de `GET /videos/{id}` (via `_tmp` script) e confirmar o valor de "pronto" e o campo de duração; ajustar o regex/campo em `propriedadesVideo`/`sincronizarStatusVideo` se preciso; rebuild + commit do ajuste.

- [ ] **Step 2: Fluxo real (Playwright)**

Dev server no ar; logar como `mentorado.teste`; em `/mentor/conteudo`, numa aula, "Enviar vídeo" com um `video/*` pequeno (gerar/colocar em `.playwright-mcp/`); ver a barra de progresso; aguardar "processando → pronto" e a duração aparecer. Confirmar via API que o vídeo está na pasta `Raiz / João Atacados / <módulo>`.

- [ ] **Step 3: Isolamento**

Confirmar (script/logic) que `iniciarUploadVideo`/`sincronizarStatusVideo` negam uma aula de outro espaço (reusam `conteudoNoEscopo`).

- [ ] **Step 4: Segurança da chave**

Confirmar que `PANDA_API_KEY` não aparece em respostas ao cliente nem no bundle: `grep -r "PANDA_API_KEY" .next/static 2>/dev/null` não acha nada; o `video-dialog` só recebe `uploadUrl`/`videoId`.

- [ ] **Step 5: Lint + build finais + limpeza**

Run: `npm run lint && npm run build` (verdes). Remover arquivos `_tmp_*` e o vídeo de teste. Opcional: remover o vídeo de teste do Panda.

- [ ] **Step 6: Commit final (se houver ajuste)**

```bash
git add -A && git commit -m "test: verificacao do upload de video no Panda (fluxo, isolamento, seguranca)"
```

---

## Notas de execução

- **Efeitos externos reais**: esta entrega cria pastas e sobe vídeo na conta REAL do Panda da usuária. Avisar antes de rodar; o vídeo de teste pode ser removido ao fim.
- **Gate da Task 1**: se o CORS bloquear o upload direto, adotar o proxy (rota server que recebe o arquivo e faz o PATCH) — a Task 1 registra a decisão e a Task 5 se adapta.
- **Campos da API do Panda**: nomes exatos de `id` da pasta, `status` e duração do vídeo confirmados contra a resposta real (Tasks 3/7).
- Contas de teste: senha `DemoTemp2026!` (`mentorado.teste@joaoatacados.com.br`, etc.).
