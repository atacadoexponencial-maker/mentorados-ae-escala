// src/lib/capas.ts
// A capa definida para a marca vence; sem exceção, vale a capa base da aula.
export function resolverCapa(capaBase: string | null, capaDaMarca: string | null): string | null {
  return capaDaMarca ?? capaBase
}

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
