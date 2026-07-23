# Acabamento Visual "Igual ao Exemplo" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar a área de membros idêntica à referência essenciademenina (hover nos cards, snap nas fileiras, banner em imagem por mentorado) e alinhar levemente o painel admin/mentor.

**Architecture:** A estrutura (header, fileiras, cards, página da aula) e a pele (tema escuro + Satoshi) já foram portadas. Este plano adiciona: duas utilities CSS (`card-tilt`, `row-scroll`), uma coluna `banner_url` em `espacos` com upload espelhando a logo, o render do banner no catálogo com fallback para o degradê atual, e ajustes de consistência de className no admin/mentor.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4 (CSS `@utility`), Supabase (Postgres + Storage bucket público `conteudo`), server actions.

## Global Constraints

- Este Next.js tem breaking changes; consultar `node_modules/next/dist/docs/` antes de padrões novos (ver `AGENTS.md`).
- Lógica/validação/autorização sempre no backend (server actions com `exigirMentorado`). Nunca no frontend.
- `src/integrations/supabase/types.ts` é auto-gerado — regenerar via CLI, não editar à mão.
- Escrita no banco/storage só via service client (`createAdminClient`); leitura via client de sessão (RLS).
- Não introduzir nova lógica de negócio, RLS ou mudança de autorização.
- Verificação sem suíte de testes: `npm run lint` + `npm run build` verdes e conferência visual via Playwright MCP (logins de teste, senha `DemoTemp2026!`).
- UI em pt-BR.

---

### Task 1: Utilities `card-tilt` e `row-scroll` + aplicar no catálogo

**Files:**
- Modify: `src/app/globals.css` (após o bloco `@layer base`, fim do arquivo)
- Modify: `src/app/[espaco]/page.tsx:138` (container da fileira) e `:140-144` (Link do card)

**Interfaces:**
- Consumes: token `--shadow-card` já definido em `globals.css` (`@theme inline`).
- Produces: classes CSS globais `card-tilt` e `row-scroll` usáveis em qualquer componente.

- [ ] **Step 1: Adicionar as utilities ao final de `globals.css`**

Acrescentar ao fim do arquivo `src/app/globals.css`:

```css
@utility card-tilt {
  transition: transform 220ms ease, box-shadow 220ms ease;
  &:hover {
    transform: scale(1.04);
    box-shadow: var(--shadow-card);
  }
}

@utility row-scroll {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  & > * {
    scroll-snap-align: start;
    flex: 0 0 auto;
  }
}
```

- [ ] **Step 2: Aplicar `row-scroll` no container da fileira**

Em `src/app/[espaco]/page.tsx`, trocar a linha do container das aulas:

```tsx
// antes
<div className="flex gap-4 overflow-x-auto pb-2">
// depois
<div className="row-scroll pb-2">
```

- [ ] **Step 3: Aplicar `card-tilt` no Link do card**

No mesmo arquivo, no `Link` de cada aula, ajustar a className (o `row-scroll` já cuida do `flex: 0 0 auto`, então remover `shrink-0`):

```tsx
// antes
className="block w-[180px] shrink-0 sm:w-[200px]"
// depois
className="card-tilt block w-[180px] sm:w-[200px]"
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 5: Verificar visual**

Subir `npm run dev`, logar como revendedora (`/joao-atacados/login`, `revendedora.teste@gmail.com` / `DemoTemp2026!`), abrir `/joao-atacados`. Expected: ao passar o mouse num card, ele dá zoom suave com sombra; a fileira rola com encaixe.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css "src/app/[espaco]/page.tsx"
git commit -m "feat: hover card-tilt e row-scroll com snap no catalogo"
```

---

### Task 2: Coluna `banner_url` em `espacos` + tipos

**Files:**
- Create: `supabase/migrations/20260723120000_banner_espaco.sql`
- Modify: `src/integrations/supabase/types.ts` (via regeneração pela CLI)
- Modify: `src/lib/espacos.ts:4-12` (tipo `Espaco`) e `:16-19` (select)

**Interfaces:**
- Produces: coluna `public.espacos.banner_url TEXT NULL`; campo `banner_url: string | null` no tipo `Espaco` retornado por `getEspacoPorSlug`.

- [ ] **Step 1: Criar a migration**

Criar `supabase/migrations/20260723120000_banner_espaco.sql`:

```sql
-- Banner (imagem) do topo do catálogo, por espaço. Opcional; sem valor,
-- o catálogo cai no degradê com as cores do tenant.
ALTER TABLE public.espacos ADD COLUMN banner_url TEXT;
```

- [ ] **Step 2: Aplicar a migration no banco**

Run: `npx supabase db push`
Expected: aplica `20260723120000_banner_espaco.sql` sem erro. (Usa `SUPABASE_DB_URL` do `.env`.)

- [ ] **Step 3: Regenerar os tipos**

Run: `npx supabase gen types typescript --db-url "$SUPABASE_DB_URL" > src/integrations/supabase/types.ts`
Expected: `types.ts` regenerado; `espacos` Row passa a conter `banner_url: string | null`. Conferir com: `grep -n "banner_url" src/integrations/supabase/types.ts` (deve achar).

