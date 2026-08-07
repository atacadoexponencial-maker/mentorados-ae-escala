# Capa gerada para aulas sem imagem — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando uma aula não tem capa enviada, o card renderiza um bloco gerado com o degradê da marca do tenant, o número e o título da aula, em vez da primeira letra do título.

**Architecture:** Duas funções puras em `src/lib/capas.ts` (ângulo do degradê e cor do texto por contraste), um componente de apresentação `CapaAula` que decide entre imagem e bloco gerado, e a troca dos dois pontos de uso em `src/app/[espaco]/page.tsx`. Sem mudança de schema, de server action ou de leitura de dados.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- UI em português (pt-BR).
- Spec de referência: `docs/superpowers/specs/2026-08-07-capa-gerada-aula-design.md`.
- Cores padrão quando o espaço não tem cor definida: primária `#171717`, destaque `#525252` (os mesmos já usados no banner em `src/app/[espaco]/page.tsx`).
- Cores do texto: branco `#ffffff` sobre fundo escuro, `#171717` sobre fundo claro.
- Ângulos do degradê, nesta ordem: `[135, 45, 200, 315, 90]`.
- Comentários de arquivo em português, no estilo já usado em `src/lib/capas.ts` e `src/lib/catalogo.ts`.
- Testes rodam com `npx vitest run <arquivo>`; a suíte inteira é `npm run test`.
- Nada de migration, coluna nova, capa de módulo ou thumbnail do Panda.

---

### Task 1: Funções puras de degradê e contraste

**Files:**
- Modify: `src/lib/capas.ts` (hoje tem só `resolverCapa`, 5 linhas)
- Test: `src/test/capas.test.ts` (criar)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `anguloDoDegrade(numero: number): number`
  - `corDoTextoSobre(cor: string | null): string`

  Ambas exportadas de `@/lib/capas`. A Task 2 importa as duas.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/test/capas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { anguloDoDegrade, corDoTextoSobre } from '@/lib/capas'

describe('anguloDoDegrade', () => {
  it('usa a lista fixa de ângulos na ordem, começando na aula 1', () => {
    expect(anguloDoDegrade(1)).toBe(135)
    expect(anguloDoDegrade(2)).toBe(45)
    expect(anguloDoDegrade(5)).toBe(90)
  })

  it('cicla a cada 5 aulas, para módulos longos não pedirem ângulo inexistente', () => {
    expect(anguloDoDegrade(6)).toBe(anguloDoDegrade(1))
    expect(anguloDoDegrade(12)).toBe(anguloDoDegrade(2))
  })

  it('devolve um ângulo válido mesmo para número zero ou negativo', () => {
    // A numeração vem da posição na tela; se algum dia vier 0, o card não pode
    // quebrar com um index undefined.
    expect(anguloDoDegrade(0)).toBeGreaterThanOrEqual(0)
    expect(anguloDoDegrade(-3)).toBeGreaterThanOrEqual(0)
  })
})

