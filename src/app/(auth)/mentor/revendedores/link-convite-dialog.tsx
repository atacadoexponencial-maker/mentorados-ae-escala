'use client'

import { useEffect, useState } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { gerarLinkConvite } from './actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type RevendedoraConvite = { id: string; nome: string | null }

export function LinkConviteDialog({
  revendedora,
  aviso,
  onClose,
}: {
  revendedora: RevendedoraConvite | null
  // Recado do cadastro, quando o e-mail não pôde sair — aparece junto do link,
  // que nesse caso é o único caminho de acesso dela.
  aviso?: string | null
  onClose: () => void
}) {
  const [link, setLink] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [regerando, setRegerando] = useState(false)

  const aplicar = (r: Awaited<ReturnType<typeof gerarLinkConvite>>) => {
    if (r.ok) setLink(r.link)
    else setErro(r.erro)
  }

  const FALHA = 'Não foi possível gerar o link agora. Tente de novo em instantes.'

  // O pai remonta este componente por revendedora (key), então o efeito só
  // precisa buscar — não há estado velho para limpar antes.
  useEffect(() => {
    if (!revendedora) return
    let vivo = true
    gerarLinkConvite(revendedora.id)
      .then((r) => {
        if (vivo) aplicar(r)
      })
      .catch(() => {
        if (vivo) setErro(FALHA)
      })
    return () => {
      vivo = false
    }
  }, [revendedora])

  const regerar = () => {
    if (!revendedora) return
    setRegerando(true)
    setLink(null)
    setErro(null)
    gerarLinkConvite(revendedora.id)
      .then(aplicar)
      .catch(() => setErro(FALHA))
      .finally(() => setRegerando(false))
  }

  const carregando = regerando || (link === null && erro === null)

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copiado! Agora é só colar no WhatsApp dela.')
    } catch {
      // Alguns navegadores recusam a área de transferência sem gesto direto ou
      // fora de HTTPS. O link continua em texto logo acima, para copiar à mão.
      toast.error('Não deu para copiar sozinho. Selecione o link acima e copie.')
    }
  }

  return (
    <Dialog open={revendedora !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link de convite</DialogTitle>
          <DialogDescription>
            {revendedora?.nome
              ? `Para ${revendedora.nome} entrar pela primeira vez e criar a senha dela.`
              : 'Para a revendedora entrar pela primeira vez e criar a senha dela.'}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <p role="status" className="rounded-lg border border-input bg-muted/40 p-3 text-sm">
            {aviso}
          </p>
        )}

        {carregando && <p className="text-sm text-muted-foreground">Gerando o link…</p>}

        {erro && !carregando && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        {link && !carregando && (
          <div className="space-y-3">
            {/* Selecionável de propósito: se a cópia automática falhar, ela ainda
                consegue copiar à mão. */}
            <p className="break-all rounded-lg border border-input bg-muted/40 p-3 font-mono text-xs">
              {link}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={copiar}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar link
              </Button>
              <Button variant="outline" onClick={regerar} disabled={carregando}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar outro link
              </Button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Este link é pessoal e dá acesso à conta
                dela.</strong>{' '}
                Mande direto para ela, no privado — não publique em grupo nem repasse a outras
                pessoas.
              </p>
              <p>
                O link expira e vale uma vez só. Se ela disser que não funcionou, gere outro — mas
                lembre que gerar um novo faz o anterior parar de funcionar.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
