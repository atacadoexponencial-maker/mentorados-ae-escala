# Conteúdo por Mentorado (Entrega 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada mentorado cria e gerencia as próprias aulas (além da base compartilhada do admin), com isolamento 100% entre marcas garantido por RLS na leitura e por escopo por papel na escrita.

**Architecture:** `espaco_id` opcional em `modulos`/`aulas` (NULL = base). RLS de SELECT entrega `base + próprio espaço` e esconde rascunho/alheio. Escrita passa pelo service client (ignora RLS), então a autorização vive nas server actions via um helper de escopo (`exigirEscopoConteudo`) reusado entre `/admin/conteudo` e `/mentor/conteudo`.

**Tech Stack:** Next.js 16 (App Router, server actions), TypeScript, Supabase (Postgres + RLS, service client para escrita), Playwright MCP para verificação.

## Global Constraints

- Este Next.js tem breaking changes; consultar `node_modules/next/dist/docs/` antes de padrões novos (`AGENTS.md`).
- Lógica/validação/autorização sempre no backend. Nunca no frontend.
- `src/integrations/supabase/types.ts` é auto-gerado; regenerar via CLI (`supabase gen types`, exige Docker) ou, se indisponível, ajustar à mão a coluna nova (Row/Insert/Update), como já foi feito para `banner_url`.
- Escrita só via service client (`createAdminClient`); leitura via client de sessão (RLS).
- Isolamento é requisito de segurança: um mentorado nunca lê nem escreve conteúdo de outro espaço; revendedora só vê `base + próprio` e só aulas publicadas.
- Vídeo continua por **ID do Panda** (upload é a Entrega 2). UI em pt-BR.
- Sem suíte de testes: verificação por `npm run lint` + `npm run build`, Playwright MCP (logins de teste, senha `DemoTemp2026!`) e scripts Node de checagem direta no banco.

---

### Task 1: Migration — `espaco_id` em `modulos` e `aulas`

**Files:**
- Create: `supabase/migrations/20260724100000_conteudo_por_espaco.sql`
- Modify: `src/integrations/supabase/types.ts`

**Interfaces:**
- Produces: colunas `modulos.espaco_id` e `aulas.espaco_id` (`UUID NULL`), com índice.

- [ ] **Step 1: Criar a migration (só colunas + índices; RLS na Task 2)**

`supabase/migrations/20260724100000_conteudo_por_espaco.sql`:

```sql
-- Conteúdo por espaço: NULL = base compartilhada (admin); preenchido = do mentorado.
-- espaco_id da aula é denormalizado (= o do módulo) para o RLS ser comparação direta.
ALTER TABLE public.modulos ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
ALTER TABLE public.aulas   ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
CREATE INDEX modulos_espaco_idx ON public.modulos (espaco_id);
CREATE INDEX aulas_espaco_idx   ON public.aulas (espaco_id);
```

- [ ] **Step 2: Aplicar no banco**

Run: `DBURL=$(grep '^SUPABASE_DB_URL=' .env | cut -d= -f2-) && npx supabase db push --db-url "$DBURL"`
Expected: aplica `20260724100000_conteudo_por_espaco.sql` sem erro.

- [ ] **Step 3: Refletir nos tipos**

