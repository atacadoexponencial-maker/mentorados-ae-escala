'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { marcarTourVisto } from '@/lib/onboarding/actions'
import { Button } from '@/components/ui/button'

// O tour leva a mentorada até cada lugar em vez de só apontar para o menu: cada
// passo abre a página real e destaca o elemento que importa dentro dela.
const PASSOS = [
  {
    rota: '/mentor/personalizacao',
    seletor: '[data-tour="nome-curso"]',
    titulo: 'O nome que elas veem',
    texto:
      'Este é o nome do seu treinamento. Aparece no topo da área de membros e no convite que as suas revendedoras recebem.',
  },
  {
    rota: '/mentor/personalizacao',
    seletor: '[data-tour="cores"]',
    titulo: 'As suas cores',
    texto:
      'Clique na linha da cor para escolher. Elas pintam os botões, os destaques e o fundo do topo — é o que faz o espaço parecer seu, e não da AE Escala.',
  },
  {
    rota: '/mentor/personalizacao',
    seletor: '[data-tour="logo"]',
    titulo: 'Logo e banner',
    texto:
      'A logo entra ao lado do nome, recortada em círculo. O banner ocupa o topo inteiro. Sem banner, entra um degradê com as suas cores — nada fica quebrado.',
  },
  {
    rota: '/mentor/conteudo',
    seletor: '[data-tour="conteudo-base"]',
    titulo: 'As aulas já vêm prontas',
    texto:
      'Todo o conteúdo da AE Escala já está no seu espaço. Você não precisa gravar nada para começar — e pode trocar a capa de cada aula para combinar com a sua marca.',
  },
  {
    rota: '/mentor/conteudo',
    seletor: '[data-tour="novo-modulo"]',
    titulo: 'E você pode criar as suas',
    texto:
      'Aqui você cria módulos e aulas próprios, com os seus vídeos. Eles aparecem no catálogo junto com o conteúdo da AE Escala.',
  },
  {
    rota: '/mentor/revendedores',
    seletor: '[data-tour="nova-revendedora"]',
    titulo: 'Quem vai assistir',
    texto:
      'Cadastre uma revendedora e ela recebe o convite por e-mail. Se preferir mandar por WhatsApp, dá para copiar o link de convite logo depois de cadastrar.',
  },
  {
    rota: '/mentor/revendedores',
    seletor: '[data-tour="importar"]',
    titulo: 'Ou várias de uma vez',
    texto:
      'Tem uma lista pronta? Cole aqui e cadastre todas de uma vez, sem precisar digitar uma a uma.',
  },
  {
    rota: '/mentor/revendedores',
    seletor: '[data-tour="area-membros"]',
    titulo: 'Como elas veem',
    texto:
      'Este é o endereço do seu espaço. Abra quando quiser conferir a área de membros exatamente como as suas revendedoras enxergam.',
  },
] as const

const MARGEM = 12
const LARGURA = 340

type Retangulo = { top: number; left: number; width: number; height: number }

