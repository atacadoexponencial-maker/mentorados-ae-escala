# Preview da área de membros, personalização no admin e capas por marca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mentorado e admin abrem a área de membros como a revendedora a vê; a admin personaliza a marca de qualquer mentorado; a mesma aula base pode ter capa diferente em cada marca.

**Architecture:** Três entregas sobre a spec `docs/superpowers/specs/2026-07-27-preview-e-personalizacao-admin-design.md`. A Entrega 1 centraliza a leitura do catálogo num helper server-only (`src/lib/catalogo.ts`) que filtra por espaço — hoje as páginas confiam só na RLS e o admin veria conteúdo de todas as marcas. A Entrega 2 troca a autorização da action de personalização por uma regra pura admin-aware. A Entrega 3 acrescenta uma tabela de exceção de capa por espaço, resolvida dentro do mesmo helper.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), TypeScript, Supabase (Postgres + RLS + Storage), Vitest, shadcn/ui sobre Base UI, Tailwind.

## Global Constraints

- **Next.js 16.2.10.** Antes de escrever código de rotas/actions, consultar o guia em `node_modules/next/dist/docs/` — esta versão tem quebras em relação ao conhecimento prévio. `params` e `searchParams` são `Promise` e precisam de `await`.
- **shadcn sobre Base UI:** não existe `asChild`. Use a prop `render` nos triggers/botões (ex.: `<Button render={<Link href="…" />}>`).
- **Lógica de negócio e autorização sempre no backend.** Nenhuma regra de acesso no cliente.
- **Escrita no banco só pelo service client** (`createAdminClient`), nunca pelo client da sessão. RLS não tem policy de INSERT/UPDATE/DELETE — é intencional.
- **UI em português (pt-BR)**, com acentuação correta.
- **Mensagens de erro de action:** sempre `{ ok: false, erro: '…' }`; negação de acesso usa exatamente `'Acesso negado'`.
- **Commits:** um por tarefa, mensagem em português sem acentos (padrão do repositório), prefixos `feat:` / `fix:` / `refactor:` / `test:` / `docs:`.
- **Não tocar** em `src/integrations/supabase/types.ts` (gerado) nem em `src/components/ui/*` (gerado).
- Ao final de cada tarefa que muda código: `npm run lint` e `npm run test` verdes.

---

## File Structure

**Criados:**
- `src/lib/catalogo.ts` — server-only. Ponto único de leitura do catálogo (módulos + aulas publicadas) de um espaço, já filtrado e com capa resolvida.
- `src/lib/preview.ts` — regra pura: o visitante está em pré-visualização?
- `src/lib/capas.ts` — regra pura: qual capa vale para esta marca?
- `src/components/shared/faixa-preview.tsx` — faixa "Pré-visualização" acima do header.
- `src/app/(auth)/mentor/personalizacao/autorizacao.ts` — regra pura de quem salva personalização de qual espaço.
- `src/app/(auth)/admin/conteudo/base-herdada.tsx` — bloco somente leitura do conteúdo base com troca de capa por marca.
- `supabase/migrations/20260727120000_capas_por_espaco.sql` — tabela `aula_capas_espaco` + RLS.
- `src/test/preview.test.ts`, `src/test/capas.test.ts`, `src/test/autorizacao-personalizacao.test.ts`, `src/test/capas-por-espaco.integration.test.ts`

**Modificados:**
- `src/app/[espaco]/page.tsx` — usa `carregarCatalogo`; faixa de preview.
- `src/app/[espaco]/aula/[aulaId]/page.tsx` — usa `carregarCatalogo`; faixa de preview.
- `src/app/(auth)/mentor/layout.tsx` — link "Ver área de membros".
- `src/app/(auth)/admin/mentorados/[slug]/page.tsx` — botão de preview + bloco de personalização.
- `src/app/(auth)/mentor/personalizacao/actions.ts` — autorização admin-aware.
- `src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx` — prop `espacoId`.
- `src/app/(auth)/admin/conteudo/dados.ts` — `listarBaseComCapas`.
- `src/app/(auth)/admin/conteudo/actions.ts` — `salvarCapaNoEspaco`, `removerCapaDoEspaco`, limpeza em `excluirAula`.
- `src/app/(auth)/admin/conteudo/capa-dialog.tsx` — prop `espacoId`.
- `src/app/(auth)/admin/conteudo/page.tsx` — renderiza o bloco herdado quando há marca selecionada.

---

# Entrega 1 — Ver área de membros

### Task 1: Regra pura de pré-visualização