Tentar `npx supabase gen types typescript --db-url "$DBURL" > src/integrations/supabase/types.ts`. Se falhar (Docker indisponível), editar à mão: em `types.ts`, na tabela `modulos` e na tabela `aulas`, adicionar `espaco_id: string | null` no `Row`, e `espaco_id?: string | null` no `Insert` e no `Update`.
Verificar: `grep -c "espaco_id" src/integrations/supabase/types.ts` retorna ≥ 6 (banner já usa espaco em outras; conferir que modulos/aulas têm).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260724100000_conteudo_por_espaco.sql src/integrations/supabase/types.ts
git commit -m "feat: coluna espaco_id em modulos e aulas (conteudo por mentorado)"
```

---

### Task 2: RLS — SELECT isolado em `modulos`, `aulas`, `aula_materiais`

**Files:**
- Create: `supabase/migrations/20260724100100_conteudo_rls_escopo.sql`

**Interfaces:**
- Produces: leitura scoped — revendedora vê `base + próprio` e só publicadas; mentorado vê o próprio (inclui rascunho) + base; admin vê tudo.

- [ ] **Step 1: Criar a migration de RLS**

`supabase/migrations/20260724100100_conteudo_rls_escopo.sql`:

```sql
-- modulos: base OU dono-mentorado OU revendedora-do-espaço OU admin
DROP POLICY "modulos_select_autenticados" ON public.modulos;
CREATE POLICY "modulos_select_escopo"
  ON public.modulos FOR SELECT TO authenticated
  USING (
    espaco_id IS NULL
    OR public.has_role(auth.uid(), 'admin')
    OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
  );

-- aulas: visibilidade de espaço E visibilidade de rascunho
DROP POLICY "aulas_select_publicadas_ou_admin" ON public.aulas;
CREATE POLICY "aulas_select_escopo"
  ON public.aulas FOR SELECT TO authenticated
  USING (
    (
      espaco_id IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
      OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
    )
    AND (
      publicada = true
      OR public.has_role(auth.uid(), 'admin')
      OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    )
  );

-- materiais: seguem a mesma visibilidade da aula (espaço + rascunho)
DROP POLICY "aula_materiais_select" ON public.aula_materiais;
CREATE POLICY "aula_materiais_select"
  ON public.aula_materiais FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas a
      WHERE a.id = aula_materiais.aula_id
        AND (
          a.espaco_id IS NULL
          OR public.has_role(auth.uid(), 'admin')
          OR a.espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
          OR a.espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
        )
        AND (
          a.publicada = true
          OR public.has_role(auth.uid(), 'admin')
          OR a.espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
        )
    )
  );
```

- [ ] **Step 2: Aplicar no banco**

Run: `DBURL=$(grep '^SUPABASE_DB_URL=' .env | cut -d= -f2-) && npx supabase db push --db-url "$DBURL"`
Expected: aplica sem erro.

- [ ] **Step 3: Verificar isolamento de leitura (script)**

Criar `_tmp_rls_check.mjs` (na raiz, apagar depois) que usa `@supabase/supabase-js` com a ANON key e faz login como `revendedora.teste@gmail.com` / `DemoTemp2026!`; inserir antes, via service key, um módulo de teste com `espaco_id` de OUTRO espaço (ex.: `carla-modas`) e uma aula publicada nele; então consultar `modulos`/`aulas` com o client logado e confirmar que o conteúdo do outro espaço **não** volta. Rodar via cópia para o projeto (padrão já usado nesta sessão) e apagar o módulo de teste ao fim.
Expected: a revendedora do joao-atacados não recebe o módulo/aula do carla-modas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260724100100_conteudo_rls_escopo.sql
git commit -m "feat: RLS de leitura isolada por espaco em modulos/aulas/materiais"
```

---

### Task 3: Helpers de escopo de conteúdo

**Files:**
- Create: `src/app/(auth)/admin/conteudo/escopo.ts`

**Interfaces:**
- Produces:
  - `exigirEscopoConteudo(): Promise<{ espacoId: string | null } | null>` — admin→`{espacoId:null}`, mentorado→`{espacoId:<próprio>}`, senão `null`.
  - `filtrarEscopo(query, espacoId)` — aplica `.is('espaco_id', null)` ou `.eq('espaco_id', espacoId)`.
  - `conteudoNoEscopo(tabela, id, espacoId): Promise<boolean>` — confirma que a linha `id` tem `espaco_id` igual ao escopo.

- [ ] **Step 1: Escrever o helper**

`src/app/(auth)/admin/conteudo/escopo.ts`:

