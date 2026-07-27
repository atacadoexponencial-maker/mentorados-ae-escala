# Design — Ver área de membros (preview) + personalização no nível de admin

Data: 2026-07-27

## Objetivo

Duas entregas independentes que compartilham o mesmo público (mentorado no
painel e admin dando suporte):

1. **Preview** — mentorado e admin abrem a área de membros como a revendedora a
   vê, a partir do painel.
2. **Personalização no admin** — a admin configura a identidade da marca de
   qualquer mentorado, para entregar o espaço já personalizado. O mentorado
   continua podendo editar a própria (nada muda para ele).

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

## Fora de escopo

- Preview embutido em iframe na tela de personalização (descartado: o botão abre
  a coisa real).
- Tela `/admin/personalizacao` com seletor de marca.
- Editar slug, nome do mentorado ou status ativo daqui — isso continua no dialog
  de `/admin/mentorados`.
- Personalizar a "base" compartilhada.
- Qualquer mudança no que a revendedora vê ou pode fazer.

## Verificação

- **Unitário (offline):** autorização da personalização — admin salva em marca
  alheia (permitido); mentorado em marca alheia (negado); mentorado na própria
  (permitido); alvo `null`/base (negado). Mesmo formato do teste existente de
  `podeGerenciarEspaco`.
- **Manual/Playwright:** admin abre `/admin/mentorados/{slug}`, altera cor e nome
  do curso, salva, clica em "Ver área de membros" e vê a identidade nova; a
  listagem mostra só as aulas daquele espaço + base. Mentorado abre
  `/mentor/personalizacao`, vê o link no topo, e o preview traz a marca dele.
- `npm run lint` + `npm run build` + `npm run test` verdes.
