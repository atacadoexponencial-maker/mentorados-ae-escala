# Design — Upload de vídeo no app (Entrega 2)

Data: 2026-07-24

## Objetivo

Trocar o "colar ID do Panda" por **upload de vídeo dentro do app**: o mentorado
(e o admin) escolhe o arquivo, o navegador envia direto para o Panda, e a aula
guarda o vídeo. Com **status ao vivo** (processando → pronto, com duração
automática) e **organização em pastas** no Panda espelhando o app.

Depende da Entrega 1 ([[conteudo-por-mentorado]]), já concluída.

## Arquitetura de upload (segura, dois passos — TUS)

Confirmado no repo oficial `pandavideo/upload-video-in-two-step`:

1. **Backend** (com `PANDA_API_KEY`, nunca exposta):
   - GET `https://api-v2.pandavideo.com.br/hosts/uploader` (header `Authorization: <API_KEY>`) → lista de hosts de upload; escolher um.
   - POST `https://{host}.pandavideo.com.br/files` com headers TUS:
     - `Tus-Resumable: 1.0.0`
     - `Upload-Length: <bytes>`
     - `Upload-Metadata: authorization <b64(API_KEY)>, folder_id <b64(folderId)>, filename <b64(nome)>, video_id <b64(uuid)>`
   - A resposta traz o header `location` (URL do slot).
2. **Navegador**: PATCH do binário para `location` (via `tus-js-client` com a opção `uploadUrl`), com progresso. O PATCH **não** leva a API key.

A chave fica no servidor; o arquivo grande vai direto navegador→Panda.

**Risco a validar na Tarefa 1 (spike):** o servidor de upload do Panda precisa
permitir **CORS** (PATCH cross-origin do navegador). Se não permitir, plano B:
o backend intermedia o upload (rota que recebe o arquivo e faz o PATCH). A
Tarefa 1 decide qual caminho seguir antes de construir a UI.

## Pastas no Panda (árvore espelhando o app)

Endpoints (base `api-v2`, header `Authorization`): `GET /folders?parent_folder_id=`,
`POST /folders {name, parent_folder_id}`, `GET /folders/{id}`. Nesting confirmado.

Estrutura: `Raiz do app / {Mentorado} / {Módulo}`. Conteúdo **base** (admin,
`espaco_id` null): módulos direto na raiz do app.

- **Raiz do app**: criada uma vez; id em `PANDA_ROOT_FOLDER_ID` no `.env`.
- **Pasta do mentorado**: `espacos.panda_folder_id` (criada sob demanda, nome = `nome_curso`, parent = raiz).
- **Pasta do módulo**: `modulos.panda_folder_id` (criada sob demanda, nome = `titulo`, parent = pasta do mentorado; para base, parent = raiz).

Criação **preguiçosa** (na hora que precisa, no upload). Renomear módulo/espaço
**não** renomeia a pasta no Panda nesta entrega (melhoria futura).

## Banco (migration)

```sql
ALTER TABLE public.espacos ADD COLUMN panda_folder_id TEXT;
ALTER TABLE public.modulos ADD COLUMN panda_folder_id TEXT;
ALTER TABLE public.aulas   ADD COLUMN video_status TEXT; -- 'processando' | 'pronto'; null = sem vídeo/legado
```

Regenerar/ajustar `types.ts` (como nas entregas anteriores).

## Backend — cliente Panda + ações

Novo módulo server-only `src/integrations/panda/server.ts`:
- `garantirPastaModulo(moduloId): Promise<string>` — resolve/cria a pasta do
  módulo (e, se preciso, a do mentorado sob a raiz), grava os `panda_folder_id`,
  retorna o id.
- `criarSlotUpload({ folderId, filename, size }): Promise<{ uploadUrl, videoId }>`
  — GET hosts + POST /files com a metadata; `videoId` é um uuid gerado aqui.
- `propriedadesVideo(videoId): Promise<{ status, duracaoSegundos }>` — GET
  `/videos/{videoId}`; **confirmar na Tarefa de status os nomes exatos** dos
  campos de status e duração contra a resposta real.

Server actions em `admin/conteudo/actions.ts` (reusadas por admin e mentor,
com `exigirEscopoConteudo` + `conteudoNoEscopo` como as demais):
- `iniciarUploadVideo(aulaId, filename, size)` → verifica escopo/posse da aula →
  `garantirPastaModulo(aula.modulo_id)` → `criarSlotUpload` → grava
  `aulas.panda_video_id = videoId`, `video_status='processando'` → retorna
  `{ uploadUrl, videoId }`.
- `sincronizarStatusVideo(aulaId)` → verifica posse → `propriedadesVideo` → se
  pronto, grava `video_status='pronto'` + `duracao_segundos` → retorna o status.
- O "colar ID" continua pela `editarAula` já existente (modo avançado).

## Frontend

- Nova dependência `tus-js-client` (client-side).
- Novo item **"Enviar vídeo"** no menu de ações da aula (ao lado de Capa/Materiais),
  abrindo um dialog client-side:
  - input de arquivo (accept `video/*`);
  - ao escolher: chama `iniciarUploadVideo` → recebe `uploadUrl` → sobe com
    `tus-js-client` (`uploadUrl`) mostrando **barra de progresso**;
  - ao concluir: faz polling de `sincronizarStatusVideo` até `pronto`, mostrando
    "processando… → pronto";
  - seção **avançada** recolhível: colar ID (chama `editarAula`).
- A lista de conteúdo mostra o status do vídeo por aula (sem vídeo / processando / pronto).

## Fora de escopo

- Legendas, thumbnails automáticos, edição de vídeo.
- Sincronizar renome de pasta no Panda ao renomear módulo/espaço.
- Remover o vídeo do Panda ao excluir a aula (a exclusão da aula continua como
  hoje; limpeza no Panda fica para depois).

## Verificação

- **Spike CORS (Tarefa 1)**: confirmar se o navegador consegue dar PATCH no slot
  do Panda; registrar o caminho escolhido (direto vs proxy).
- `npm run lint` + `npm run build` verdes.
- Fluxo real (Playwright + arquivo de vídeo pequeno): como mentorado, criar aula,
  "Enviar vídeo", ver a barra de progresso, o status virar "pronto" e a duração
  aparecer; confirmar no Panda que o vídeo caiu na pasta
  `Raiz / João Atacados / <módulo>`.
- Isolamento: o `iniciarUploadVideo`/`sincronizarStatusVideo` negam aula de outro
  espaço (reusam `conteudoNoEscopo`).
- Segurança: confirmar que a `PANDA_API_KEY` não aparece em nenhuma resposta ao
  cliente nem no bundle do navegador.
