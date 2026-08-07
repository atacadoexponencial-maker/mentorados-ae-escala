# Capa gerada para aulas sem imagem

Data: 2026-08-07

## Problema

O card de aula na listagem do espaço mostra a primeira letra do título quando a aula
não tem capa (`src/app/[espaco]/page.tsx:163-167`). Produzir uma capa desenhada para
cada aula não é viável: são dezenas de aulas e várias áreas de membros.

A cascata de capas que já existe (`aula_capas_espaco` sobrepõe `aulas.capa_url`) resolve
o reaproveitamento entre marcas, mas não elimina o trabalho de produzir a capa base.

## Decisão

Quando a aula não tem capa, o card passa a renderizar um bloco gerado com a identidade
visual do tenant: degradê entre `espacos.cor_primaria` e `espacos.cor_destaque`, o número
da aula e o título. Nenhuma arte precisa ser produzida, e o resultado muda sozinho de
cara em cada área de membros.

Capa enviada continua tendo prioridade. Este bloco é o último degrau da cascata.

## Componente

Novo: `src/components/shared/capa-aula.tsx`. Componente de apresentação, sem estado.

Hoje a decisão "tem capa? mostra imagem : mostra a letra" está duplicada em dois pontos
do `page.tsx` (linhas 108 e 156). O componente absorve as duas.

Props:

| Prop | Tipo | Observação |
| --- | --- | --- |
| `capaUrl` | `string \| null` | já resolvida pela cascata em `src/lib/catalogo.ts:62` |
| `titulo` | `string` | |
| `numero` | `number` | posição da aula dentro do módulo, base 1 |
| `corPrimaria` | `string \| null` | fallback `#171717`, igual ao banner |
| `corDestaque` | `string \| null` | fallback `#525252` |
| `variante` | `'card' \| 'faixa'` | |

Com `capaUrl`, renderiza `<img class="h-full w-full object-cover">`. Sem, renderiza o
bloco gerado.

## Variantes

**`card`** — usada na fileira do módulo, dentro do contêiner `aspect-[3/4]` existente.
Rótulo `AULA 01` pequeno no topo, título abaixo em até 4 linhas (`line-clamp-4`).

**`faixa`** — usada no "Continuar assistindo", bloco de 128×80. Mostra **apenas o
número**, centralizado. O título não cabe em 128 px e ali já aparece em texto normal ao
lado do bloco (`page.tsx:120`).

## Numeração

Posição da aula dentro do módulo já renderizado, base 1, com zero à esquerda até 9
(`01`, `02`, … `10`). É a contagem que a pessoa vê na tela.

Não usar `aulas.ordem`: ela é a ordem de gravação e pode ter buracos quando uma aula é
despublicada, o que faria a numeração pular na tela.

No "Continuar assistindo", o número sai da posição da aula dentro de `modulosComAulas` —
a mesma lista que alimenta as fileiras, então os dois lugares sempre concordam.

## Degradê

`linear-gradient(<angulo>deg, <corPrimaria>, <corDestaque>)`.

O ângulo vem de uma lista fixa, ciclada pela posição: `[135, 45, 200, 315, 90]`. Lista
fixa em vez de valor derivado por hash ou aleatório para o resultado ser idêntico entre
servidor e cliente e não causar erro de hidratação.

## Contraste do texto

Cor de texto branca sobre um degradê de marca clara (um amarelo, por exemplo) fica
ilegível. A cor do texto é decidida pela luminância relativa da `corPrimaria`: branco
sobre fundo escuro, quase-preto (`#171717`) sobre fundo claro.

Sem esta regra, a capa gerada quebra para qualquer tenant de identidade clara — é o
principal risco da decisão.

## Funções puras

Ambas em `src/lib/capas.ts`, que já hospeda a regra de cascata (`resolverCapa`):

- `anguloDoDegrade(numero: number): number`
- `corDoTextoSobre(cor: string | null): string`

`corDoTextoSobre` aceita `null` e hex de 6 ou de 3 dígitos, e devolve branco para
qualquer entrada nula ou inválida — a cor vem do banco e pode não estar preenchida.

## Pontos de uso

Apenas `src/app/[espaco]/page.tsx`:

- fileira de aulas do módulo — linhas 155-167, variante `card`
- "Continuar assistindo" — linhas 107-118, variante `faixa`

A legenda com o título abaixo do card permanece em todos os cards, inclusive nos de capa
gerada. A repetição do título nesses cards é aceita em troca de fileiras alinhadas e de
nenhuma aula ficar sem nome quando a capa é uma foto sem texto.

Os selos de concluída e de duração continuam onde estão, sobrepostos ao contêiner — o
componente não os conhece.

## Testes

Vitest, em `src/test/`, cobrindo as duas funções puras:

- `anguloDoDegrade` — cicla a cada 5 posições; posição 1 e posição 6 dão o mesmo ângulo
- `corDoTextoSobre` — escuro devolve branco, claro devolve `#171717`, hex de 3 dígitos
  funciona, entrada inválida devolve branco

O componente não recebe teste próprio: é marcação sem lógica depois que as duas funções
saem dele.

## Fora de escopo

- Migration, coluna nova ou qualquer mudança de schema
- Capa em módulo herdada pelas aulas
- Thumbnail automático do Panda Video

Os dois últimos foram avaliados e ficam disponíveis como degraus extras da cascata, sem
conflito com esta decisão.
