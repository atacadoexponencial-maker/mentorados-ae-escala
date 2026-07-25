# Design — Admin gerencia o conteúdo de qualquer marca

Data: 2026-07-25

## Objetivo

O admin (AE Escala) precisa **ver e editar** o conteúdo de qualquer mentorado
para dar suporte. Hoje o admin só gerencia a base (`espaco_id null`). Mudar para:
admin pode gerenciar **qualquer** espaço; mentorado continua só no **próprio**.
O isolamento **mentorado ↔ mentorado** permanece intacto (o teste de RLS já
existente continua valendo).

## Contexto

- RLS já libera o admin a **ler** todo o conteúdo (`has_role(admin)` nas policies).
  A trava atual é só de UI/escopo: `exigirEscopoConteudo()` devolve
  `{espacoId:null}` para admin, e a tela carrega `listarConteudo(null)`.
- Escrita passa pelo service client; a autorização vive nas actions via
  `conteudoNoEscopo(tabela, id, escopo.espacoId)` (~15 chamadas) e no carimbo de
  `espaco_id` na criação. Ver [[conteudo-por-mentorado]].

## Arquitetura

### 1. Regra de autorização (pura e testável)

Novo arquivo **sem** `server-only`, `src/app/(auth)/admin/conteudo/autorizacao.ts`:

```ts
export type EscopoConteudo = { ehAdmin: boolean; espacoId: string | null }
// admin pode qualquer espaço; mentorado só o próprio.
export function podeGerenciarEspaco(escopo: EscopoConteudo, alvoEspacoId: string | null): boolean {
  if (escopo.ehAdmin) return true
  return (alvoEspacoId ?? null) === escopo.espacoId
}
```

Isso permite **teste unitário** (offline) da regra de escrita — fechando a lacuna
de "o guard de escrita não é auto-testado".

### 2. `escopo.ts` (server-only)

- `exigirEscopoConteudo()` passa a devolver `EscopoConteudo | null`:
  - admin → `{ ehAdmin: true, espacoId: null }`
  - mentorado → `{ ehAdmin: false, espacoId: <próprio> }`
- `conteudoNoEscopo(tabela, id, escopo: EscopoConteudo)` carrega o `espaco_id` da
  linha e retorna `podeGerenciarEspaco(escopo, row.espaco_id)`.

### 3. Actions (`admin/conteudo/actions.ts`)

- Todas as chamadas `conteudoNoEscopo('x', id, escopo.espacoId)` → `(…, escopo)`
  (mecânico; admin passa em qualquer linha, mentor só nas do próprio espaço).
- **`criarModulo`**: o espaço-alvo é escolhido — admin lê do form (`espacoAlvo`,
  vazio = base/null); mentor é **forçado** ao próprio (ignora o valor recebido):
  `const alvo = escopo.ehAdmin ? (form espacoAlvo || null) : escopo.espacoId`.
  Usar `alvo` na ordem (`filtrarEscopo`) e no `espaco_id` do insert.
- **`criarAula`**: a aula **herda o `espaco_id` do módulo** (não do escopo) —
  após `conteudoNoEscopo('modulos', moduloId, escopo)`, ler o `espaco_id` do
  módulo e gravar na aula.
- **`moverModulo`**: derivar o espaço do módulo movido (ler `espaco_id` do
  `moduloId`) e reordenar dentro dele (`filtrarEscopo(..., espacoDoModulo)`).
- **`moverAula`**: já reordena por `modulo_id` (mesmo espaço) — só troca a
  checagem para `escopo`.
- **`moverAulaParaModulo`**: além de autorizar aula e módulo-destino, exigir que
  os dois estejam no **mesmo espaço** (impede admin mover conteúdo entre marcas).
- Demais (editar/excluir/publicar/capa/materiais/vídeo): só a troca mecânica.

### 4. Tela do admin (`admin/conteudo/page.tsx`)

- Ler `searchParams.espaco` (ausente = base/null).
- Carregar `listarConteudo(espacoSelecionado)`.
- Novo componente client **`SeletorEspaco`** (dropdown) com "Base (compartilhada)"
  + a lista de espaços (mentorados); ao trocar, navega para
  `/admin/conteudo?espaco=<id>` (ou sem query para base).
- Passar `espacoAlvo={espacoSelecionado}` ao `NovoModuloDialog`.
- Carregar a lista de espaços (id, nome_curso) para o seletor.

### 5. `NovoModuloDialog`

- Novo prop opcional `espacoAlvo?: string | null` → `<input type="hidden"
  name="espacoAlvo" value={espacoAlvo ?? ''} />`. A tela do mentor não precisa
  passar (a action força o próprio).

## Fora de escopo

- Admin acessar os painéis do mentor (`/mentor/*`) — não muda.
- Mover conteúdo entre marcas — proibido (mesmo para admin).
- Área da revendedora — não muda.

## Verificação

- **Unitário (offline):** `podeGerenciarEspaco` — admin gerencia qualquer espaço
  (inclui outro mentorado e base); mentor só o próprio, e é **negado** em outro.
- **Integração (já existe):** revendedor de A não lê conteúdo de B — continua
  passando (isolamento mentorado↔mentorado intacto).
- **Playwright:** admin abre `/admin/conteudo`, seleciona um mentorado, cria/edita
  uma aula nele e vê aparecer; confirma que o mentorado dono a vê; e que um
  mentorado continua sem enxergar o espaço de outro.
- `npm run lint` + `npm run build` + `npm run test` verdes.
