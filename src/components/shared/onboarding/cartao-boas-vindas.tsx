'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { corDoTextoSobre } from '@/lib/capas'
import { marcarCartaoVisto } from '@/lib/onboarding/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Quem decide se este cartão existe é o servidor, olhando a marca de visto — o
// componente só é montado para quem ainda não viu. Por isso ele já nasce aberto.
export function CartaoBoasVindas({
  nomeCurso,
  logoUrl,
  corPrimaria,
  primeiraAulaHref,
}: {
  nomeCurso: string
  logoUrl: string | null
  corPrimaria: string | null
  primeiraAulaHref: string | null
}) {
  const [aberto, setAberto] = useState(true)
  const router = useRouter()

  // Fecha na hora e só então avisa o servidor. Se a gravação falhar, ela já saiu
  // do cartão do mesmo jeito: o pior caso é ver as boas-vindas de novo um dia,
  // não ficar presa numa tela que não fecha.
  const fechar = () => {
    setAberto(false)
    void marcarCartaoVisto()
  }

  const irParaAula = () => {
    fechar()
    if (primeiraAulaHref) router.push(primeiraAulaHref)
  }

  const fundo = corPrimaria ?? '#171717'

  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && fechar()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          {logoUrl ? (
            <span className="mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </span>
          ) : null}
          <DialogTitle className="text-lg">Bem-vinda ao {nomeCurso}!</DialogTitle>
          <DialogDescription>
            {primeiraAulaHref
              ? 'Aqui ficam as suas aulas em vídeo e os materiais para baixar. O seu progresso fica guardado, então dá para parar e continuar depois de onde você deixou.'
              : 'Este é o seu espaço de treinamento. As primeiras aulas chegam em breve — assim que forem publicadas, elas aparecem aqui.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {primeiraAulaHref ? (
            <>
              <Button
                onClick={irParaAula}
                style={{ backgroundColor: fundo, color: corDoTextoSobre(fundo) }}
              >
                Começar a assistir
              </Button>
              <Button variant="ghost" size="sm" onClick={fechar}>
                Ver todas as aulas
              </Button>
            </>
          ) : (
            <Button
              onClick={fechar}
              style={{ backgroundColor: fundo, color: corDoTextoSobre(fundo) }}
            >
              Entendi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