**Files:**
- Create: `src/lib/preview.ts`
- Test: `src/test/preview.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `ehPreview(revendedorEspacoId: string | null, espacoId: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/preview.test.ts
import { describe, it, expect } from 'vitest'
import { ehPreview } from '@/lib/preview'

describe('ehPreview', () => {
  it('revendedora do próprio espaço não está em pré-visualização', () => {
    expect(ehPreview('A', 'A')).toBe(false)
  })

  it('quem não é revendedora (admin ou mentorado) está em pré-visualização', () => {
    expect(ehPreview(null, 'A')).toBe(true)
  })

  it('revendedora de outro espaço conta como pré-visualização', () => {
    expect(ehPreview('B', 'A')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/preview.test.ts`
Expected: FAIL — não resolve `@/lib/preview`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/preview.ts
// Está vendo como quem não é revendedora deste espaço (admin ou mentorado dono).
export function ehPreview(revendedorEspacoId: string | null, espacoId: string): boolean {
  return revendedorEspacoId !== espacoId
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/preview.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview.ts src/test/preview.test.ts
git commit -m "feat: regra pura ehPreview + teste unitario"
```

---

### Task 2: Helper `carregarCatalogo` e catálogo filtrado por espaço

**Files:**
- Create: `src/lib/catalogo.ts`
- Modify: `src/app/[espaco]/page.tsx:35-66`

**Interfaces:**
- Consumes: `getEspacoPorSlug` (`src/lib/espacos.ts`), `createClient` (`src/integrations/supabase/server`).
- Produces:
  - `type AulaCatalogo = { id: string; moduloId: string; titulo: string; descricao: string | null; pandaVideoId: string | null; capaUrl: string | null; duracaoSegundos: number | null; ordem: number }`
  - `type ModuloCatalogo = { id: string; titulo: string; ordem: number; aulas: AulaCatalogo[] }`
  - `carregarCatalogo(espacoId: string): Promise<ModuloCatalogo[]>` — módulos base primeiro, depois os do espaço; só aulas publicadas; módulos vazios incluídos (quem consome filtra).

- [ ] **Step 1: Criar o helper**

O `.or()` do PostgREST recebe os filtros separados por vírgula. `espaco_id.is.null` é a base; `espaco_id.eq.<uuid>` é a marca. Isso é defesa em profundidade — a RLS continua sendo a garantia de isolamento para a revendedora.

```ts
// src/lib/catalogo.ts
// Server-only: o que a revendedora de um espaço enxerga — base + conteúdo da marca.
// Ponto único de leitura para o catálogo e para a página de aula, para que admin e
// mentorado (que a RLS deixa ler mais) vejam exatamente o mesmo que ela.
import 'server-only'
import { createClient } from '@/integrations/supabase/server'

export type AulaCatalogo = {
  id: string
  moduloId: string
  titulo: string
  descricao: string | null
  pandaVideoId: string | null
  capaUrl: string | null
  duracaoSegundos: number | null
  ordem: number
}

export type ModuloCatalogo = {
  id: string
  titulo: string
  ordem: number
  aulas: AulaCatalogo[]
}

export async function carregarCatalogo(espacoId: string): Promise<ModuloCatalogo[]> {
  const supabase = await createClient()
  const filtroEspaco = `espaco_id.is.null,espaco_id.eq.${espacoId}`

  const [{ data: modulos }, { data: aulas }] = await Promise.all([
    supabase
      .from('modulos')
      .select('id, titulo, ordem')
      .or(filtroEspaco)
      .order('espaco_id', { nullsFirst: true })
      .order('ordem'),
    supabase
      .from('aulas')
      .select('id, modulo_id, titulo, descricao, panda_video_id, capa_url, duracao_segundos, ordem')
      .or(filtroEspaco)
      .eq('publicada', true)
      .order('ordem'),
  ])

  return (modulos ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
    ordem: m.ordem,
    aulas: (aulas ?? [])
      .filter((a) => a.modulo_id === m.id)
      .map((a) => ({
        id: a.id,
        moduloId: a.modulo_id,
        titulo: a.titulo,
        descricao: a.descricao,
        pandaVideoId: a.panda_video_id,
        capaUrl: a.capa_url,
        duracaoSegundos: a.duracao_segundos,
        ordem: a.ordem,
      })),
  }))
}
```

- [ ] **Step 2: Trocar as consultas do catálogo pelo helper**

Em `src/app/[espaco]/page.tsx`, substituir o bloco `Promise.all` (linhas 35-52) por:

```tsx
  const supabase = await createClient()
  const [modulosComTodasAulas, { data: visualizacoes }] = await Promise.all([
    carregarCatalogo(dados.id),
    supabase
      .from('aula_visualizacoes')
      .select('aula_id, ultima_posicao, concluida_em, updated_at')
      .eq('user_id', vinculo.userId)
      .order('updated_at', { ascending: false }),
  ])
```

Adicionar o import `import { carregarCatalogo } from '@/lib/catalogo'`.

- [ ] **Step 3: Ajustar o consumo (a forma dos dados mudou)**

`modulosComAulas` deixa de ser montado a partir de duas listas soltas. Substituir as linhas 57-66 por:

```tsx
  const todasAulas = modulosComTodasAulas.flatMap((m) => m.aulas)
  const aulaEmAndamento = emAndamento
    ? todasAulas.find((a) => a.id === emAndamento.aula_id)
    : undefined

  const modulosComAulas = modulosComTodasAulas.filter((m) => m.aulas.length > 0)
```

No JSX, os campos mudam de snake_case para camelCase: `aula.capa_url` → `aula.capaUrl` e `aula.duracao_segundos` → `aula.duracaoSegundos` (ocorrem no cartão "Continuar assistindo" e no grid de cards).

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run build`
Expected: sem erros. Nenhum uso remanescente de `capa_url`/`duracao_segundos` em `src/app/[espaco]/page.tsx` (confira com busca no arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo.ts "src/app/[espaco]/page.tsx"
git commit -m "fix: catalogo le por espaco (base + marca) via helper carregarCatalogo"
```

---

### Task 3: Página de aula pelo mesmo helper

**Files:**
- Modify: `src/app/[espaco]/aula/[aulaId]/page.tsx:35-65`

**Interfaces:**
- Consumes: `carregarCatalogo` (Task 2).
- Produces: nada novo.

Hoje a navegação anterior/próxima é montada sobre todas as aulas que a RLS libera — para o admin, isso caminha por conteúdo de outras marcas.

- [ ] **Step 1: Trocar as consultas pelo helper**

Substituir o `Promise.all` (linhas 36-49) por:

```tsx
  const supabase = await createClient()
  const [modulos, { data: visualizacao }] = await Promise.all([
    carregarCatalogo(dados.id),
    supabase
      .from('aula_visualizacoes')
      .select('concluida_em, ultima_posicao')
      .eq('user_id', vinculo.userId)
      .eq('aula_id', aulaId)
      .maybeSingle(),
  ])
```

Adicionar `import { carregarCatalogo } from '@/lib/catalogo'`.

- [ ] **Step 2: Derivar a sequência linear dos módulos já ordenados**

Substituir as linhas 51-65 por:

```tsx
  // carregarCatalogo devolve os módulos na ordem de exibição (base primeiro) e as
  // aulas publicadas ordenadas dentro de cada um: a sequência linear é o achatamento.
  const publicadas = modulos.flatMap((m) => m.aulas)

  const indice = publicadas.findIndex((a) => a.id === aulaId)
  if (indice === -1) notFound()

  const aula = publicadas[indice]
  const anterior = indice > 0 ? publicadas[indice - 1] : null
  const proxima = indice < publicadas.length - 1 ? publicadas[indice + 1] : null
  const concluida = Boolean(visualizacao?.concluida_em)
  const modulo = modulos.find((m) => m.id === aula.moduloId)
```

No JSX, `aula.panda_video_id` → `aula.pandaVideoId` e `aula.duracao_segundos` → `aula.duracaoSegundos`, onde aparecerem.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[espaco]/aula/[aulaId]/page.tsx"
git commit -m "fix: pagina de aula navega so pelo conteudo do espaco"
```

---

### Task 4: Faixa de pré-visualização

**Files:**
- Create: `src/components/shared/faixa-preview.tsx`
- Modify: `src/app/[espaco]/page.tsx`, `src/app/[espaco]/aula/[aulaId]/page.tsx`

**Interfaces:**
- Consumes: `ehPreview` (Task 1).
- Produces: `<FaixaPreview />` — componente de servidor sem props.

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/shared/faixa-preview.tsx
import { Eye } from 'lucide-react'

// Mostrada para quem não é revendedora deste espaço (admin ou mentorado dono).
export function FaixaPreview() {
  return (
    <div className="flex items-center justify-center gap-2 bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>Pré-visualização — é assim que a revendedora vê este espaço.</span>
    </div>
  )
}
```

- [ ] **Step 2: Usar nas duas páginas**

Nas duas, logo após o `const vinculo = …` (e depois do guard de redirecionamento), calcular:

```tsx
  const preview = ehPreview(vinculo.revendedor?.espacoId ?? null, dados.id)
```

E no JSX, imediatamente **antes** de `<EspacoHeader …/>`:

```tsx
        {preview && <FaixaPreview />}
```

Imports: `import { ehPreview } from '@/lib/preview'` e `import { FaixaPreview } from '@/components/shared/faixa-preview'`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/faixa-preview.tsx "src/app/[espaco]/page.tsx" "src/app/[espaco]/aula/[aulaId]/page.tsx"
git commit -m "feat: faixa de pre-visualizacao para admin e mentorado"
```

---

### Task 5: Link "Ver área de membros" no painel do mentorado

**Files:**
- Modify: `src/app/(auth)/mentor/layout.tsx:14-49`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Buscar o slug do espaço no layout**

Depois do guard `if (!ehMentorado) redirect('/login')`, acrescentar:

```tsx
  const { data: espaco } = await supabase
    .from('espacos')
    .select('slug')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()
```

- [ ] **Step 2: Acrescentar o link ao nav**

Como último item do `<nav>`, depois de "Dashboard". Espaço ausente (caso anômalo): não renderiza.

```tsx
            {espaco && (
              <a
                href={`/${espaco.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                Ver área de membros
              </a>
            )}
```

Usa `<a>` e não `<Link>` de propósito: é navegação para fora do painel, em outra aba.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/mentor/layout.tsx"
git commit -m "feat: link ver area de membros no painel do mentorado"
```

---

### Task 6: Botão de preview na página do mentorado (admin)

**Files:**
- Modify: `src/app/(auth)/admin/mentorados/[slug]/page.tsx:69-75`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Acrescentar o botão ao cabeçalho**

No `<div className="flex flex-wrap items-center gap-3">` que traz nome, slug e badge, adicionar como último filho:

```tsx
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          render={
            <a href={`/${espaco.slug}`} target="_blank" rel="noopener noreferrer" />
          }
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver área de membros
        </Button>
```

Imports novos: `import { Button } from '@/components/ui/button'` e acrescentar `Eye` ao import existente de `lucide-react` (que já traz `ArrowLeft`).

Lembrete: shadcn sobre Base UI não tem `asChild` — a prop correta é `render`.

- [ ] **Step 2: Verificar**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/admin/mentorados/[slug]/page.tsx"
git commit -m "feat: botao ver area de membros na pagina do mentorado"
```

---

# Entrega 2 — Personalização no nível de admin

### Task 7: Regra pura de autorização da personalização

**Files:**
- Create: `src/app/(auth)/mentor/personalizacao/autorizacao.ts`
- Test: `src/test/autorizacao-personalizacao.test.ts`

**Interfaces:**
- Consumes: `podeGerenciarEspaco` e `EscopoConteudo` de `src/app/(auth)/admin/conteudo/autorizacao.ts` (existentes: `EscopoConteudo = { ehAdmin: boolean; espacoId: string | null }`).
- Produces: `podeSalvarPersonalizacao(escopo: EscopoConteudo, alvo: string | null): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/autorizacao-personalizacao.test.ts
import { describe, it, expect } from 'vitest'
import { podeSalvarPersonalizacao } from '@/app/(auth)/mentor/personalizacao/autorizacao'

const admin = { ehAdmin: true, espacoId: null }
const mentorA = { ehAdmin: false, espacoId: 'A' }

describe('podeSalvarPersonalizacao', () => {
  it('admin personaliza qualquer marca', () => {
    expect(podeSalvarPersonalizacao(admin, 'A')).toBe(true)
    expect(podeSalvarPersonalizacao(admin, 'B')).toBe(true)
  })

  it('mentor personaliza só a própria marca', () => {
    expect(podeSalvarPersonalizacao(mentorA, 'A')).toBe(true)
    expect(podeSalvarPersonalizacao(mentorA, 'B')).toBe(false)
  })

  it('base não tem personalização — negada até para admin', () => {
    expect(podeSalvarPersonalizacao(admin, null)).toBe(false)
    expect(podeSalvarPersonalizacao(mentorA, null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/autorizacao-personalizacao.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/(auth)/mentor/personalizacao/autorizacao.ts
// Sem 'server-only': regra pura, testável offline.
import { podeGerenciarEspaco, type EscopoConteudo } from '@/app/(auth)/admin/conteudo/autorizacao'

// Personalização pertence sempre a um espaço: a base (null) não tem identidade
// própria, então é negada mesmo para o admin — diferente de podeGerenciarEspaco,
// onde a base é um alvo válido de conteúdo.
export function podeSalvarPersonalizacao(escopo: EscopoConteudo, alvo: string | null): boolean {
  if (!alvo) return false
  return podeGerenciarEspaco(escopo, alvo)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/autorizacao-personalizacao.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/mentor/personalizacao/autorizacao.ts" src/test/autorizacao-personalizacao.test.ts
git commit -m "feat: regra pura podeSalvarPersonalizacao + teste unitario"
```

---

### Task 8: Action de personalização admin-aware

**Files:**
- Modify: `src/app/(auth)/mentor/personalizacao/actions.ts:1-30,43-107`
- Modify: `src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx:15-65`

**Interfaces:**
- Consumes: `podeSalvarPersonalizacao` (Task 7), `exigirEscopoConteudo` de `src/app/(auth)/admin/conteudo/escopo.ts` (existente; devolve `EscopoConteudo | null`).
- Produces: `PersonalizacaoForm` passa a aceitar `espacoId?: string`; `salvarPersonalizacao` passa a ler `espacoId` do FormData.

- [ ] **Step 1: Trocar a autorização da action**

Em `actions.ts`, substituir os imports de `exigirMentorado` e o começo da função:

```ts
import { exigirEscopoConteudo } from '@/app/(auth)/admin/conteudo/escopo'
import { podeSalvarPersonalizacao } from './autorizacao'
```

E o corpo inicial (que hoje é `const contexto = await exigirMentorado()`):

```ts
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  // Mentorado é forçado ao próprio espaço: o valor do formulário é ignorado para
  // ele, mesmo padrão de criarModulo.
  const espacoIdForm = String(formData.get('espacoId') ?? '').trim()
  const alvo = escopo.ehAdmin ? espacoIdForm || null : escopo.espacoId
  if (!podeSalvarPersonalizacao(escopo, alvo)) {
    return { ok: false, erro: 'Acesso negado' }
  }
```

- [ ] **Step 2: Usar `alvo` no lugar de `contexto.espacoId`**

Substituir todas as ocorrências de `contexto.espacoId` por `alvo` (aparecem no `search` e nos caminhos de storage `logos/…`, `banners/…` e no `.eq('id', …)` do update final). Após o `podeSalvarPersonalizacao`, `alvo` é `string` — se o TypeScript não estreitar sozinho, use `const espacoAlvo = alvo as string` logo abaixo do guard e utilize `espacoAlvo`.

- [ ] **Step 3: Revalidar os três caminhos**

O slug já não vem de `contexto`; buscar antes de revalidar. No fim da action, no lugar do bloco de `revalidatePath` atual:

```ts
  const { data: espacoSalvo } = await admin
    .from('espacos')
    .select('slug')
    .eq('id', alvo)
    .maybeSingle()

  revalidatePath('/mentor/personalizacao')
  if (espacoSalvo?.slug) {
    revalidatePath(`/admin/mentorados/${espacoSalvo.slug}`)
    revalidatePath(`/${espacoSalvo.slug}`)
  }
  return { ok: true, erro: null }
```

- [ ] **Step 4: Prop `espacoId` no formulário**

Em `personalizacao-form.tsx`, mudar a assinatura para:

```tsx
export function PersonalizacaoForm({ espaco, espacoId }: { espaco: Espaco; espacoId?: string }) {
```

E, junto dos hidden que já existem no `<form>` (`removerLogo`, `removerBanner`), acrescentar:

```tsx
            {espacoId && <input type="hidden" name="espacoId" value={espacoId} />}
```

A tela do mentor não passa a prop — a action força o espaço dele.

- [ ] **Step 5: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde. Se `exigirMentorado` ficou sem uso em `actions.ts`, remova o import (o lint acusa).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/mentor/personalizacao/actions.ts" "src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx"
git commit -m "refactor: salvarPersonalizacao com autorizacao admin-aware"
```

---

### Task 9: Bloco de personalização na página do mentorado (admin)

**Files:**
- Modify: `src/app/(auth)/admin/mentorados/[slug]/page.tsx:39-45,92-132`

**Interfaces:**
- Consumes: `PersonalizacaoForm` (Task 8), tipo `Espaco` de `src/lib/espacos.ts`.
- Produces: nada.

- [ ] **Step 1: Carregar os campos de identidade**

A consulta de `espacos` hoje traz só `id, slug, nome_curso, ativo`. Trocar o `select` por:

```ts
    .select('id, slug, nome_curso, logo_url, banner_url, cor_primaria, cor_destaque, ativo')
```

- [ ] **Step 2: Renderizar o bloco**

Entre o grid de cartões de contagem e o `<Card>` de Revendedoras:

```tsx
      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
          <CardDescription>
            A identidade que as revendedoras veem em /{espaco.slug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalizacaoForm espaco={espaco as Espaco} espacoId={espaco.id} />
        </CardContent>
      </Card>
```

Imports novos:

```tsx
import type { Espaco } from '@/lib/espacos'
import { PersonalizacaoForm } from '@/app/(auth)/mentor/personalizacao/personalizacao-form'
```

E acrescentar `CardDescription` ao import existente de `@/components/ui/card`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde.

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`, entrar como admin, abrir `/admin/mentorados/<slug>`, trocar a cor primária e o nome do curso, salvar, e clicar em "Ver área de membros": a identidade nova aparece. Entrar como o mentorado dono e confirmar que `/mentor/personalizacao` mostra os mesmos valores e continua salvando.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/admin/mentorados/[slug]/page.tsx"
git commit -m "feat: admin personaliza a marca na pagina do mentorado"
```

---

# Entrega 3 — Capa da aula base por marca

### Task 10: Tabela `aula_capas_espaco`

**Files:**
- Create: `supabase/migrations/20260727120000_capas_por_espaco.sql`

**Interfaces:**
- Consumes: tabelas `aulas`, `espacos`, função `public.has_role`.
- Produces: tabela `public.aula_capas_espaco (aula_id, espaco_id, capa_url, created_at)`.

- [ ] **Step 1: Escrever a migration**

A visibilidade de leitura espelha a policy `modulos_select_escopo` (ver `supabase/migrations/20260724100100_conteudo_rls_escopo.sql`). Sem policy de escrita: gravação só pelo service client.

```sql
-- Capa de uma aula base variando por marca. Sem linha aqui, vale aulas.capa_url.
CREATE TABLE public.aula_capas_espaco (
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  capa_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (aula_id, espaco_id)
);

ALTER TABLE public.aula_capas_espaco ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.aula_capas_espaco TO authenticated;

-- Leitura: admin, mentorado dono do espaço, ou revendedora daquele espaço.
CREATE POLICY "aula_capas_espaco_select"
  ON public.aula_capas_espaco FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
  );

CREATE INDEX aula_capas_espaco_espaco_idx ON public.aula_capas_espaco (espaco_id);
```

- [ ] **Step 2: Aplicar no Supabase**

Run: `npx supabase db push`
Expected: migration aplicada sem erro. (`SUPABASE_DB_URL` já está no `.env`.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727120000_capas_por_espaco.sql
git commit -m "feat: tabela aula_capas_espaco (capa por marca) com RLS de leitura"
```

---

### Task 11: Regra pura `resolverCapa` e catálogo com capa da marca

**Files:**
- Create: `src/lib/capas.ts`
- Test: `src/test/capas.test.ts`
- Modify: `src/lib/catalogo.ts`

**Interfaces:**
- Consumes: `carregarCatalogo` (Task 2), tabela da Task 10.
- Produces: `resolverCapa(capaBase: string | null, capaDaMarca: string | null): string | null`. `carregarCatalogo` mantém a mesma assinatura; `capaUrl` passa a vir resolvida.

- [ ] **Step 1: Write the failing test**

```ts
// src/test/capas.test.ts
import { describe, it, expect } from 'vitest'
import { resolverCapa } from '@/lib/capas'

describe('resolverCapa', () => {
  it('sem exceção, vale a capa base', () => {
    expect(resolverCapa('base.jpg', null)).toBe('base.jpg')
  })

  it('a capa da marca vence a base', () => {
    expect(resolverCapa('base.jpg', 'marca.jpg')).toBe('marca.jpg')
  })

  it('sem base e sem exceção, não há capa', () => {
    expect(resolverCapa(null, null)).toBeNull()
  })

  it('marca com capa própria funciona mesmo sem capa base', () => {
    expect(resolverCapa(null, 'marca.jpg')).toBe('marca.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/capas.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/capas.ts
// A capa definida para a marca vence; sem exceção, vale a capa base da aula.
export function resolverCapa(capaBase: string | null, capaDaMarca: string | null): string | null {
  return capaDaMarca ?? capaBase
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/capas.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Aplicar no `carregarCatalogo`**

Em `src/lib/catalogo.ts`, acrescentar a terceira consulta ao `Promise.all` e resolver a capa no `map`:

```ts
import { resolverCapa } from './capas'
```

```ts
  const [{ data: modulos }, { data: aulas }, { data: capas }] = await Promise.all([
    // … as duas consultas que já existem …
    supabase.from('aula_capas_espaco').select('aula_id, capa_url').eq('espaco_id', espacoId),
  ])

  const capaPorAula = new Map((capas ?? []).map((c) => [c.aula_id, c.capa_url]))
```

E no `map` das aulas, trocar `capaUrl: a.capa_url` por:

```ts
        capaUrl: resolverCapa(a.capa_url, capaPorAula.get(a.id) ?? null),
```

- [ ] **Step 6: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/capas.ts src/test/capas.test.ts src/lib/catalogo.ts
git commit -m "feat: capa por marca resolvida no catalogo (resolverCapa)"
```

---

### Task 12: Actions de capa por marca

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/actions.ts` (após `definirCapa`, que termina na linha 185; e `excluirAula`, ~linha 317)
- Modify: `src/app/(auth)/admin/conteudo/capa-dialog.tsx`

**Interfaces:**
- Consumes: `exigirEscopoConteudo`, `createAdminClient`, `EstadoConteudo` (exportado na linha 8 de `actions.ts`), `revalidarConteudo` (função local, linha 11) e `CAPA_MAX_BYTES` (const local, linha 137).
- Produces:
  - `salvarCapaNoEspaco(_estadoAnterior: EstadoConteudo, formData: FormData): Promise<EstadoConteudo>` — campos `aulaId`, `espacoId`, `arquivo`.
  - `removerCapaDoEspaco(_estadoAnterior: EstadoConteudo, formData: FormData): Promise<EstadoConteudo>` — campos `aulaId`, `espacoId`.
  - `type AulaCapa = { id: string; titulo: string; capaUrl: string | null }` exportado de `capa-dialog.tsx`.
  - `CapaDialog` passa a aceitar `{ aula: AulaCapa | null; espacoId?: string; onClose: () => void }`.

**Atenção:** a action de capa existente chama-se **`definirCapa`** (não `salvarCapa`), e `CapaDialog` é controlado pelo pai — recebe `aula` (ou `null`, que o mantém fechado) e `onClose`, sem trigger próprio. Ver o uso em `conteudo-lista.tsx:44,251`.

- [ ] **Step 1: Escrever `salvarCapaNoEspaco`**

```ts
// Só a admin troca a capa de conteúdo base, e só de aula base: aula de marca já
// tem capa pelo caminho normal (definirCapa).
export async function salvarCapaNoEspaco(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo?.ehAdmin) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const espacoId = String(formData.get('espacoId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !espacoId) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem' }
  }
  if (!arquivo.type.startsWith('image/')) {
    return { ok: false, erro: 'O arquivo precisa ser uma imagem' }
  }
  if (arquivo.size > CAPA_MAX_BYTES) {
    return { ok: false, erro: 'Imagem muito grande (máximo 2 MB)' }
  }

  const admin = createAdminClient()
  const { data: aula } = await admin
    .from('aulas')
    .select('espaco_id')
    .eq('id', aulaId)
    .maybeSingle()
  if (!aula || aula.espaco_id !== null) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const extensao = (arquivo.name.split('.').pop() ?? 'jpg').toLowerCase()
  const caminho = `capas/${aulaId}-${espacoId}.${extensao}`
  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar a imagem.' }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)

  const { error } = await admin
    .from('aula_capas_espaco')
    .upsert({ aula_id: aulaId, espaco_id: espacoId, capa_url: publicUrl })
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar a capa.' }
  }

  await revalidarEspaco(espacoId)
  revalidarConteudo()
  return { ok: true, erro: null }
}
```

- [ ] **Step 2: Escrever `removerCapaDoEspaco` e o auxiliar `revalidarEspaco`**

```ts
// Revalida a área de membros da marca afetada (o slug não vem no formulário).
async function revalidarEspaco(espacoId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('espacos').select('slug').eq('id', espacoId).maybeSingle()
  if (data?.slug) revalidatePath(`/${data.slug}`)
}

export async function removerCapaDoEspaco(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo?.ehAdmin) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const espacoId = String(formData.get('espacoId') ?? '')
  if (!aulaId || !espacoId) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { data: arquivos } = await admin.storage
    .from('conteudo')
    .list('capas', { search: `${aulaId}-${espacoId}` })
  const caminhos = (arquivos ?? []).map((a) => `capas/${a.name}`)
  if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)

  const { error } = await admin
    .from('aula_capas_espaco')
    .delete()
    .eq('aula_id', aulaId)
    .eq('espaco_id', espacoId)
  if (error) {
    return { ok: false, erro: 'Não foi possível remover a capa.' }
  }

  await revalidarEspaco(espacoId)
  revalidarConteudo()
  return { ok: true, erro: null }
}
```

Se `revalidatePath` ainda não estiver importado em `actions.ts`, acrescente `import { revalidatePath } from 'next/cache'`.

- [ ] **Step 3: Limpar as capas por marca ao excluir a aula**

Em `excluirAula`, no bloco que hoje monta `caminhos.push(\`capas/${aulaId}.${ext}\`)`, acrescentar antes da remoção:

```ts
  // Capas por marca desta aula (as linhas caem por ON DELETE CASCADE).
  const { data: capasMarca } = await admin.storage
    .from('conteudo')
    .list('capas', { search: `${aulaId}-` })
  for (const a of capasMarca ?? []) caminhos.push(`capas/${a.name}`)
```

- [ ] **Step 4: Prop `espacoId` e tipo mais frouxo no dialog de capa**

Em `capa-dialog.tsx`, hoje a prop `aula` é do tipo `AulaLinha` (a linha completa da tela de conteúdo). O bloco herdado da Task 13 tem um tipo menor, então relaxe a prop para o mínimo que o dialog usa — `AulaLinha` continua sendo atribuível a ele, e nada no uso atual quebra.

Substituir o import de `AulaLinha`, a assinatura e o `useActionState`:

```tsx
import { definirCapa, salvarCapaNoEspaco, type EstadoConteudo } from './actions'

// O dialog só precisa disto; AulaLinha satisfaz o formato.
export type AulaCapa = { id: string; titulo: string; capaUrl: string | null }

export function CapaDialog({
  aula,
  espacoId,
  onClose,
}: {
  aula: AulaCapa | null
  espacoId?: string
  onClose: () => void
}) {
  // Com espacoId, a capa é a exceção daquela marca; sem, é a capa base da aula.
  const [estado, acao, pendente] = useActionState(
    espacoId ? salvarCapaNoEspaco : definirCapa,
    estadoInicial
  )
```

A linha `import type { AulaLinha } from './dados'` deixa de ser usada — remova (o lint acusa).

Dentro do `<form>`, junto do hidden de `aulaId`:

```tsx
            {espacoId && <input type="hidden" name="espacoId" value={espacoId} />}
```

E no `DialogTitle`, refletir o contexto:

```tsx
              <DialogTitle>{espacoId ? 'Capa nesta marca' : 'Capa da aula'}</DialogTitle>
```

- [ ] **Step 5: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/actions.ts" "src/app/(auth)/admin/conteudo/capa-dialog.tsx"
git commit -m "feat: actions de capa por marca (salvar/remover) + limpeza no excluir"
```

---

### Task 13: Bloco "Conteúdo base (herdado)" na tela do admin

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/dados.ts`
- Create: `src/app/(auth)/admin/conteudo/base-herdada.tsx`
- Modify: `src/app/(auth)/admin/conteudo/page.tsx`

**Interfaces:**
- Consumes: `resolverCapa` (Task 11), `salvarCapaNoEspaco`/`removerCapaDoEspaco` (Task 12), `CapaDialog` com `espacoId` (Task 12).
- Produces:
  - `listarBaseComCapas(espacoId: string): Promise<ModuloBaseLinha[]>`, com
    `type AulaBaseLinha = { id: string; titulo: string; ordem: number; publicada: boolean; capaUrl: string | null; temCapaPropria: boolean }`
    e `type ModuloBaseLinha = { id: string; titulo: string; ordem: number; aulas: AulaBaseLinha[] }`
  - `<BaseHerdada modulos={…} espacoId={…} />`

`listarConteudo` **não muda** — `/mentor/conteudo` continua exibindo só o conteúdo próprio do mentorado.

- [ ] **Step 1: Escrever `listarBaseComCapas` em `dados.ts`**

```ts
export type AulaBaseLinha = {
  id: string
  titulo: string
  ordem: number
  publicada: boolean
  capaUrl: string | null
  temCapaPropria: boolean
}

export type ModuloBaseLinha = {
  id: string
  titulo: string
  ordem: number
  aulas: AulaBaseLinha[]
}

// Conteúdo base como a marca informada o vê (capa já resolvida). Somente leitura:
// serve à troca de capa por marca na tela do admin.
export async function listarBaseComCapas(espacoId: string): Promise<ModuloBaseLinha[]> {
  const admin = createAdminClient()

  const [{ data: modulos }, { data: aulas }, { data: capas }] = await Promise.all([
    admin.from('modulos').select('id, titulo, ordem').is('espaco_id', null).order('ordem'),
    admin
      .from('aulas')
      .select('id, modulo_id, titulo, ordem, publicada, capa_url')
      .is('espaco_id', null)
      .order('ordem'),
    admin.from('aula_capas_espaco').select('aula_id, capa_url').eq('espaco_id', espacoId),
  ])

  const capaPorAula = new Map((capas ?? []).map((c) => [c.aula_id, c.capa_url]))

  return (modulos ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
    ordem: m.ordem,
    aulas: (aulas ?? [])
      .filter((a) => a.modulo_id === m.id)
      .map((a) => ({
        id: a.id,
        titulo: a.titulo,
        ordem: a.ordem,
        publicada: a.publicada,
        capaUrl: resolverCapa(a.capa_url, capaPorAula.get(a.id) ?? null),
        temCapaPropria: capaPorAula.has(a.id),
      })),
  }))
}
```

Import novo no topo de `dados.ts`: `import { resolverCapa } from '@/lib/capas'`.

- [ ] **Step 2: Criar o componente do bloco**

`CapaDialog` é controlado pelo pai: fica fechado com `aula={null}` e abre quando recebe uma aula. Mesmo padrão de `conteudo-lista.tsx:44,251`.

```tsx
// src/app/(auth)/admin/conteudo/base-herdada.tsx
'use client'

import { useActionState, useState } from 'react'
import { removerCapaDoEspaco, type EstadoConteudo } from './actions'
import { CapaDialog } from './capa-dialog'
import type { AulaBaseLinha, ModuloBaseLinha } from './dados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

function BotaoRemoverCapa({ aulaId, espacoId }: { aulaId: string; espacoId: string }) {
  const [, acao, pendente] = useActionState(removerCapaDoEspaco, estadoInicial)
  return (
    <form action={acao}>
      <input type="hidden" name="aulaId" value={aulaId} />
      <input type="hidden" name="espacoId" value={espacoId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendente}>
        {pendente ? 'Removendo…' : 'Remover capa desta marca'}
      </Button>
    </form>
  )
}

// Conteúdo base visto por uma marca: só leitura, exceto a capa.
export function BaseHerdada({
  modulos,
  espacoId,
}: {
  modulos: ModuloBaseLinha[]
  espacoId: string
}) {
  const [capaDe, setCapaDe] = useState<AulaBaseLinha | null>(null)

  if (modulos.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conteúdo base (herdado)</CardTitle>
        <CardDescription>
          Aparece nesta marca junto com o conteúdo próprio. Só a capa pode ser trocada aqui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {modulos.map((modulo) => (
          <section key={modulo.id}>
            <h3 className="mb-3 text-sm font-semibold">{modulo.titulo}</h3>
            <div className="space-y-2">
              {modulo.aulas.map((aula) => (
                <div
                  key={aula.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">
                    {aula.capaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={aula.capaUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{aula.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {aula.temCapaPropria ? 'Capa própria desta marca' : 'Usando a capa base'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCapaDe(aula)}>
                    Trocar capa nesta marca
                  </Button>
                  {aula.temCapaPropria && (
                    <BotaoRemoverCapa aulaId={aula.id} espacoId={espacoId} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <CapaDialog aula={capaDe} espacoId={espacoId} onClose={() => setCapaDe(null)} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Renderizar na tela do admin**

Em `page.tsx`, `espacoSelecionado` já existe (linha 13). Depois do `const modulos = await listarConteudo(espacoSelecionado)` (linha 21):

```tsx
  const baseHerdada = espacoSelecionado ? await listarBaseComCapas(espacoSelecionado) : []
```

E no JSX, entre o cabeçalho e o `<ConteudoLista modulos={modulos} />` (linha 39):

```tsx
      {espacoSelecionado && <BaseHerdada modulos={baseHerdada} espacoId={espacoSelecionado} />}
```

Com a base selecionada (`espacoSelecionado === null`), nada muda na tela.

Imports: `listarBaseComCapas` de `./dados` e `BaseHerdada` de `./base-herdada`.

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run build && npm run test`
Expected: tudo verde.

- [ ] **Step 5: Verificação manual**

Run: `npm run dev`. Como admin: `/admin/conteudo` sem marca selecionada continua idêntico ao de hoje. Selecionar a marca A → aparece "Conteúdo base (herdado)". Trocar a capa de uma aula base; abrir `/A` e ver a capa nova; abrir `/B` e ver que continua a base. Clicar em "Remover capa desta marca" e confirmar que `/A` volta à capa base. Entrar como mentorado e confirmar que `/mentor/conteudo` continua sem exibir conteúdo base.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/dados.ts" "src/app/(auth)/admin/conteudo/base-herdada.tsx" "src/app/(auth)/admin/conteudo/page.tsx"
git commit -m "feat: bloco de conteudo base herdado com troca de capa por marca"
```

---

### Task 14: Teste de integração da RLS das capas por marca

**Files:**
- Create: `src/test/capas-por-espaco.integration.test.ts`

**Interfaces:**
- Consumes: tabela da Task 10.
- Produces: nada.

Mesmo formato de `src/test/isolamento-conteudo.integration.test.ts`: cria os próprios dados, pula sem as variáveis de ambiente, limpa no fim.

- [ ] **Step 1: Escrever o teste**

```ts
// @vitest-environment node
//
// Teste de INTEGRAÇÃO da RLS de aula_capas_espaco: a revendedora de um espaço lê a
// capa por marca do próprio espaço e nunca a de outro. Precisa das variáveis do
// Supabase; sem elas, o bloco é pulado.
import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const temEnv = Boolean(url && anon && service)

const svc: SupabaseClient | null = temEnv
  ? createClient(url as string, service as string, { auth: { persistSession: false } })
  : null

const SENHA = 'TesteCapas123!'
const carimbo = Date.now()
const emailA = `rev.capas.${carimbo}@teste.local`

const ids: Record<string, string | undefined> = {}

async function inserir(tabela: string, valores: Record<string, unknown>): Promise<string> {
  const { data, error } = await svc!.from(tabela).insert(valores).select('id').single()
  if (error) throw new Error(`insert ${tabela}: ${error.message}`)
  return (data as { id: string }).id
}

describe.skipIf(!temEnv)('capas por espaço (RLS)', () => {
  beforeAll(async () => {
    ids.espacoA = await inserir('espacos', { slug: `capa-a-${carimbo}`, nome_curso: 'CAPA A' })
    ids.espacoB = await inserir('espacos', { slug: `capa-b-${carimbo}`, nome_curso: 'CAPA B' })

    const { data: u, error: eu } = await svc!.auth.admin.createUser({
      email: emailA,
      password: SENHA,
      email_confirm: true,
    })
    if (eu) throw new Error(`createUser: ${eu.message}`)
    ids.userA = u.user.id
    await svc!.from('user_roles').insert({ user_id: ids.userA, role: 'revendedor' })
    await svc!
      .from('revendedores')
      .insert({ user_id: ids.userA, espaco_id: ids.espacoA, email: emailA, status: 'ativo' })

    ids.modBase = await inserir('modulos', { titulo: 'CAPA Base', ordem: 1, espaco_id: null })
    ids.aulaBase = await inserir('aulas', {
      modulo_id: ids.modBase,
      titulo: 'CAPA Base Aula',
      ordem: 1,
      publicada: true,
      espaco_id: null,
      capa_url: 'https://exemplo.test/base.jpg',
    })

    await svc!.from('aula_capas_espaco').insert([
      { aula_id: ids.aulaBase, espaco_id: ids.espacoA, capa_url: 'https://exemplo.test/a.jpg' },
      { aula_id: ids.aulaBase, espaco_id: ids.espacoB, capa_url: 'https://exemplo.test/b.jpg' },
    ])
  }, 30000)

  afterAll(async () => {
    if (!svc) return
    await svc.from('aulas').delete().in('id', [ids.aulaBase].filter(Boolean) as string[])
    await svc.from('modulos').delete().in('id', [ids.modBase].filter(Boolean) as string[])
    if (ids.userA) {
      await svc.from('revendedores').delete().eq('user_id', ids.userA)
      await svc.from('user_roles').delete().eq('user_id', ids.userA)
      await svc.auth.admin.deleteUser(ids.userA)
    }
    await svc.from('espacos').delete().in(
      'id',
      [ids.espacoA, ids.espacoB].filter(Boolean) as string[]
    )
  }, 30000)

  it('revendedora de A lê só a capa de A', async () => {
    const cli = createClient(url as string, anon as string, { auth: { persistSession: false } })
    const { error } = await cli.auth.signInWithPassword({ email: emailA, password: SENHA })
    if (error) throw new Error(`login: ${error.message}`)

    const { data } = await cli.from('aula_capas_espaco').select('espaco_id, capa_url')
    const espacos = (data ?? []).map((c) => c.espaco_id)
    expect(espacos).toContain(ids.espacoA)
    expect(espacos).not.toContain(ids.espacoB)
  })
})
```

- [ ] **Step 2: Rodar o teste**

Run: `npx vitest run src/test/capas-por-espaco.integration.test.ts`
Expected: PASS (ou "skipped" se as variáveis do Supabase não estiverem no `.env`).

- [ ] **Step 3: Rodar a suíte inteira**

Run: `npm run test`
Expected: tudo verde, incluindo o teste de isolamento que já existia.

- [ ] **Step 4: Commit**

```bash
git add src/test/capas-por-espaco.integration.test.ts
git commit -m "test: RLS de capas por espaco (revendedora nao le a de outra marca)"
```

---

## Verificação final

- [ ] `npm run lint` — sem erros
- [ ] `npm run build` — build de produção completa
- [ ] `npm run test` — toda a suíte verde
- [ ] Atualizar `PENDENCIAS.md` se alguma pendência foi resolvida ou criada
