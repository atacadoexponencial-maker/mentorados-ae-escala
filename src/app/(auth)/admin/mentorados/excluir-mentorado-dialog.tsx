'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  dependenciasDoMentorado,
  excluirMentorado,
  type DependenciasMentorado,
} from './actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Exclusão é irreversível e leva a conta de uma pessoa junto, então a tela faz
// duas coisas antes de deixar: conta o que vai sumir, e exige o endereço
// digitado à mão. Um clique errado no menu não pode bastar.
export function ExcluirMentoradoDialog({
  espacoId,
  onClose,
}: {
  espacoId: string | null
  onClose: () => void
}) {
  const [dados, setDados] = useState<DependenciasMentorado | null>(null)
  const [digitado, setDigitado] = useState('')
  const [pendente, iniciar] = useTransition()

  useEffect(() => {
    if (!espacoId) return
    let vivo = true
    dependenciasDoMentorado(espacoId).then((d) => {
      if (vivo) setDados(d)
    })
    return () => {
      vivo = false
    }
  }, [espacoId])

  const confere = dados !== null && digitado.trim().toLowerCase() === dados.slug

  const excluir = () => {
    if (!espacoId || !confere) return
    iniciar(async () => {
      await excluirMentorado(espacoId, digitado)
      toast.success(`Espaço ${dados?.slug} excluído.`)
      onClose()
    })
  }

  return (
    <Dialog open={espacoId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Excluir mentorado</DialogTitle>
          <DialogDescription>
            Isto não tem volta. Não há backup e nada disso pode ser recuperado depois.
          </DialogDescription>
        </DialogHeader>

        {!dados ? (
          <p className="text-sm text-muted-foreground">Verificando o que seria apagado…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">
                {dados.marca} <span className="text-muted-foreground">/{dados.slug}</span>
              </p>
              <ul className="text-muted-foreground">
                <li>Conta de acesso: {dados.email ?? 'sem dono'}</li>
                <li>{dados.revendedoras} revendedora(s), com as contas delas</li>
                <li>
                  {dados.modulos} módulo(s) e {dados.aulas} aula(s) próprios desta marca
                </li>
                <li>{dados.capas} capa(s) personalizada(s) do conteúdo base</li>
                <li>Logo, banner e materiais enviados</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              O conteúdo base da AE Escala não é afetado — some só o que é próprio desta marca.
              {dados.temPandaFolder &&
                ' A pasta de vídeos no Panda Video continua lá: apagar é manual, no painel do Panda.'}
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirmar-slug">
                Para confirmar, digite <strong>{dados.slug}</strong>
              </Label>
              <Input
                id="confirmar-slug"
                value={digitado}
                onChange={(e) => setDigitado(e.target.value)}
                placeholder={dados.slug}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pendente}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={excluir} disabled={!confere || pendente}>
            {pendente ? 'Excluindo…' : 'Excluir definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
