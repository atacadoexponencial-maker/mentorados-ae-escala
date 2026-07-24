# Design — Conteúdo por mentorado (Entrega 1: isolamento)

Data: 2026-07-24

## Objetivo

Permitir que cada mentorado crie e gerencie as **próprias** aulas, além do
catálogo base compartilhado que o admin mantém. Isolamento 100% entre marcas:
um mentorado nunca lê nem edita o conteúdo de outro; uma revendedora só vê
`base + conteúdo do próprio espaço`.

Modelo escolhido: **híbrido**. Base compartilhada (admin) + extras por
mentorado. O mentorado só **soma** conteúdo próprio; não edita, esconde nem
reordena a base. Vídeo continua sendo **ID do Panda colado** (o upload no app é
a Entrega 2, spec própria).

## Contexto do código atual

- `modulos` e `aulas` são globais (sem dono). `aulas` tem `modulo_id`,
  `publicada`, `panda_video_id`, `capa_url`, `ordem`. Materiais em
  `aula_materiais`.
- RLS hoje (arquivo `20260707200000_conteudo.sql`):
  - `modulos` SELECT: `USING (true)` — todos os autenticados veem tudo.
  - `aulas` SELECT: `USING (publicada = true OR has_role(admin))`.
  - `aula_materiais` SELECT: segue a visibilidade da aula.
  - **Sem políticas de INSERT/UPDATE/DELETE**: toda escrita é via service client
    (`createAdminClient`), que ignora o RLS. Logo, a autorização de escrita vive
    nas server actions (`exigirAdmin`), e o RLS governa só a leitura.
- Catálogo (`src/app/[espaco]/page.tsx`) lê `modulos`/`aulas` com o **client de
  sessão** (RLS aplicado) — é aqui que a leitura isolada acontece.
- Ações de conteúdo do admin: 15 funções em
  `src/app/(auth)/admin/conteudo/actions.ts` (criar/editar/mover/excluir módulo
  e aula, capa, materiais, publicar). Lista carregada por `listarConteudo()` em
  `dados.ts` (service client, sem filtro de espaço).
- `exigirMentorado()` (`mentor/revendedores/actions.ts`) retorna
  `{ userId, espacoId, slug }`. `exigirAdmin()` em `mentorados/actions.ts`.

## Arquitetura

### 1. Banco — dono opcional

Nova migration adicionando `espaco_id` a `modulos` e `aulas`:

```sql
ALTER TABLE public.modulos ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
ALTER TABLE public.aulas   ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
CREATE INDEX modulos_espaco_idx ON public.modulos (espaco_id);
CREATE INDEX aulas_espaco_idx   ON public.aulas (espaco_id);
```

`NULL` = base (admin, todos veem). Preenchido = daquele mentorado. O
`espaco_id` da aula é **denormalizado** (= o do módulo dono) para o RLS ser uma
comparação direta, sem join. A consistência é garantida pelas server actions
(a aula nasce e permanece no espaço do seu módulo).

Regenerar `src/integrations/supabase/types.ts` (CLI exige Docker; se
indisponível, ajustar à mão `espaco_id: string | null` em Row/Insert/Update de
`modulos` e `aulas`, como feito para `banner_url`).

### 2. RLS — leitura isolada (o coração)

Substituir as políticas de SELECT de `modulos` e `aulas`. Regras de espaço
reutilizáveis (base OU dono-mentorado OU revendedora-do-espaço OU admin):

```sql
-- modulos
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
```

`aula_materiais` SELECT deve replicar a mesma condição de espaço+rascunho da
aula (não só `publicada OR admin`), para uma revendedora não ler materiais de
aula que ela não pode ver. Atualizar a política via EXISTS reusando a
visibilidade nova da aula.

### 3. Escrita — escopo por papel (autorização nas actions)

Como o service client ignora o RLS, o isolamento de escrita é explícito. Novo
helper compartilhado:

```ts
// { espacoId: null } = admin gerencia a base; { espacoId: id } = mentorado gerencia o dele
export async function exigirEscopoConteudo(): Promise<{ espacoId: string | null } | null>
```

- admin → `{ espacoId: null }`
- mentorado → `{ espacoId: <espaço próprio> }`
- caso contrário → `null` (nega)

Toda ação de conteúdo passa a usar esse escopo:
- **Criar** módulo/aula: grava `espaco_id = escopo.espacoId`.
- **Editar/excluir/mover/publicar/capa/materiais**: antes de agir, carrega o
  `espaco_id` do alvo e exige que seja **igual** ao `escopo.espacoId`
  (`IS NOT DISTINCT FROM`, tratando `null`). Se diferente, nega. Isso impede um
  mentorado de tocar a base (`null`) ou o conteúdo de outro espaço, e impede o
  admin de editar conteúdo de mentorado pela tela de base.
- `moverAulaParaModulo`: o módulo de destino também precisa estar no escopo.

### 4. Reuso — uma base de actions/`componentes` para admin e mentor

As 15 ações e os componentes de lista/diálogos passam a ser **compartilhados**,
trocando `exigirAdmin` por `exigirEscopoConteudo` e carimbando/verificando
`espaco_id`. Assim `/admin/conteudo` (escopo base) e `/mentor/conteudo` (escopo
do mentorado) usam o mesmo código, sem duplicar. O carregamento
(`listarConteudo`) recebe um `espacoId | null` e filtra:
- admin: `espaco_id IS NULL`
- mentorado: `espaco_id = <próprio>`

Esta é a maior parte do trabalho e mexe em código do admin que já funciona —
exige verificação de não-regressão do admin.

### 5. Tela nova `/mentor/conteudo`

- Rota em `src/app/(auth)/mentor/conteudo/` reusando os componentes de conteúdo.
- Adicionar o link "Conteúdo" na nav do `mentor/layout.tsx`.
- Carrega só o conteúdo do espaço do mentorado; cria como rascunho; publica.

### 6. Catálogo da revendedora

- `page.tsx` já lê com o client de sessão; o RLS novo entrega `base + próprio`
  automaticamente. Ajustar a ordenação de módulos para **base primeiro, depois
  os do mentorado**: `.order('espaco_id', { nullsFirst: true }).order('ordem')`.

## Fora de escopo (Entrega 1)

- Upload de vídeo no app (Entrega 2 — integra a API do Panda).
- Mentorado editar, esconder ou reordenar a base.
- Conteúdo por revendedora.

## Verificação

- `npm run lint` + `npm run build` verdes.
- Fluxo do mentorado (Playwright, `mentorado.teste` / senha de teste): criar
  módulo próprio, criar aula com ID do Panda, publicar, e ver aparecer no
  catálogo do próprio espaço depois das seções da base.
- **Teste de isolamento (crítico):**
  - Ler diretamente com o client de sessão de um mentorado A e confirmar que
    módulos/aulas de um espaço B não voltam.
  - Chamar uma action de edição/exclusão com um `id` de conteúdo do espaço B
    logado como mentorado A e confirmar que é negada.
  - Revendedora do espaço A não vê conteúdo do espaço B nem rascunhos.
- Não-regressão do admin: criar/editar/publicar na base continua funcionando e o
  conteúdo base aparece em todos os espaços.