```ts
import 'server-only'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'

// admin gerencia a base (espaco_id null); mentorado gerencia o proprio espaco.
export async function exigirEscopoConteudo(): Promise<{ espacoId: string | null } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ehAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (ehAdmin) return { espacoId: null }

  const { data: ehMentorado } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'mentorado',
  })
  if (!ehMentorado) return null

  const { data: espaco } = await supabase
    .from('espacos')
    .select('id')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()
  if (!espaco) return null
  return { espacoId: espaco.id }
}

// Aplica o filtro de espaco a uma query (null precisa de .is, nao .eq).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filtrarEscopo(query: any, espacoId: string | null) {
  return espacoId === null ? query.is('espaco_id', null) : query.eq('espaco_id', espacoId)
}

// Confirma que a linha pertence ao escopo (espaco_id igual, tratando null).
export async function conteudoNoEscopo(
  tabela: 'modulos' | 'aulas',
  id: string,
  espacoId: string | null
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from(tabela).select('espaco_id').eq('id', id).maybeSingle()
  if (!data) return false
  return (data.espaco_id ?? null) === espacoId
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: sem erros (helper ainda não usado).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/escopo.ts"
git commit -m "feat: helpers de escopo de conteudo (admin/mentor)"
```

---

### Task 4: Refatorar ações de MÓDULO para escopo

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/actions.ts` (criarModulo, editarModulo, moverModulo, excluirModulo)

**Interfaces:**
- Consumes: `exigirEscopoConteudo`, `filtrarEscopo`, `conteudoNoEscopo` (Task 3).
- Produces: ações de módulo scoped; assinaturas inalteradas (escopo vem da sessão).

- [ ] **Step 1: Importar os helpers e revalidar as duas telas**

No topo de `actions.ts`, adicionar:

```ts
import { exigirEscopoConteudo, filtrarEscopo, conteudoNoEscopo } from './escopo'
```

Criar uma função local para revalidar ambas as telas:

```ts
function revalidarConteudo() {
  revalidatePath('/admin/conteudo')
  revalidatePath('/mentor/conteudo')
}
```

Substituir todas as chamadas `revalidatePath('/admin/conteudo')` do arquivo por `revalidarConteudo()`.

- [ ] **Step 2: `criarModulo` — escopo + ordem por espaço + carimbar espaco_id**

Trocar o guard e a query de ordem/insert:

```ts
export async function criarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!titulo) return { ok: false, erro: 'Informe o nome do módulo' }

  const admin = createAdminClient()
  const { data: ultimo } = await filtrarEscopo(
    admin.from('modulos').select('ordem'),
    escopo.espacoId
  )
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('modulos').insert({
    titulo,
    descricao: descricao || null,
    ordem: (ultimo?.ordem ?? 0) + 1,
    espaco_id: escopo.espacoId,
  })
  if (error) return { ok: false, erro: 'Não foi possível criar o módulo. Tente novamente.' }

  revalidarConteudo()
  return { ok: true, erro: null }
}
```

- [ ] **Step 3: `editarModulo` — verificar posse antes**

Trocar o guard e adicionar checagem de posse:

```ts
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }
  // ...após validar moduloId/titulo:
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }
```

(Manter o resto do corpo; trocar `revalidatePath('/admin/conteudo')` por `revalidarConteudo()`.)

- [ ] **Step 4: `moverModulo` — reordenar só dentro do escopo**

```ts
export async function moverModulo(moduloId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  const admin = createAdminClient()

  const { data: modulos } = await filtrarEscopo(
    admin.from('modulos').select('id, ordem'),
    escopo.espacoId
  ).order('ordem')
  if (!modulos) return

  const indice = modulos.findIndex((m: { id: string }) => m.id === moduloId)
  const vizinho = direcao === 'cima' ? modulos[indice - 1] : modulos[indice + 1]
  if (indice === -1 || !vizinho) return

  const atual = modulos[indice]
  await admin.from('modulos').update({ ordem: vizinho.ordem }).eq('id', atual.id)
  await admin.from('modulos').update({ ordem: atual.ordem }).eq('id', vizinho.id)

  revalidarConteudo()
}
```

- [ ] **Step 5: `excluirModulo` — verificar posse antes**

Após o guard `const escopo = await exigirEscopoConteudo(); if (!escopo) return`, adicionar:

```ts
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) return
```

(Manter a checagem de "sem aulas" e o delete; `revalidarConteudo()`.)

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 7: Verificar não-regressão do admin (Playwright)**

Subir `npm run dev`, logar como admin (`admin.teste@...`), em `/admin/conteudo` criar um módulo, editar, mover e excluir (vazio). Expected: tudo funciona como antes.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/actions.ts"
git commit -m "refactor: acoes de modulo com escopo por espaco"
```