- [ ] **Step 4: Adicionar `banner_url` ao tipo e ao select em `espacos.ts`**

Em `src/lib/espacos.ts`, no tipo `Espaco` adicionar a linha `banner_url: string | null` (após `logo_url`), e no `.select(...)` incluir `banner_url`:

```ts
export type Espaco = {
  id: string
  slug: string
  nome_curso: string
  logo_url: string | null
  banner_url: string | null
  cor_primaria: string | null
  cor_destaque: string | null
  ativo: boolean
}
// ...
    .select('id, slug, nome_curso, logo_url, banner_url, cor_primaria, cor_destaque, ativo')
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: sem erros de tipo (o retorno de `getEspacoPorSlug` bate com `Espaco`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260723120000_banner_espaco.sql src/integrations/supabase/types.ts src/lib/espacos.ts
git commit -m "feat: coluna banner_url em espacos e no tipo Espaco"
```

---

### Task 3: Upload do banner na personalização do mentor

**Files:**
- Modify: `src/app/(auth)/mentor/personalizacao/actions.ts`
- Modify: `src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx`

**Interfaces:**
- Consumes: `banner_url` em `espacos` (Task 2); bucket público `conteudo`; `createAdminClient`.
- Produces: `salvarPersonalizacao` passa a gravar/limpar `banner_url` a partir dos campos de form `banner` (File) e `removerBanner` ('sim'|'nao').

- [ ] **Step 1: Tratar o banner na server action**

Em `src/app/(auth)/mentor/personalizacao/actions.ts`:

Adicionar a constante de limite após `LOGO_MAX_BYTES`:

```ts
const BANNER_MAX_BYTES = 5 * 1024 * 1024
```

Ler os campos junto aos existentes:

```ts
const removerBanner = formData.get('removerBanner') === 'sim'
const banner = formData.get('banner')
```

Após o bloco `if (removerLogo) { ... } else if (logo instanceof File ...) { ... }`, adicionar um bloco análogo para o banner (bucket `conteudo`, caminho `banners/{espacoId}.{ext}`):

```ts
if (removerBanner) {
  atualizacao.banner_url = null
  const { data: arquivos } = await admin.storage
    .from('conteudo')
    .list('banners', { search: contexto.espacoId })
  const caminhos = (arquivos ?? []).map((a) => `banners/${a.name}`)
  if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)
} else if (banner instanceof File && banner.size > 0) {
  if (!banner.type.startsWith('image/')) {
    return { ok: false, erro: 'O banner precisa ser uma imagem' }
  }
  if (banner.size > BANNER_MAX_BYTES) {
    return { ok: false, erro: 'Banner muito grande (máximo 5 MB)' }
  }
  const extensao = (banner.name.split('.').pop() ?? 'png').toLowerCase()
  const caminho = `banners/${contexto.espacoId}.${extensao}`
  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, banner, { upsert: true, contentType: banner.type })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar o banner.' }
  }
  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)
  atualizacao.banner_url = publicUrl
}
```

- [ ] **Step 2: Adicionar o campo de banner ao formulário**

Em `src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx`:

Adicionar estado e ref junto aos da logo:

```tsx
const [bannerPrevia, setBannerPrevia] = useState<string | null>(espaco.banner_url)
const [removerBanner, setRemoverBanner] = useState(false)
const inputBannerRef = useRef<HTMLInputElement>(null)
```

Adicionar os handlers:

```tsx
const aoEscolherBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
  const arquivo = e.target.files?.[0]
  if (arquivo) {
    setBannerPrevia(URL.createObjectURL(arquivo))
    setRemoverBanner(false)
  }
}

const aoRemoverBanner = () => {
  setBannerPrevia(null)
  setRemoverBanner(true)
  if (inputBannerRef.current) inputBannerRef.current.value = ''
}
```

Dentro do `<form>`, adicionar o hidden input junto ao de `removerLogo`:

```tsx
<input type="hidden" name="removerBanner" value={removerBanner ? 'sim' : 'nao'} />
```

E, logo após o bloco do campo Logo (o `<div className="space-y-2">` que fecha na linha do input de logo), adicionar o campo de banner:

```tsx
<div className="space-y-2">
  <Label htmlFor="banner">Banner do topo</Label>
  {bannerPrevia ? (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bannerPrevia} alt="Banner" className="aspect-[2400/960] w-full object-cover" />
    </div>
  ) : (
    <div className="flex aspect-[2400/960] w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      Sem banner (usa o degradê das cores)
    </div>
  )}
  <div className="flex items-center gap-3">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => inputBannerRef.current?.click()}
    >
      <Upload className="mr-2 h-4 w-4" />
      Enviar banner
    </Button>
    {bannerPrevia && (
      <Button type="button" variant="ghost" size="sm" onClick={aoRemoverBanner}>
        <X className="mr-2 h-4 w-4" />
        Remover
      </Button>
    )}
    <input
      ref={inputBannerRef}
      id="banner"
      name="banner"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={aoEscolherBanner}
    />
  </div>
</div>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 4: Verificar visual (upload real)**

`npm run dev`, logar como mentorado (`/login`, `mentorado.teste@joaoatacados.com.br` / `DemoTemp2026!`), abrir `/mentor/personalizacao`, enviar uma imagem no campo Banner e Salvar. Expected: mensagem "Personalização salva!"; a prévia mostra o banner.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/mentor/personalizacao/actions.ts" "src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx"
git commit -m "feat: upload de banner na personalizacao do mentor"
```

