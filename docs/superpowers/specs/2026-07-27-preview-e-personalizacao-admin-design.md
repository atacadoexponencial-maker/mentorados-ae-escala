# Design — Preview da área de membros, personalização no admin e capas por marca

Data: 2026-07-27

## Objetivo

Três entregas com o mesmo público (mentorado no painel e admin dando suporte):

1. **Preview** — mentorado e admin abrem a área de membros como a revendedora a
   vê, a partir do painel.
2. **Personalização no admin** — a admin configura a identidade da marca de
   qualquer mentorado, para entregar o espaço já personalizado. O mentorado
   continua podendo editar a própria (nada muda para ele).
3. **Capa da aula base por marca** — a mesma aula base pode ter capa diferente em
   cada área de membros, para a personalização alcançar também o grid de cards.

As entregas 1 e 2 são independentes entre si. A 3 depende do helper introduzido
na 1 e vem depois dela.

## Contexto

- `/[espaco]/page.tsx` **já permite** que admin e mentorado visualizem qualquer
  espaço: há uma exceção explícita no guard de redirecionamento (linhas 23–31).
  O preview não precisa de tela nova — precisa de caminho e de fidelidade.
- A tela `/mentor/personalizacao` já tem formulário (logo, banner, nome do curso,
  cores), action `salvarPersonalizacao` e uma pré-visualização mockada (cartão
  estático). O preview real **não substitui** esse cartão; convive com ele.
- A regra de autorização admin-aware já existe e é testada:
  `podeGerenciarEspaco` em `src/app/(auth)/admin/conteudo/autorizacao.ts`.
  Ver [[conteudo-por-mentorado]].

## Entrega 1 — Ver área de membros

### 1.1 Link no painel do mentorado

`src/app/(auth)/mentor/layout.tsx` passa a buscar o slug do espaço do usuário
(uma consulta a `espacos` ao lado da checagem de papel que já existe) e adiciona
ao nav, junto de Personalização/Conteúdo/Revendedores/Dashboard:

```
Ver área de membros → /{slug}   (target="_blank", rel="noopener")
```

Espaço ausente (caso anômalo): o link simplesmente não é renderizado.

### 1.2 Link na página do mentorado no admin

O layout do admin não tem uma marca "atual", então o link não cabe no nav dele.
Em `src/app/(auth)/admin/mentorados/[slug]/page.tsx` entra um botão
**Ver área de membros** no cabeçalho, ao lado do nome da marca e do badge,
apontando para `/{slug}` em nova aba.

### 1.3 Fidelidade do preview (correção de um defeito real)

`/[espaco]/page.tsx` e `/[espaco]/aula/[aulaId]/page.tsx` buscam módulos e aulas
**sem filtrar por espaço**, confiando só na RLS. Para a revendedora o resultado
é correto (a policy a restringe ao próprio espaço + base). Para o **admin** a
policy libera tudo: ele veria as aulas de todos os mentorados misturadas — e no
caso da página de aula, a navegação anterior/próxima andaria por conteúdo de
outra marca. O preview mentiria justamente para quem vai usá-lo para conferir.

Correção: as duas páginas passam a filtrar explicitamente o que a revendedora
enxerga — `espaco_id IS NULL` (base) **ou** `espaco_id = <espaço do slug>`:

```ts
.or(`espaco_id.is.null,espaco_id.eq.${dados.id}`)
```

Para evitar a repetição nas duas páginas, o par de consultas (módulos + aulas
publicadas do espaço) vai para um helper server-only novo,
`src/lib/catalogo.ts` → `carregarCatalogo(espacoId)`, consumido por ambas. As
visualizações continuam sendo carregadas em cada página (dependem do usuário).

O filtro é **defesa em profundidade**, não a trava de segurança: a RLS continua
sendo a garantia de isolamento para a revendedora.

### 1.4 Faixa de pré-visualização

Quem abre `/{slug}` **sem ser revendedora daquele espaço** (isto é: admin, ou
mentorado dono) vê uma faixa discreta acima do header:

> Pré-visualização — é assim que a revendedora vê este espaço.

A condição vem do `vinculo` que a página já carrega. A revendedora nunca vê a
faixa.

Aceito e conhecido: "Continuar assistindo" e as marcas de aula concluída refletem
as visualizações **do usuário logado**, então aparecem vazias no preview. É
fiel ao que uma revendedora nova veria.