---

### Task 5: Refatorar ações de AULA para escopo

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/actions.ts` (criarAula, editarAula, moverAula, moverAulaParaModulo, publicarAula, despublicarAula, excluirAula)

**Interfaces:**
- Consumes: helpers da Task 3.
- Produces: ações de aula scoped; a aula herda `espaco_id` do módulo.

- [ ] **Step 1: `criarAula` — verificar módulo no escopo e herdar espaco_id**

```ts
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }
  // ...após validar moduloId/titulo:
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }
```

E no `insert`, acrescentar `espaco_id: escopo.espacoId` junto aos demais campos.

- [ ] **Step 2: `editarAula`, `publicarAula`, `despublicarAula`, `excluirAula` — verificar posse da aula**

Em cada uma, trocar o guard por `const escopo = await exigirEscopoConteudo(); if (!escopo) return[...]` e, antes de agir sobre o `aulaId`, adicionar:

```ts
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return // (nas que retornam void)
    // ou: return { ok: false, erro: 'Acesso negado' }  (editarAula)
  }
```

Trocar `revalidatePath('/admin/conteudo')` por `revalidarConteudo()`.

- [ ] **Step 3: `moverAula` — verificar posse e reordenar no módulo**

Após o guard de escopo, adicionar `if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return`. O resto (reordenar dentro do `modulo_id` da aula) permanece — as aulas do mesmo módulo já compartilham o espaço.

- [ ] **Step 4: `moverAulaParaModulo` — origem e destino no escopo**

Após o guard, exigir que aula e módulo de destino pertençam ao escopo:

```ts
  if (
    !(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId)) ||
    !(await conteudoNoEscopo('modulos', moduloDestinoId, escopo.espacoId))
  ) {
    return
  }
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 6: Não-regressão do admin (Playwright)**

Como admin em `/admin/conteudo`: criar aula com ID do Panda, editar, publicar/despublicar, mover entre módulos, excluir. Expected: tudo funciona.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/actions.ts"
git commit -m "refactor: acoes de aula com escopo por espaco"
```

---

### Task 6: Refatorar CAPA e MATERIAIS para escopo

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/actions.ts` (definirCapa, adicionarMaterialArquivo, adicionarMaterialLink, removerMaterial)

- [ ] **Step 1: `definirCapa`, `adicionarMaterialArquivo`, `adicionarMaterialLink` — posse da aula**

Em cada uma, trocar o guard por escopo e, após obter `aulaId`, adicionar:

```ts
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }
```

`revalidatePath` → `revalidarConteudo()`.

- [ ] **Step 2: `removerMaterial` — posse via aula do material**

`removerMaterial(materialId)` não tem `aulaId` direto. Após o guard de escopo, carregar a aula do material e verificar:

```ts
  const admin = createAdminClient()
  const { data: material } = await admin
    .from('aula_materiais')
    .select('url, aula_id')
    .eq('id', materialId)
    .maybeSingle()
  if (!material) return
  if (!(await conteudoNoEscopo('aulas', material.aula_id, escopo.espacoId))) return
```