describe('corDoTextoSobre', () => {
  it('usa branco sobre cor escura', () => {
    expect(corDoTextoSobre('#171717')).toBe('#ffffff')
    expect(corDoTextoSobre('#1e3a8a')).toBe('#ffffff')
  })

  it('usa quase-preto sobre cor clara, senão o texto some', () => {
    expect(corDoTextoSobre('#facc15')).toBe('#171717') // amarelo
    expect(corDoTextoSobre('#ffffff')).toBe('#171717')
  })

  it('entende hex de 3 dígitos', () => {
    expect(corDoTextoSobre('#fff')).toBe('#171717')
    expect(corDoTextoSobre('#000')).toBe('#ffffff')
  })

  it('cai em branco quando a cor é nula ou inválida', () => {
    // cor_primaria vem do banco e pode estar vazia ou preenchida errado.
    expect(corDoTextoSobre(null)).toBe('#ffffff')
    expect(corDoTextoSobre('roxo')).toBe('#ffffff')
    expect(corDoTextoSobre('')).toBe('#ffffff')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/test/capas.test.ts`
Expected: FAIL — `anguloDoDegrade is not a function` / erro de importação, porque `src/lib/capas.ts` ainda não exporta nada disso.

- [ ] **Step 3: Implementar as duas funções**

Acrescentar ao final de `src/lib/capas.ts`, sem tocar em `resolverCapa`:

```ts
// Ângulos fixos e ciclados pela posição da aula: a fileira ganha ritmo sem
// sortear nada, o que manteria servidor e cliente com resultados diferentes.
const ANGULOS = [135, 45, 200, 315, 90]

export function anguloDoDegrade(numero: number): number {
  const indice = (((numero - 1) % ANGULOS.length) + ANGULOS.length) % ANGULOS.length
  return ANGULOS[indice]
}

const BRANCO = '#ffffff'
const QUASE_PRETO = '#171717'

function canaisDe(cor: string): [number, number, number] | null {
  const hex = cor.trim().replace(/^#/, '')
  const completo =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  if (!/^[0-9a-f]{6}$/i.test(completo)) return null
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ]
}

// Texto branco sobre uma marca clara fica ilegível, então quem decide é a
// luminância relativa (WCAG 2.1) da cor de fundo, não um chute fixo.
export function corDoTextoSobre(cor: string | null): string {
  const canais = cor ? canaisDe(cor) : null
  if (!canais) return BRANCO

  const [r, g, b] = canais.map((valor) => {
    const s = valor / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b

  return luminancia > 0.4 ? QUASE_PRETO : BRANCO
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/test/capas.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/capas.ts src/test/capas.test.ts
git commit -m "feat: angulo do degrade e cor de texto por contraste"
```

---

### Task 2: Componente CapaAula

**Files:**
- Create: `src/components/shared/capa-aula.tsx`

**Interfaces:**
- Consumes: `anguloDoDegrade`, `corDoTextoSobre` de `@/lib/capas` (Task 1).
- Produces: `CapaAula`, export nomeado, com estas props exatas:

  ```ts
  type Props = {
    capaUrl: string | null
    titulo: string
    numero: number
    corPrimaria: string | null
    corDestaque: string | null
    variante: 'card' | 'faixa'
  }
  ```

  A Task 3 importa `{ CapaAula } from '@/components/shared/capa-aula'`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/shared/capa-aula.tsx`:

```tsx
// src/components/shared/capa-aula.tsx
// Sem capa enviada, a aula ganha um bloco com o degradê da marca do espaço -
// assim nenhuma aula precisa de arte produzida à mão em cada área de membros.
import { anguloDoDegrade, corDoTextoSobre } from '@/lib/capas'

const COR_PRIMARIA_PADRAO = '#171717'
const COR_DESTAQUE_PADRAO = '#525252'

type Props = {
  capaUrl: string | null
  titulo: string
  numero: number
  corPrimaria: string | null
  corDestaque: string | null
  variante: 'card' | 'faixa'
}

export function CapaAula({
  capaUrl,
  titulo,
  numero,
  corPrimaria,
  corDestaque,
  variante,
}: Props) {
  if (capaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={capaUrl}
        alt={variante === 'card' ? titulo : ''}
        className="h-full w-full object-cover"
      />
    )
  }

  const primaria = corPrimaria ?? COR_PRIMARIA_PADRAO
  const destaque = corDestaque ?? COR_DESTAQUE_PADRAO
  const estilo = {
    background: `linear-gradient(${anguloDoDegrade(numero)}deg, ${primaria}, ${destaque})`,
    color: corDoTextoSobre(primaria),
  }
  const rotulo = String(numero).padStart(2, '0')

  // Na faixa (128x80 do "Continuar assistindo") o título não cabe, e ele já
  // aparece em texto normal ao lado do bloco.
  if (variante === 'faixa') {
    return (
      <div className="flex h-full w-full items-center justify-center" style={estilo}>
        <span className="text-xl font-black tabular-nums">{rotulo}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3" style={estilo}>
      <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
        Aula {rotulo}
      </span>
      <span className="line-clamp-4 text-base font-black leading-tight">{titulo}</span>
    </div>
  )
}
```

- [ ] **Step 2: Confirmar que compila e passa no lint**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run lint`
Expected: sem erros. O `eslint-disable-next-line @next/next/no-img-element` é obrigatório — o projeto usa `<img>` cru para capas, como já acontece em `src/app/[espaco]/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/capa-aula.tsx
git commit -m "feat: componente CapaAula com bloco gerado pela marca"
```

---

### Task 3: Usar o componente na página do espaço

**Files:**
- Modify: `src/app/[espaco]/page.tsx` — import, bloco "Continuar assistindo" (linhas 107-118) e card da fileira (linhas 155-167)

**Interfaces:**
- Consumes: `CapaAula` de `@/components/shared/capa-aula` (Task 2).
- Produces: nada — é o ponto final.

- [ ] **Step 1: Adicionar o import**

Em `src/app/[espaco]/page.tsx`, junto dos outros imports de `@/components/shared`:

```tsx
import { CapaAula } from '@/components/shared/capa-aula'
```

- [ ] **Step 2: Calcular o número da aula em andamento**

Logo depois da linha `const modulosComAulas = modulosComTodasAulas.filter((m) => m.aulas.length > 0)`:

```tsx
// O número mostrado é a posição da aula dentro do módulo na tela, a mesma
// contagem usada na fileira - assim os dois lugares nunca discordam.
const posicaoEmAndamento = aulaEmAndamento
  ? modulosComAulas
      .find((m) => m.id === aulaEmAndamento.moduloId)
      ?.aulas.findIndex((a) => a.id === aulaEmAndamento.id)
  : undefined
const numeroEmAndamento = posicaoEmAndamento === undefined || posicaoEmAndamento < 0
  ? 1
  : posicaoEmAndamento + 1
```

- [ ] **Step 3: Trocar o bloco do "Continuar assistindo"**

Substituir o `div` das linhas 107-118 (o que tem `h-20 w-32` e o `charAt(0)`) por:

```tsx
                  <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    <CapaAula
                      capaUrl={aulaEmAndamento.capaUrl}
                      titulo={aulaEmAndamento.titulo}
                      numero={numeroEmAndamento}
                      corPrimaria={dados.cor_primaria}
                      corDestaque={dados.cor_destaque}
                      variante="faixa"
                    />
                  </div>
```

As classes `text-2xl font-black text-muted-foreground/40` saem do contêiner: quem cuida de tipografia e cor agora é o `CapaAula`.

- [ ] **Step 4: Trocar o card da fileira**

Na linha 149, passar a receber o índice:

```tsx
                    {modulo.aulas.map((aula, indice) => (
```

E substituir o ternário das linhas 156-167 (o `aula.capaUrl ? <img> : <div>{aula.titulo.charAt(0)}</div>`) por:

```tsx
                          <CapaAula
                            capaUrl={aula.capaUrl}
                            titulo={aula.titulo}
                            numero={indice + 1}
                            corPrimaria={dados.cor_primaria}
                            corDestaque={dados.cor_destaque}
                            variante="card"
                          />
```

O `div` externo com `relative aspect-[3/4] ... bg-muted` fica como está, assim como os selos de concluída e de duração logo abaixo — eles continuam sobrepostos por `absolute`.

- [ ] **Step 5: Verificar que nada quebrou**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run lint`
Expected: sem erros.

Run: `npm run test`
Expected: todos os testes passam. Se aparecer `[vitest-pool-runner]: Timeout waiting for worker to respond`, é flakiness conhecida do Vitest no Windows/OneDrive sob concorrência, não falha real — reconfirmar rodando o arquivo citado sozinho com `npx vitest run <arquivo>`.

- [ ] **Step 6: Conferir no navegador**

Run: `npm run dev` e abrir um espaço em `http://localhost:3000/<slug>`.

Checar:
- aulas sem capa mostram bloco colorido com `AULA 01` e o título
- os ângulos do degradê mudam de card para card
- o selo de duração continua legível sobre o degradê
- o "Continuar assistindo" mostra só o número
- aulas com capa enviada continuam mostrando a imagem

- [ ] **Step 7: Commit**

```bash
git add "src/app/[espaco]/page.tsx"
git commit -m "feat: capa gerada pela marca nas aulas sem imagem"
```

---

## Self-Review

**Cobertura da spec:**

| Requisito da spec | Task |
| --- | --- |
| Componente `src/components/shared/capa-aula.tsx` com as 6 props | 2 |
| Variante `card` com `AULA NN` + título em até 4 linhas | 2 |
| Variante `faixa` só com o número | 2 |
| Numeração pela posição na tela, com zero à esquerda | 2 (padStart) e 3 (índice) |
| Não usar `aulas.ordem` | 3 (usa `indice`) |
| Número do "Continuar assistindo" vindo de `modulosComAulas` | 3 |
| Degradê com lista fixa de ângulos ciclada | 1 |
| Cor do texto por luminância | 1 |
| `corDoTextoSobre` aceita null, hex de 3 e de 6 dígitos | 1 |
| Dois pontos de uso em `page.tsx` | 3 |
| Legenda abaixo do card permanece | 3 (não é tocada) |
| Selos de concluída e duração intactos | 3 (não são tocados) |
| Testes das duas funções puras | 1 |
| Sem migration, capa de módulo ou Panda | nenhuma task toca nisso |
