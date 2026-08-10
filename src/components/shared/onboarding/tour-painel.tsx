'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { marcarTourVisto } from '@/lib/onboarding/actions'
import { Button } from '@/components/ui/button'

// Cada passo aponta para um elemento real do menu, marcado com data-tour. Se o
// elemento não estiver na tela, o passo ainda acontece — só perde o destaque
// (ver `alvo === null` abaixo). Nunca apontar para o lugar errado.
const PASSOS = [
  {
    seletor: '[data-tour="personalizacao"]',
    titulo: 'A cara do seu espaço',
    texto:
      'Aqui você troca a logo, as cores e o nome que as suas revendedoras veem. É o que faz a área de membros parecer sua.',
  },
  {
    seletor: '[data-tour="conteudo"]',
    titulo: 'As aulas',
    texto:
      'O conteúdo da AE Escala já vem pronto aqui, e você pode trocar as capas dele. Abaixo, você cria os seus próprios módulos e aulas.',
  },
  {
    seletor: '[data-tour="revendedores"]',
    titulo: 'Quem tem acesso',
    texto:
      'Cadastre as suas revendedoras, uma a uma ou em lista. Cada uma recebe um convite por e-mail — e você também pode copiar o link para mandar no WhatsApp.',
  },
  {
    seletor: '[data-tour="area-membros"]',
    titulo: 'O que elas veem',
    texto:
      'Este é o endereço que as suas revendedoras acessam. Abra quando quiser conferir como o seu espaço ficou para elas.',
  },
] as const

const MARGEM = 12
const LARGURA_BALAO = 320

type Retangulo = { top: number; left: number; width: number; height: number }

export function TourPainel() {
  const [passo, setPasso] = useState(0)
  const [aberto, setAberto] = useState(true)
  const [alvo, setAlvo] = useState<Retangulo | null>(null)
  const balaoRef = useRef<HTMLDivElement>(null)

  const atual = PASSOS[passo]
  const ehUltimo = passo === PASSOS.length - 1

  // Mede o elemento do passo atual. Refaz a cada passo e sempre que a página
  // muda de tamanho ou rola, senão o recorte descola do que ele destaca.
  const medir = useCallback(() => {
    const elemento = document.querySelector(atual.seletor)
    if (!elemento) {
      setAlvo(null)
      return
    }
    const r = elemento.getBoundingClientRect()
    setAlvo({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [atual.seletor])

  useLayoutEffect(() => {
    // A medição vai num frame em vez de direto no corpo do effect: medir é
    // sempre uma leitura do DOM, que só está pronto depois da pintura.
    const frame = requestAnimationFrame(medir)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [medir])

  // Fecha na hora e só então avisa o servidor: se a gravação falhar, o painel
  // fica utilizável do mesmo jeito em vez de travar debaixo do escurecimento.
  const encerrar = useCallback(() => {
    setAberto(false)
    void marcarTourVisto()
  }, [])

  // Esc encerra, e o Tab fica preso no balão enquanto o tour está aberto —
  // senão o foco passeia por um painel que ela não consegue nem ver.
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        encerrar()
        return
      }
      if (e.key !== 'Tab') return
      const foco = balaoRef.current?.querySelectorAll<HTMLElement>('button')
      if (!foco?.length) return
      const primeiro = foco[0]
      const ultimo = foco[foco.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, encerrar])

  useEffect(() => {
    if (aberto) balaoRef.current?.focus()
  }, [aberto, passo])

  if (!aberto) return null

  // Sem alvo medido, o balão vai para o centro e não há recorte: é o caso de um
  // elemento que não existe nesta tela.
  const abaixo = alvo ? alvo.top + alvo.height + MARGEM : 0
  const cabeAbaixo = alvo ? abaixo + 200 < window.innerHeight : true

  const estiloBalao: React.CSSProperties = alvo
    ? {
        position: 'fixed',
        top: cabeAbaixo ? abaixo : undefined,
        bottom: cabeAbaixo ? undefined : window.innerHeight - alvo.top + MARGEM,
        left: Math.max(
          MARGEM,
          Math.min(
            alvo.left + alvo.width / 2 - LARGURA_BALAO / 2,
            window.innerWidth - LARGURA_BALAO - MARGEM
          )
        ),
        width: `min(${LARGURA_BALAO}px, calc(100vw - ${MARGEM * 2}px))`,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `min(${LARGURA_BALAO}px, calc(100vw - ${MARGEM * 2}px))`,
      }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tour do painel">
      {alvo ? (
        // O recorte é uma sombra gigante em volta do elemento: escurece tudo
        // menos ele, sem precisar recortar máscara nem desenhar quatro divs.
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-primary"
          style={{
            top: alvo.top - 4,
            left: alvo.left - 6,
            width: alvo.width + 12,
            height: alvo.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }} />
      )}

      <div
        ref={balaoRef}
        tabIndex={-1}
        style={estiloBalao}
        className="rounded-xl bg-popover p-4 text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none"
      >
        <p className="font-semibold">{atual.titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{atual.texto}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {passo + 1} de {PASSOS.length}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={encerrar}>
            Pular
          </Button>
          {passo > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </Button>
          )}
          <Button size="sm" onClick={() => (ehUltimo ? encerrar() : setPasso((p) => p + 1))}>
            {ehUltimo ? 'Entendi' : 'Avançar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
