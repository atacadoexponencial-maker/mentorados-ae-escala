'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import {
  ativarDominio,
  desativarDominio,
  removerDominio,
  salvarDominio,
  type EstadoDominio,
} from '../dominio-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const estadoInicial: EstadoDominio = { ok: false, erro: null }

type Confirmacao = 'ativar' | 'desativar' | 'remover' | null

const TEXTOS: Record<Exclude<Confirmacao, null>, { titulo: string; corpo: string; botao: string }> = {
  ativar: {
    titulo: 'Ativar domínio próprio?',
    corpo:
      'As revendedoras passam a entrar por este domínio, o endereço antigo do espaço passa a redirecionar para ele e os novos convites e links já saem com o domínio. Confira antes se o domínio abre com cadeado de segurança.',
    botao: 'Ativar',
  },
  desativar: {
    titulo: 'Desativar domínio próprio?',
    corpo:
      'O espaço volta a funcionar só pelo endereço da plataforma. Links já enviados com o domínio próprio deixam de abrir o espaço.',
    botao: 'Desativar',
  },
  remover: {
    titulo: 'Remover domínio próprio?',
    corpo: 'O domínio será apagado deste espaço. Para usá-lo de novo, será preciso cadastrar e ativar outra vez.',
    botao: 'Remover',
  },
}

const PASSOS = [
  'O DNS do domínio aponta para a hospedagem (Vercel).',
  'O domínio foi adicionado no painel da Vercel.',
  'O domínio foi liberado nas URLs de retorno da autenticação (Supabase).',
  'O domínio abre com cadeado de segurança.',
]

export function DominioCard({
  espacoId,
  slug,
  dominio,
  dominioAtivo,
}: {
  espacoId: string
  slug: string
  dominio: string | null
  dominioAtivo: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null)
  const [estado, acao, salvando] = useActionState(salvarDominio, estadoInicial)
  const [pendente, iniciar] = useTransition()

  // Fecha o formulário assim que um salvamento der certo (ajuste durante o
  // render, sem setState dentro de efeito).
  const [estadoVisto, setEstadoVisto] = useState(estado)
  if (estado !== estadoVisto) {
    setEstadoVisto(estado)
    if (estado.ok) setEditando(false)
  }

  useEffect(() => {
    if (estado.ok) toast.success('Domínio salvo. Ele fica inativo até você ativar.')
  }, [estado])

  const confirmar = () => {
    if (!confirmacao) return
    const escolha = confirmacao
    iniciar(async () => {
      if (escolha === 'ativar') await ativarDominio(espacoId)
      if (escolha === 'desativar') await desativarDominio(espacoId)
      if (escolha === 'remover') await removerDominio(espacoId)
      toast.success(
        escolha === 'ativar'
          ? 'Domínio ativado.'
          : escolha === 'desativar'
            ? 'Domínio desativado.'
            : 'Domínio removido.'
      )
      setConfirmacao(null)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Domínio próprio</CardTitle>
          {dominio && (
            <Badge variant={dominioAtivo ? 'default' : 'secondary'}>
              {dominioAtivo ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Um endereço com a marca do mentorado para as revendedoras entrarem, no lugar do endereço
          da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editando ? (
          <form action={acao} className="space-y-3">
            <input type="hidden" name="espacoId" value={espacoId} />
            <div className="space-y-2">
              <Label htmlFor="dominio">Domínio</Label>
              <Input
                id="dominio"
                name="dominio"
                placeholder="www.suamarca.com"
                defaultValue={dominio ?? ''}
                autoFocus
                required
              />
              {estado.erro && (
                <p role="alert" className="text-sm text-destructive">
                  {estado.erro}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar domínio'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : !dominio ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Este espaço usa o endereço da plataforma:{' '}
              <span className="font-medium text-foreground">
                areademembros.atacadoexponencial.com/{slug}
              </span>
            </p>
            <Button onClick={() => setEditando(true)}>Cadastrar domínio</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {dominioAtivo ? (
              <a
                href={`https://${dominio}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium underline"
              >
                {dominio}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <>
                <p className="text-sm font-medium">{dominio}</p>
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-medium">Antes de ativar, confira:</p>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {PASSOS.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {dominioAtivo ? (
                <Button variant="outline" onClick={() => setConfirmacao('desativar')}>
                  Desativar domínio
                </Button>
              ) : (
                <Button onClick={() => setConfirmacao('ativar')}>Ativar domínio</Button>
              )}
              <Button variant="outline" onClick={() => setEditando(true)}>
                Editar domínio
              </Button>
              <Button variant="outline" onClick={() => setConfirmacao('remover')}>
                Remover domínio
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmacao !== null} onOpenChange={(v) => !v && setConfirmacao(null)}>
        <DialogContent>
          {confirmacao && (
            <>
              <DialogHeader>
                <DialogTitle>{TEXTOS[confirmacao].titulo}</DialogTitle>
                <DialogDescription>{TEXTOS[confirmacao].corpo}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmacao(null)} disabled={pendente}>
                  Cancelar
                </Button>
                <Button
                  variant={confirmacao === 'ativar' ? 'default' : 'destructive'}
                  onClick={confirmar}
                  disabled={pendente}
                >
                  {pendente ? 'Aguarde…' : TEXTOS[confirmacao].botao}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
