# Design — Área de membros idêntica ao exemplo (essenciademenina)

Data: 2026-07-23

## Objetivo

Deixar a área de membros do `mentorados-ae-escala` visualmente idêntica à
referência [essenciademenina](https://github.com/atacadoexponencial-maker/essenciademenina),
já espelhada em fontes/cores no commit `cf0d65e`. Este documento cobre o
acabamento que falta.

## Contexto — o que JÁ está igual

Ao ler os componentes atuais, a estrutura da referência já foi portada:

- `src/components/shared/espaco-header.tsx` — header sticky translúcido com
  `bg-background/80 backdrop-blur`, logo redonda e menu de usuário. Igual à
  referência (que só tem, a mais, um link "Cursos" na nav).
- `src/app/[espaco]/page.tsx` — catálogo com banner no topo
  (`aspect-[2400/960] rounded-lg`), seções por módulo com título + progresso,
  e **fileiras horizontais** (`flex gap-4 overflow-x-auto`) de cards retrato
  `aspect-[3/4]` com capa, selo de conclusão e badge de duração. Estrutura
  idêntica à `app/index.tsx` da referência.

Portanto, este trabalho é acabamento, não reescrita.

## Gaps a implementar

### 1. Hover dos cards (`card-tilt`)

A referência aplica em cada card um hover de zoom + sombra via a utility
`card-tilt`. Hoje os cards não têm hover.

- Em `src/app/globals.css`, adicionar a utility (portada da referência, usando
  o token `--shadow-card` já existente):
  ```css
  @utility card-tilt {
    transition: transform 220ms ease, box-shadow 220ms ease;
    &:hover { transform: scale(1.04); box-shadow: var(--shadow-card); }
  }
  ```
- No `src/app/[espaco]/page.tsx`, acrescentar a classe `card-tilt` ao `Link`
  de cada card do catálogo.

### 2. Rolagem com encaixe (`row-scroll`)

Detalhe da referência: as fileiras usam `scroll-snap`. Adicionar a utility em
`globals.css` e trocar o `flex gap-4 overflow-x-auto pb-2` das fileiras do
catálogo por `class="row-scroll pb-2"`:
```css
@utility row-scroll {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  & > * { scroll-snap-align: start; flex: 0 0 auto; }
}
```

### 3. Banner em imagem por mentorado

Hoje o topo do catálogo é um degradê com as cores do tenant. A usuária quer
uma imagem de banner por mentorado, com o degradê como fallback quando não
houver imagem enviada.

Espelha exatamente o mecanismo de upload da logo (bucket público `conteudo`,
`admin.storage`, `getPublicUrl`, `upsert`).

- **Banco**: nova migration em `supabase/migrations/` adicionando
  `banner_url TEXT` a `public.espacos`. Regenerar
  `src/integrations/supabase/types.ts` (auto-gerado; não editar à mão).
- **Upload** (`src/app/(auth)/mentor/personalizacao/actions.ts`): tratar os
  campos `banner` (File) e `removerBanner` igual a `logo`/`removerLogo`, mas:
  - caminho `banners/{espacoId}.{ext}` no bucket `conteudo`;
  - limite de 5 MB (banners são maiores que logos);
  - validação `image/*`;
  - grava/limpa `banner_url` no update de `espacos`.
- **Formulário** (`src/app/(auth)/mentor/personalizacao/personalizacao-form.tsx`
  e `page.tsx`): adicionar o input de banner e o toggle de remover, no mesmo
  padrão da logo, com preview.
- **Render** (`src/app/[espaco]/page.tsx`): se `dados.banner_url`, renderizar
  `<img>` no lugar do degradê, mantendo `aspect-[2400/960] rounded-lg border
  sm:max-h-[412px]`; senão, manter o degradê atual como fallback.
- `getEspacoPorSlug` (`src/lib/espacos.ts`) e o tipo `Espaco` devem incluir
  `banner_url`.

### 4. Consistência do painel admin/mentor

A referência não tem exemplo de admin, então aqui o critério é consistência
leve com a linguagem da área de membros — sem inventar telas nem mexer em
lógica. Apenas revisar espaçamentos, largura de container (`max-w-7xl`),
estilo de cartões e títulos nas telas de `src/app/(auth)/admin/**` e
`src/app/(auth)/mentor/**` para alinhar com o catálogo. Mudanças puramente de
`className`.

## Fora de escopo

- Ranking gamificado, comentários e notificações da referência (Fase 2).
- Qualquer mudança em lógica de negócio, RLS ou autorização.
- Redesenho da página da aula além de verificar que segue o padrão da
  referência (título + player 16:9 + descrição + materiais); ajustar só se
  divergir visualmente.

## Verificação

- `npm run lint` e `npm run build` verdes.
- Verificação visual via Playwright MCP logado como revendedora
  (`revendedora.teste@gmail.com`), admin e mentor (senha temporária de teste),
  comparando cada tela ao layout da referência.
- Banner: enviar uma imagem pela tela de personalização e conferir que aparece
  no catálogo; remover e conferir que volta ao degradê.
