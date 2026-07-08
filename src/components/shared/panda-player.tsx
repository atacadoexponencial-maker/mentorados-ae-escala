'use client'

import { useEffect, useRef } from 'react'
import { registrarVisualizacao } from '@/app/[espaco]/aula/[aulaId]/actions'

// Player do Panda Video com rastreamento por postMessage
// (padrão portado da essenciademenina).
export function PandaPlayer({
  videoId,
  aulaId,
  iniciarEm,
}: {
  videoId: string
  aulaId?: string
  iniciarEm?: number
}) {
  const tocandoRef = useRef(false)
  const posicaoRef = useRef(0)
  const duracaoRef = useRef(0)
  const acumuladoRef = useRef(0)

  useEffect(() => {
    if (!aulaId) return

    const flush = (forcar = false, terminou = false) => {
      const delta = acumuladoRef.current
      if ((delta < 5 && !forcar) || (delta <= 0 && !terminou)) return
      acumuladoRef.current = 0
      registrarVisualizacao({
        aulaId,
        deltaSegundos: delta,
        posicao: posicaoRef.current,
        duracao: duracaoRef.current || undefined,
        terminou,
      }).catch(() => {})
    }

    const aoMensagem = (ev: MessageEvent) => {
      const dados = ev.data as { message?: string; event?: string; currentTime?: number; duration?: number }
      if (!dados || typeof dados !== 'object') return
      const tipo = String(dados.message ?? dados.event ?? '')
      if (!tipo.startsWith('panda_')) return
      if (typeof dados.currentTime === 'number') posicaoRef.current = dados.currentTime
      if (typeof dados.duration === 'number' && dados.duration > 0) duracaoRef.current = dados.duration
      if (tipo === 'panda_play' || tipo === 'panda_playing') tocandoRef.current = true
      if (tipo === 'panda_pause' || tipo === 'panda_waiting') {
        tocandoRef.current = false
        flush(true)
      }
      if (tipo === 'panda_ended') {
        tocandoRef.current = false
        flush(true, true)
      }
    }

    const relogio = window.setInterval(() => {
      if (tocandoRef.current) acumuladoRef.current += 1
      if (acumuladoRef.current >= 10) flush()
    }, 1000)

    window.addEventListener('message', aoMensagem)
    const aoOcultar = () => {
      if (document.hidden) flush(true)
    }
    document.addEventListener('visibilitychange', aoOcultar)

    return () => {
      flush(true)
      window.clearInterval(relogio)
      window.removeEventListener('message', aoMensagem)
      document.removeEventListener('visibilitychange', aoOcultar)
      tocandoRef.current = false
    }
  }, [aulaId])

  const pullZone = process.env.NEXT_PUBLIC_PANDA_PULL_ZONE ?? ''
  const base = videoId.startsWith('http')
    ? videoId
    : `https://player-vz-${encodeURIComponent(pullZone)}.tv.pandavideo.com.br/embed/?v=${encodeURIComponent(videoId.trim())}`
  const src = iniciarEm && iniciarEm > 0 ? `${base}&startTime=${Math.floor(iniciarEm)}` : base

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border bg-black"
      style={{ aspectRatio: '16 / 9' }}
    >
      <iframe
        src={src}
        title="Player da aula"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  )
}
