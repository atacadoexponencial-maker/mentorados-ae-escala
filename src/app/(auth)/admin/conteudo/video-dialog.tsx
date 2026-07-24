'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import * as tus from 'tus-js-client'
import {
  editarAula,
  iniciarUploadVideo,
  sincronizarStatusVideo,
  type EstadoConteudo,
} from './actions'
import type { AulaLinha } from './dados'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Fase = 'idle' | 'enviando' | 'processando' | 'pronto' | 'erro'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function VideoDialog({ aula, onClose }: { aula: AulaLinha | null; onClose: () => void }) {
  const [fase, setFase] = useState<Fase>('idle')
  const [pct, setPct] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Modo avançado: colar ID (reusa editarAula com o título/descrição atuais)
  const [estadoId, acaoId, pendenteId] = useActionState(editarAula, estadoInicial)

  useEffect(() => {
    if (estadoId.ok) onClose()
  }, [estadoId, onClose])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (!aula) return null

  const aoEscolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setFase('enviando')
    setPct(0)

    const inicio = await iniciarUploadVideo(aula.id, file.name, file.size)
    if (!inicio.ok || !inicio.uploadUrl) {
      setFase('erro')
      setErro(inicio.erro ?? 'Não foi possível iniciar o upload.')
      return
    }

    const upload = new tus.Upload(file, {
      uploadUrl: inicio.uploadUrl,
      chunkSize: 50 * 1024 * 1024,
      onProgress: (enviado, total) => setPct(Math.round((enviado / total) * 100)),
      onError: () => {
        setFase('erro')
        setErro('Falha no envio do vídeo.')
      },
      onSuccess: () => {
        setFase('processando')
        pollRef.current = setInterval(async () => {
          const r = await sincronizarStatusVideo(aula.id)
          if (r.status === 'pronto') {
            if (pollRef.current) clearInterval(pollRef.current)
            setFase('pronto')
          }
        }, 8000)
      },
    })
    upload.start()
  }

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vídeo da aula</DialogTitle>
          <DialogDescription>
            &quot;{aula.titulo}&quot; · envie o arquivo; nós subimos para o Panda.
          </DialogDescription>
        </DialogHeader>

        {fase === 'idle' && (
          <div className="space-y-2">
            <Label htmlFor="video-arquivo">Arquivo de vídeo</Label>
            <Input
              id="video-arquivo"
              type="file"
              accept="video/*"
              onChange={aoEscolherArquivo}
            />
          </div>
        )}

        {fase === 'enviando' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enviando… {pct}%</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {fase === 'processando' && (
          <p className="text-sm text-muted-foreground">
            Upload concluído. O Panda está processando o vídeo — isso pode levar alguns minutos.
            Você pode fechar; a duração aparece quando ficar pronto.
          </p>
        )}

        {fase === 'pronto' && (
          <p role="status" className="text-sm text-foreground">
            Vídeo pronto! ✅
          </p>
        )}

        {fase === 'erro' && erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        <details className="rounded-md border border-border p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Avançado: colar um ID do Panda
          </summary>
          <form action={acaoId} className="mt-3 space-y-2">
            <input type="hidden" name="aulaId" value={aula.id} />
            <input type="hidden" name="titulo" value={aula.titulo} />
            <input type="hidden" name="descricao" value={aula.descricao ?? ''} />
            <Label htmlFor="video-id">ID do vídeo no Panda</Label>
            <Input id="video-id" name="pandaVideoId" placeholder="Ex.: 3f8a2b1c-…" />
            <Button type="submit" size="sm" disabled={pendenteId}>
              {pendenteId ? 'Salvando…' : 'Salvar ID'}
            </Button>
            {estadoId.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estadoId.erro}
              </p>
            )}
          </form>
        </details>
      </DialogContent>
    </Dialog>
  )
}
