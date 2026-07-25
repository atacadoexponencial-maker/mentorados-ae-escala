# Admin gerencia qualquer marca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans. Passos com checkbox `- [ ]`.

**Goal:** Admin vê/edita o conteúdo de qualquer mentorado; mentorado só o próprio; isolamento mentorado↔mentorado intacto. Detalhe por arquivo no spec `2026-07-25-admin-gerencia-qualquer-marca-design.md`.

**Global Constraints:** autorização no backend; `podeGerenciarEspaco` é a única regra de escrita e deve ser pura/testável; não afrouxar o isolamento (o teste de RLS existente segue verde); `npm run lint`/`build`/`test` verdes.

---

### Task 1: Regra pura + teste unitário

**Files:** Create `src/app/(auth)/admin/conteudo/autorizacao.ts`, `src/test/autorizacao-conteudo.test.ts`

- [ ] **Step 1:** Criar `autorizacao.ts` com `EscopoConteudo` e `podeGerenciarEspaco` (ver spec §1).
- [ ] **Step 2:** Escrever `src/test/autorizacao-conteudo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { podeGerenciarEspaco } from '@/app/(auth)/admin/conteudo/autorizacao'

const admin = { ehAdmin: true, espacoId: null }
const mentorA = { ehAdmin: false, espacoId: 'A' }

describe('podeGerenciarEspaco', () => {
  it('admin gerencia qualquer espaço (base, A, B)', () => {
    expect(podeGerenciarEspaco(admin, null)).toBe(true)
    expect(podeGerenciarEspaco(admin, 'A')).toBe(true)
    expect(podeGerenciarEspaco(admin, 'B')).toBe(true)
  })
  it('mentor só o próprio; negado em outro e na base', () => {
    expect(podeGerenciarEspaco(mentorA, 'A')).toBe(true)
    expect(podeGerenciarEspaco(mentorA, 'B')).toBe(false)
    expect(podeGerenciarEspaco(mentorA, null)).toBe(false)
  })
})
```

- [ ] **Step 3:** `npx vitest run src/test/autorizacao-conteudo.test.ts` → PASS.
- [ ] **Step 4:** Commit `feat: regra pura podeGerenciarEspaco + teste unitario`.

---

### Task 2: `escopo.ts` admin-aware

**Files:** Modify `src/app/(auth)/admin/conteudo/escopo.ts`

- [ ] **Step 1:** `exigirEscopoConteudo` retorna `EscopoConteudo | null` (admin `{ehAdmin:true,espacoId:null}`, mentor `{ehAdmin:false,espacoId:own}`); importar o tipo de `./autorizacao`.
- [ ] **Step 2:** `conteudoNoEscopo(tabela, id, escopo: EscopoConteudo)` → carrega `espaco_id` e retorna `podeGerenciarEspaco(escopo, row.espaco_id)`.
- [ ] **Step 3:** `npm run build` (vai quebrar nas actions — segue na Task 3).
- [ ] **Step 4:** Commit junto da Task 3 (o build só fecha depois).

---

### Task 3: Actions com a nova regra

**Files:** Modify `src/app/(auth)/admin/conteudo/actions.ts`

- [ ] **Step 1:** Trocar todas as chamadas `conteudoNoEscopo('x', id, escopo.espacoId)` por `conteudoNoEscopo('x', id, escopo)`.
- [ ] **Step 2:** `criarModulo`: `const alvo = escopo.ehAdmin ? (String(formData.get('espacoAlvo') ?? '') || null) : escopo.espacoId`; usar `alvo` em `filtrarEscopo(...)` e `espaco_id: alvo`.
- [ ] **Step 3:** `criarAula`: após autorizar o módulo, ler `espaco_id` do módulo e gravar na aula (`espaco_id: moduloEspaco`), em vez de `escopo.espacoId`.
- [ ] **Step 4:** `moverModulo`: ler `espaco_id` do `moduloId`, e `filtrarEscopo(modulos.select, espacoDoModulo)` para reordenar dentro do espaço certo.
- [ ] **Step 5:** `moverAulaParaModulo`: além das duas autorizações, exigir mesmo espaço — ler `espaco_id` da aula e do módulo-destino e comparar; se diferentes, `return`.
- [ ] **Step 6:** `npm run lint && npm run build` verdes.
- [ ] **Step 7:** Commit `refactor: actions de conteudo com autorizacao admin-aware`.

---

### Task 4: Seletor de espaço na tela do admin

**Files:** Create `src/app/(auth)/admin/conteudo/seletor-espaco.tsx`; Modify `src/app/(auth)/admin/conteudo/page.tsx`, `src/app/(auth)/admin/conteudo/novo-modulo-dialog.tsx`

- [ ] **Step 1:** `NovoModuloDialog`: prop opcional `espacoAlvo?: string | null` → `<input type="hidden" name="espacoAlvo" value={espacoAlvo ?? ''} />`.
- [ ] **Step 2:** `SeletorEspaco` (client): recebe `espacos: {id,nome_curso}[]` e `atual: string|null`; um `<select>` com "Base (compartilhada)" + espaços; `onChange` → `router.push('/admin/conteudo' + (id ? '?espaco='+id : ''))`.
- [ ] **Step 3:** `page.tsx`: `async function ConteudoPage({ searchParams })`; ler `espaco` de `await searchParams` (Next 16); carregar espaços (`select id, nome_curso` ordenado por nome) via service client (ou reutilizar dados existentes); `listarConteudo(espacoSelecionado)`; renderizar `<SeletorEspaco …/>` e passar `espacoAlvo` ao `NovoModuloDialog`. Conferir a assinatura de `searchParams` no doc do Next (`node_modules/next/dist/docs`).
- [ ] **Step 4:** `npm run lint && npm run build` verdes.
- [ ] **Step 5:** Commit `feat: seletor de marca na tela de conteudo do admin`.

---

### Task 5: Verificação (Playwright + testes) + limpeza

- [ ] **Step 1:** `npm run test` → todos verdes (unit `podeGerenciarEspaco` + integração RLS).
- [ ] **Step 2:** Playwright: admin em `/admin/conteudo` → seletor mostra "Base" + mentorados; escolher o mentorado, criar um módulo+aula nele; confirmar que aparece; logar como o mentorado dono e confirmar que ele vê; (opcional) confirmar via script que outro mentorado não vê.
- [ ] **Step 3:** Limpar o conteúdo de teste criado; `npm run lint && npm run build` verdes.
- [ ] **Step 4:** Commit final se houver ajuste.

---

## Notas
- Contas de teste: senha `DemoTemp2026!`. Admin real: `atacadoexponencial@gmail.com` (no Supabase).
- Não mover conteúdo entre marcas (mesmo admin) — a Task 3 Step 5 garante.