(Manter o delete e a limpeza do storage; `revalidarConteudo()`.)

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 4: Não-regressão do admin (Playwright)**

Como admin: definir capa de uma aula, adicionar material por arquivo e por link, remover material. Expected: funciona.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/actions.ts"
git commit -m "refactor: capa e materiais com escopo por espaco"
```

---

### Task 7: `listarConteudo(espacoId)` scoped + página do admin

**Files:**
- Modify: `src/app/(auth)/admin/conteudo/dados.ts`
- Modify: `src/app/(auth)/admin/conteudo/page.tsx`

**Interfaces:**
- Produces: `listarConteudo(espacoId: string | null)` — carrega só os módulos/aulas do escopo.

- [ ] **Step 1: Parametrizar `listarConteudo`**

Em `dados.ts`, importar `filtrarEscopo` de `./escopo` e mudar a assinatura para `listarConteudo(espacoId: string | null)`. Aplicar `filtrarEscopo(admin.from('modulos').select(...), espacoId)` na query de módulos, e filtrar as aulas pelos `modulo_id` carregados (ou aplicar `filtrarEscopo` também na query de aulas). Materiais seguem pelas aulas já filtradas.

- [ ] **Step 2: Página do admin passa `null`**

Em `admin/conteudo/page.tsx`, trocar a chamada `listarConteudo()` por `listarConteudo(null)`.

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 4: Não-regressão (Playwright)**

Admin em `/admin/conteudo` vê só a base (espaco_id null), como antes. Expected: base intacta.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/admin/conteudo/dados.ts" "src/app/(auth)/admin/conteudo/page.tsx"
git commit -m "refactor: listarConteudo por escopo; admin carrega a base"
```

---

### Task 8: Tela `/mentor/conteudo` + nav

**Files:**
- Create: `src/app/(auth)/mentor/conteudo/page.tsx`
- Modify: `src/app/(auth)/mentor/layout.tsx` (link na nav)

**Interfaces:**
- Consumes: `listarConteudo`, `exigirMentorado`, e os componentes de lista/diálogos de `admin/conteudo`.

- [ ] **Step 1: Página do mentor reusando os componentes**

Criar `src/app/(auth)/mentor/conteudo/page.tsx` espelhando `admin/conteudo/page.tsx`, mas carregando o escopo do mentorado. Ler o padrão do arquivo do admin primeiro; então:

```tsx
import { redirect } from 'next/navigation'
import { exigirMentorado } from '../revendedores/actions'
import { listarConteudo } from '@/app/(auth)/admin/conteudo/dados'
import { ConteudoLista } from '@/app/(auth)/admin/conteudo/conteudo-lista'

export default async function ConteudoMentorPage() {
  const contexto = await exigirMentorado()
  if (!contexto) redirect('/login')
  const modulos = await listarConteudo(contexto.espacoId)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conteúdo</h1>
        <p className="text-sm text-muted-foreground">
          As aulas do seu espaço. Aparecem no catálogo abaixo do conteúdo da AE Escala.
        </p>
      </div>
      <ConteudoLista modulos={modulos} />
    </div>
  )
}
```

(Ajustar o import/props de `ConteudoLista` ao que o componente real expõe — conferir `admin/conteudo/conteudo-lista.tsx` e a page do admin. As ações que o componente chama já resolvem o escopo pela sessão, então funcionam para o mentorado sem mudança.)

- [ ] **Step 2: Link "Conteúdo" na nav do mentor**

Em `src/app/(auth)/mentor/layout.tsx`, dentro do `<nav>`, adicionar antes de "Revendedores":

```tsx
<Link href="/mentor/conteudo" className="text-muted-foreground hover:text-foreground">
  Conteúdo
</Link>
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 4: Verificar fluxo do mentor (Playwright)**

Logar como mentorado (`mentorado.teste@joaoatacados.com.br`), abrir `/mentor/conteudo`: criar módulo próprio, criar aula com um ID do Panda, definir capa, publicar. Expected: aparece na lista do mentor; NÃO aparece em `/admin/conteudo` (que mostra só a base).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/mentor/conteudo/page.tsx" "src/app/(auth)/mentor/layout.tsx"
git commit -m "feat: tela /mentor/conteudo reusando a gestao de conteudo"
```