---

### Task 4: Render do banner no catálogo (com fallback degradê)

**Files:**
- Modify: `src/app/[espaco]/page.tsx:69-81` (bloco do topo)

**Interfaces:**
- Consumes: `dados.banner_url` (Task 2).

- [ ] **Step 1: Renderizar imagem quando houver `banner_url`**

Em `src/app/[espaco]/page.tsx`, substituir o `<div>` do degradê (o bloco com `style={{ background: linear-gradient... }}`) por um condicional:

```tsx
<div className="mx-auto w-full max-w-7xl px-4 pt-6">
  {dados.banner_url ? (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dados.banner_url}
        alt={dados.nome_curso}
        className="aspect-[2400/960] w-full object-cover sm:max-h-[412px]"
      />
    </div>
  ) : (
    <div
      className="flex aspect-[2400/960] w-full items-center overflow-hidden rounded-lg border border-border px-8 sm:max-h-[412px]"
      style={{
        background: `linear-gradient(120deg, ${dados.cor_primaria ?? '#171717'}, ${
          dados.cor_destaque ?? '#525252'
        })`,
      }}
    >
      <div>
        <h1 className="text-2xl font-black text-white sm:text-4xl">{dados.nome_curso}</h1>
        <p className="mt-1 text-sm text-white/80">Treinamento oficial para revendedoras</p>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Verificar visual (com e sem banner)**

Logada como revendedora, abrir `/joao-atacados`: com o banner enviado na Task 3, aparece a imagem no topo. Depois, como mentorado, remover o banner e Salvar; recarregar `/joao-atacados`: volta o degradê com as cores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[espaco]/page.tsx"
git commit -m "feat: banner em imagem no catalogo com fallback degrade"
```

---

### Task 5: Consistência de className no painel admin/mentor

**Files:**
- Modify (se necessário): páginas em `src/app/(auth)/admin/**/page.tsx` e `src/app/(auth)/mentor/**/page.tsx`

**Interfaces:** nenhuma; mudanças puramente visuais de className.

- [ ] **Step 1: Auditar as telas contra o checklist**

Ler cada `page.tsx` sob `src/app/(auth)/admin/` e `src/app/(auth)/mentor/` e conferir contra o checklist (a linguagem do catálogo):
- container principal usa `mx-auto w-full max-w-7xl px-4` (mesma largura do catálogo);
- blocos "painel" usam o componente `Card` (`@/components/ui/card`) em vez de `div` com bordas ad-hoc;
- título de página em `text-2xl font-bold tracking-tight sm:text-3xl`;
- espaçamento vertical entre seções em múltiplos de `space-y-6`/`space-y-8`.

- [ ] **Step 2: Aplicar apenas os ajustes de className onde o checklist for violado**

Para cada violação encontrada, ajustar somente a `className` (sem tocar em lógica, dados ou estrutura de componentes). Se uma tela já cumpre o checklist, não alterá-la.

- [ ] **Step 3: Verificar lint + build**

Run: `npm run lint && npm run build`
Expected: ambos verdes.

- [ ] **Step 4: Verificar visual**

Logada como admin (`admin.teste@atacadoexponencial.com.br` / `DemoTemp2026!`) e mentorado, percorrer as telas e confirmar que a largura, os cartões e os títulos ficaram consistentes com o catálogo.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: consistencia de container e cartoes no painel admin/mentor"
```

---

### Task 6: Verificação visual de ponta a ponta

**Files:** nenhum (verificação); commit só se ajustes finais forem necessários.

- [ ] **Step 1: Lint + build finais**

Run: `npm run lint && npm run build`
Expected: verdes.

- [ ] **Step 2: Passada visual comparando com a referência**

Via Playwright MCP, capturar: login white-label, catálogo (com banner e hover), página da aula, dashboard admin, personalização. Comparar com o layout da essenciademenina (header sticky translúcido, banner arredondado, fileiras com cards retrato + hover, página de aula limpa).

- [ ] **Step 3: Ajustes finais (se houver) + commit**

Se algo divergir, corrigir apenas className e commitar:

```bash
git add -A
git commit -m "style: ajustes finais de fidelidade ao exemplo"
```

---

## Notas de execução

- As contas de teste têm senha temporária `DemoTemp2026!` (definida nesta sessão) — some quando os dados de teste forem limpos (pendência de pré-lançamento).
- Se `npx supabase gen types` falhar no ambiente (CLI/linkagem), a alternativa mínima é aplicar a migration e depois regenerar os tipos quando a CLI estiver disponível; enquanto isso, `banner_url` já existe no banco e no tipo `Espaco` manual — o build só quebra se o retorno de `getEspacoPorSlug` não bater, então priorizar a regeneração.
