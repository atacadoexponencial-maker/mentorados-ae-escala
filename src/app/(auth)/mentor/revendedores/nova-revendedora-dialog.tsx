'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { cadastrarRevendedora, type EstadoRevendedora } from './actions'
import { LinkConviteDialog, type RevendedoraConvite } from './link-convite-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoRevendedora = { ok: false, erro: null }

// espacoAlvo só vem da tela da admin, que gerencia qualquer marca. Na tela da
// mentorada ele é ausente e o servidor resolve o espaço pela sessão.
export function NovaRevendedoraDialog({ espacoAlvo }: { espacoAlvo?: string }) {
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState<EstadoRevendedora>(estadoInicial)
  const [pendente, iniciar] = useTransition()
  const [nova, setNova] = useState<RevendedoraConvite | null>(null)
  const [avisoDoCadastro, setAvisoDoCadastro] = useState<string | null>(null)

  // Cadastrou: fecha este diálogo e abre o do link, para ela mandar por WhatsApp
  // na hora sem ter que procurar a revendedora na lista depois.
  function acao(formData: FormData) {
    const nome = String(formData.get('nome') ?? '').trim()
    iniciar(async () => {
      const resultado = await cadastrarRevendedora(estadoInicial, formData)
      setEstado(resultado)
      if (resultado.ok && resultado.revendedoraId) {
        setAberto(false)
        setNova({ id: resultado.revendedoraId, nome })
        setAvisoDoCadastro(resultado.aviso ?? null)
      } else if (resultado.ok) {
        setAberto(false)
      }
    })
  }

  return (
    <>
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Nova revendedora
      </DialogTrigger>
      <DialogContent>
        <form action={acao} className="space-y-4">
          {espacoAlvo && <input type="hidden" name="espacoId" value={espacoAlvo} />}
          <DialogHeader>
            <DialogTitle>Nova revendedora</DialogTitle>
            <DialogDescription>
              O convite vai por e-mail. Depois de cadastrar, você também recebe um link para mandar
              por WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rev-nome">Nome</Label>
            <Input id="rev-nome" name="nome" placeholder="Nome completo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-email">E-mail</Label>
            <Input id="rev-email" name="email" type="email" placeholder="email@exemplo.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-whatsapp">WhatsApp (opcional)</Label>
            <Input id="rev-whatsapp" name="whatsapp" placeholder="(11) 99999-9999" />
          </div>
          {estado.erro && (
            <p role="alert" className="text-sm text-destructive">
              {estado.erro}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Cadastrando…' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <LinkConviteDialog
      key={nova?.id ?? 'fechado'}
      revendedora={nova}
      aviso={avisoDoCadastro}
      onClose={() => setNova(null)}
    />
    </>
  )
}