---

### Task 9: Catálogo — base primeiro, depois o do mentorado

**Files:**
- Modify: `src/app/[espaco]/page.tsx` (query de módulos)

- [ ] **Step 1: Ordenar módulos base antes dos do espaço**

Na query de `modulos` do catálogo, trocar `.order('ordem')` por ordenação por espaço primeiro:

```ts
supabase.from('modulos').select('id, titulo, ordem').order('espaco_id', { nullsFirst: true }).order('ordem'),
```

(O RLS já entrega só `base + próprio`; a mudança é só a ordem: base — `espaco_id NULL` — primeiro.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Verificar no catálogo (Playwright)**

Com uma aula publicada pelo mentor (Task 8), logar como revendedora do joao-atacados e abrir `/joao-atacados`: as seções da base aparecem primeiro, e a seção criada pelo mentor aparece depois.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[espaco]/page.tsx"
git commit -m "feat: catalogo mostra base primeiro e depois o conteudo do mentorado"
```

---

### Task 10: Verificação de isolamento (segurança) + limpeza

**Files:** script temporário `_tmp_isolamento.mjs` (raiz, apagar ao fim); commit só se ajuste for necessário.

- [ ] **Step 1: Preparar conteúdo em dois espaços**

Como mentorado do joao-atacados, criar um módulo+aula publicada. Via service key (script), criar um módulo+aula publicada com `espaco_id` do `carla-modas`.

- [ ] **Step 2: Isolamento de LEITURA (client de sessão)**

Script logando como `mentorado.teste` (joao-atacados) com a ANON key: consultar `modulos`/`aulas` e confirmar que os do `carla-modas` **não** voltam. Repetir logando como `revendedora.teste`: não vê conteúdo do carla-modas nem rascunhos do próprio espaço.
Expected: nenhum vazamento entre espaços.

- [ ] **Step 3: Isolamento de ESCRITA (server actions)**

Com o dev server, logada como `mentorado.teste`, tentar disparar `excluirAula`/`editarAula` com o `id` de uma aula do carla-modas (via chamada direta do form ou manipulando o id no cliente). Expected: ação negada (nada muda no carla-modas), porque `conteudoNoEscopo` falha.

- [ ] **Step 4: Não-regressão final do admin**

Como admin, `/admin/conteudo` continua gerindo a base; o conteúdo base aparece em todos os espaços; o admin não vê o conteúdo do mentorado na sua tela.

- [ ] **Step 5: Lint + build finais + limpeza**

Run: `npm run lint && npm run build`. Apagar os módulos/aulas de teste criados (script), remover `_tmp_*.mjs`. Expected: verdes e banco limpo.

- [ ] **Step 6: Commit (se houver ajuste)**

```bash
git add -A
git commit -m "test: verificacao de isolamento de conteudo por espaco"
```

---

## Notas de execução

- Contas de teste com senha `DemoTemp2026!` (definidas nesta sessão): `admin.teste@atacadoexponencial.com.br`, `mentorado.teste@joaoatacados.com.br` (dono do joao-atacados), `revendedora.teste@gmail.com` (revendedora do joao-atacados). O `carla-modas` é dono `carla.teste@...` (útil como "espaço B" no teste de isolamento).
- `_tmp_*.mjs` são copiados para a raiz do projeto para achar o `node_modules` e apagados após uso (padrão já usado nesta sessão). Upload/`gen types` que dependem de Docker podem exigir ajuste manual, já previsto.
- Reuso: as server actions resolvem o escopo pela sessão, então os MESMOS componentes e ações servem admin e mentor sem duplicar — a diferença é só qual conteúdo cada página carrega.