## Entrega 2 — Personalização no nível de admin

### 2.1 Onde

Bloco **Personalização** dentro de `/admin/mentorados/{slug}`, abaixo dos cartões
de contagem. Sem tela nova e sem item novo de menu: personalização sempre
pertence a um mentorado específico (nunca à base), então o seletor de marca de
`/admin/conteudo` não se aplica aqui.

### 2.2 Reuso

A página do admin importa o que já existe em `/mentor/personalizacao`:

- `PersonalizacaoForm` (componente client) — sem alteração visual, ganha o prop
  opcional `espacoId` renderizado como `<input type="hidden" name="espacoId">`.
  A tela do mentor não precisa passar.
- `salvarPersonalizacao` (server action) — mesma action nas duas telas.

### 2.3 Autorização (backend)

`salvarPersonalizacao` hoje chama `exigirMentorado()` e grava sempre no espaço do
próprio usuário. Passa a:

1. Resolver o escopo com `exigirEscopoConteudo()` (já existe, server-only,
   devolve `{ ehAdmin, espacoId }`).
2. Determinar o alvo: `const alvo = escopo.ehAdmin ? formData.espacoId : escopo.espacoId`.
   O mentorado é **forçado** ao próprio espaço — o valor recebido do formulário é
   ignorado para ele, mesmo padrão de `criarModulo`.
3. Exigir alvo não-nulo: `if (!alvo) return { ok: false, erro: 'Acesso negado' }`.
   Essa checagem é **da action**, não da regra pura — `podeGerenciarEspaco`
   permite `null` ao admin (é a base, válida para conteúdo), mas personalização
   da base não existe.
4. Autorizar com a regra pura existente: `podeGerenciarEspaco(escopo, alvo)`.
   Falha → `{ ok: false, erro: 'Acesso negado' }`.

O restante da action (validação de cor, limites de tamanho, upload em
`logos/{espacoId}` e `banners/{espacoId}`, update em `espacos`) já opera sobre um
`espacoId` e só passa a usar `alvo`.

`revalidatePath` passa a cobrir os três caminhos afetados:
`/mentor/personalizacao`, `/admin/mentorados/{slug}` e `/{slug}`.

### 2.4 Concorrência

Admin e mentorado editam o mesmo registro; quem salvar por último vence. Sem
trava e sem aviso — decisão explícita da usuária.

## Entrega 3 — Capa da aula base por marca

Depende do helper `carregarCatalogo` (1.3) e é implementada **depois** da
Entrega 1.

### 3.1 Problema

`aulas.capa_url` é um valor único para todas as marcas. A mesma aula base aparece
com a mesma capa em toda área de membros. A personalização visual (Entrega 2)
troca a moldura — logo, banner, cores — mas o grid de cards continua igual em
todo mundo.

### 3.2 Modelo — exceção por espaço, base como padrão

Nova tabela, migration `supabase/migrations/2026MMDDHHMMSS_capas_por_espaco.sql`:

```sql
CREATE TABLE public.aula_capas_espaco (
  aula_id  UUID NOT NULL REFERENCES public.aulas(id)   ON DELETE CASCADE,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  capa_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (aula_id, espaco_id)
);
```

Uma linha significa "nesta marca, esta aula usa esta capa". Sem linha, vale
`aulas.capa_url`. Nada do que existe hoje muda de comportamento, e nenhuma aula
fica sem capa.

RLS de SELECT segue a visibilidade já usada em `modulos`/`aulas`: admin, o
mentorado dono do espaço, ou revendedora daquele espaço. Escrita apenas via
service client (nenhuma policy de INSERT/UPDATE/DELETE), padrão do projeto.

### 3.3 Regra de resolução (pura e testável)

`src/lib/capas.ts`, sem `server-only`:

```ts
// A capa da marca vence; sem exceção, vale a capa base da aula.
export function resolverCapa(capaBase: string | null, capaDaMarca: string | null): string | null {
  return capaDaMarca ?? capaBase
}
```

`carregarCatalogo(espacoId)` (1.3) passa a carregar as exceções daquele espaço e
devolver cada aula com a capa já resolvida. Como catálogo e página de aula leem
por esse helper, os dois lugares ficam corretos sem duplicação.

### 3.4 Tela do admin

Em `/admin/conteudo`, quando há **marca selecionada** no seletor, aparece acima
da lista da marca um bloco **Conteúdo base (herdado)**:

- módulos e aulas base em **somente leitura** — sem editar, mover, publicar ou
  excluir;
- cada aula mostra a capa **como aquela marca a vê** (já resolvida);
- botão **Trocar capa nesta marca** por aula; quando já existe exceção, também
  **Remover capa desta marca** (apaga a linha e o arquivo, voltando à base).

Com a base selecionada (nenhuma marca), a tela fica exatamente como hoje.

Os dados vêm de uma função nova em `dados.ts`, `listarBaseComCapas(espacoId)`.
`listarConteudo` **não muda** — assim `/mentor/conteudo` continua mostrando só o
conteúdo próprio do mentorado, sem comportamento novo vazando para ele.

### 3.5 Ação e autorização

`capa-dialog.tsx` ganha prop opcional `espacoId`; presente, envia
`<input type="hidden" name="espacoId">`.

Nova action `salvarCapaNoEspaco` em `admin/conteudo/actions.ts`:

1. `exigirEscopoConteudo()`; **exigir `escopo.ehAdmin`** — só a admin troca capa
   de conteúdo base. Mentorado → `{ ok: false, erro: 'Acesso negado' }`.
2. Exigir `espacoId` preenchido e que a aula alvo seja **base**
   (`aulas.espaco_id IS NULL`). Aula de marca já tem capa própria pelo caminho
   normal; recusar evita dois caminhos para a mesma coisa.
3. Mesmas validações do upload atual (imagem, máximo 2 MB).
4. Upload em `capas/{aulaId}-{espacoId}.{ext}` — a capa base
   (`capas/{aulaId}.{ext}`) nunca é sobrescrita.
5. `upsert` em `aula_capas_espaco`.

Action irmã `removerCapaDoEspaco`: mesma autorização, apaga a linha e o arquivo.

Ambas revalidam `/admin/conteudo` e `/{slug}` da marca afetada.

`excluirAula` passa a remover também os arquivos `capas/{aulaId}-*` do storage
(as linhas caem sozinhas por `ON DELETE CASCADE`).

### 3.6 Consequência aceita

Trocar a capa **base** depois não se propaga para as marcas que já têm exceção —
a exceção vence. É o comportamento correto (a personalização não deve ser
desfeita por uma edição da base), mas significa que capas personalizadas
precisam ser reavaliadas manualmente se o material base mudar.

## Fora de escopo

- Preview embutido em iframe na tela de personalização (descartado: o botão abre
  a coisa real).
- Mentorado trocar capa de conteúdo base — só a admin (decisão explícita).
- Título ou descrição de aula base variando por marca — só a capa.
- Propagar uma capa base nova para marcas que já têm exceção.
- Tela `/admin/personalizacao` com seletor de marca.
- Editar slug, nome do mentorado ou status ativo daqui — isso continua no dialog
  de `/admin/mentorados`.
- Identidade própria da "base" (logo, banner, cores) — a base não é um espaço e
  nunca é exibida sozinha. Capa de aula base **por marca** é outra coisa e está
  na Entrega 3.
- Qualquer mudança no que a revendedora vê ou pode fazer.

## Verificação

- **Unitário (offline):** autorização da personalização — admin salva em marca
  alheia (permitido); mentorado em marca alheia (negado); mentorado na própria
  (permitido); alvo `null`/base (negado). Mesmo formato do teste existente de
  `podeGerenciarEspaco`.
- **Unitário (offline):** `resolverCapa` — sem exceção devolve a capa base; com
  exceção devolve a da marca; base nula e sem exceção devolve `null`.
- **Manual/Playwright:** admin abre `/admin/mentorados/{slug}`, altera cor e nome
  do curso, salva, clica em "Ver área de membros" e vê a identidade nova; a
  listagem mostra só as aulas daquele espaço + base. Mentorado abre
  `/mentor/personalizacao`, vê o link no topo, e o preview traz a marca dele.
- **Manual/Playwright (Entrega 3):** admin seleciona a marca A em
  `/admin/conteudo`, troca a capa de uma aula base, e o preview de A mostra a
  capa nova enquanto o preview de B mantém a capa base; "Remover capa desta
  marca" devolve A à base. `/mentor/conteudo` continua sem exibir conteúdo base.
- `npm run lint` + `npm run build` + `npm run test` verdes.