export function TourPainel() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const balaoRef = useRef<HTMLDivElement>(null)
  const [alvo, setAlvo] = useState<Retangulo | null>(null)
  // Espera e fracasso são coisas diferentes: enquanto procura, o balão não
  // aparece; só depois de desistir ele vai para o centro sem destaque.
  const [procurando, setProcurando] = useState(true)
  // Encerrar precisa valer na hora, antes de o servidor confirmar a marca —
  // senão o início automático relê a URL sem ?tour e recomeça o tour.
  const [encerrado, setEncerrado] = useState(false)

  // O passo mora na URL, e não em memória: assim ele atravessa a troca de página
  // sem depender de o React preservar o estado deste componente entre rotas.
  const bruto = params.get('tour')
  const passo = bruto === null ? null : Math.min(Math.max(Number(bruto) || 0, 0), PASSOS.length - 1)
  const atual = passo === null ? null : PASSOS[passo]
  const ehUltimo = passo === PASSOS.length - 1

  const ir = useCallback(
    (n: number) => {
      setAlvo(null)
      setProcurando(true)
      router.push(`${PASSOS[n].rota}?tour=${n}`)
    },
    [router]
  )

  // Sem ?tour na URL, o tour começa sozinho — levando ela para a primeira página.
  // O `encerrado` é o que impede isto de virar laço: sem ele, sair do tour tira
  // o ?tour da URL e este mesmo efeito recomeça tudo.
  useEffect(() => {
    if (!encerrado && passo === null) router.replace(`${PASSOS[0].rota}?tour=0`)
  }, [encerrado, passo, router])

  const encerrar = useCallback(() => {
    // Some da tela na hora; a marca é gravada em seguida. Se a gravação falhar,
    // o pior caso é ver o tour de novo num próximo acesso — nunca ficar presa.
    setEncerrado(true)
    void marcarTourVisto().finally(() => router.replace(pathname))
  }, [router, pathname])

  // Depois de navegar, o elemento do próximo passo ainda não existe. Em vez de
  // medir uma vez e errar, procura por um tempo e desiste — desistir mostra o
  // balão sem destaque, que é melhor que apontar para o lugar errado.
  useEffect(() => {
    if (!atual || pathname !== atual.rota) return
    let parado = false
    // Achar leva alguns quadros no caso normal. O teto é curto de propósito:
    // enquanto procura só há o escurecimento, sem botão para sair.
    const limite = Date.now() + 2500

    const procurar = () => {
      if (parado) return
      const elemento = document.querySelector(atual.seletor)
      if (elemento) {
        // Rolar até o elemento antes de medir: sem isto, um alvo fora da tela ou
        // debaixo do cabeçalho fixo é destacado cortado.
        elemento.scrollIntoView({ block: 'center', behavior: 'auto' })
        requestAnimationFrame(() => {
          if (parado) return
          const r = elemento.getBoundingClientRect()
          setAlvo({ top: r.top, left: r.left, width: r.width, height: r.height })
          setProcurando(false)
        })
        return
      }
      if (Date.now() < limite) requestAnimationFrame(procurar)
      else setProcurando(false)
    }
    requestAnimationFrame(procurar)

    const remedir = () => {
      const elemento = document.querySelector(atual.seletor)
      if (!elemento) return
      const r = elemento.getBoundingClientRect()
      setAlvo({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    window.addEventListener('resize', remedir)
    window.addEventListener('scroll', remedir, true)
    return () => {
      parado = true
      window.removeEventListener('resize', remedir)
      window.removeEventListener('scroll', remedir, true)
    }
  }, [atual, pathname])

  // Esc encerra; o Tab fica preso no balão enquanto o tour está aberto.
  useEffect(() => {
    if (passo === null) return
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
  }, [passo, encerrar])

  useEffect(() => {
    balaoRef.current?.focus()
  }, [passo])

  if (encerrado || passo === null || !atual) return null

  // Enquanto procura, fica só o escurecimento: o balão não pisca no centro para
  // depois pular para o alvo.
  if (procurando) {
    return (
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }}
        aria-hidden
      />
    )
  }

  const cabeAbaixo = alvo ? alvo.top + alvo.height + MARGEM + 220 < window.innerHeight : true
  const estilo: React.CSSProperties = alvo
    ? {
        position: 'fixed',
        top: cabeAbaixo ? alvo.top + alvo.height + MARGEM : undefined,
        bottom: cabeAbaixo ? undefined : window.innerHeight - alvo.top + MARGEM,
        left: Math.max(
          MARGEM,
          Math.min(
            alvo.left + alvo.width / 2 - LARGURA / 2,
            window.innerWidth - LARGURA - MARGEM
          )
        ),
        width: `min(${LARGURA}px, calc(100vw - ${MARGEM * 2}px))`,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `min(${LARGURA}px, calc(100vw - ${MARGEM * 2}px))`,
      }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tour do painel">
      {alvo ? (
        // Sombra gigante em volta do elemento: escurece tudo menos ele.
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-primary"
          style={{
            top: alvo.top - 6,
            left: alvo.left - 8,
            width: alvo.width + 16,
            height: alvo.height + 12,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }} />
      )}

      <div
        ref={balaoRef}
        tabIndex={-1}
        style={estilo}
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
            <Button variant="outline" size="sm" onClick={() => ir(passo - 1)}>
              Voltar
            </Button>
          )}
          <Button size="sm" onClick={() => (ehUltimo ? encerrar() : ir(passo + 1))}>
            {ehUltimo ? 'Entendi' : 'Avançar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
