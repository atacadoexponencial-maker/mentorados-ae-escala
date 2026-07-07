'use client'

import { useState } from 'react'
import { MoreHorizontal, Plus, Search, Upload } from 'lucide-react'
import { mockRevendedores, type MockRevendedor } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const LIMITE_REVENDEDORES = 1000

const statusLabel: Record<MockRevendedor['status'], string> = {
  ativo: 'Ativa',
  inativo: 'Inativa',
  'convite-pendente': 'Convite pendente',
}

const statusVariant: Record<MockRevendedor['status'], 'default' | 'secondary' | 'outline'> = {
  ativo: 'default',
  inativo: 'secondary',
  'convite-pendente': 'outline',
}

const filtros = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'ativo', rotulo: 'Ativas' },
  { valor: 'inativo', rotulo: 'Inativas' },
  { valor: 'convite-pendente', rotulo: 'Convite pendente' },
] as const

function formatarUltimoAcesso(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function DialogNovaRevendedora() {
  const [aberto, setAberto] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Nova revendedora
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setAberto(false)
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Nova revendedora</DialogTitle>
            <DialogDescription>
              O convite de primeiro acesso será enviado ao e-mail informado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rev-nome">Nome</Label>
            <Input id="rev-nome" placeholder="Nome completo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-email">E-mail</Label>
            <Input id="rev-email" type="email" placeholder="email@exemplo.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-whatsapp">WhatsApp (opcional)</Label>
            <Input id="rev-whatsapp" placeholder="(11) 99999-9999" />
          </div>
          <DialogFooter>
            <Button type="submit">Cadastrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogImportarLista() {
  const [aberto, setAberto] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="mr-2 h-4 w-4" />
        Importar lista
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setAberto(false)
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Importar lista de revendedoras</DialogTitle>
            <DialogDescription>
              Cole uma revendedora por linha, no formato: nome, e-mail
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={'Fernanda Alves, fernanda@gmail.com\nPatrícia Gomes, pati@hotmail.com'}
            rows={8}
            required
          />
          <DialogFooter>
            <Button type="submit">Importar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function RevendedoresPage() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<(typeof filtros)[number]['valor']>('todas')

  const filtradas = mockRevendedores.filter((r) => {
    const casaBusca =
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      r.email.toLowerCase().includes(busca.toLowerCase())
    const casaFiltro = filtro === 'todas' || r.status === filtro
    return casaBusca && casaFiltro
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revendedoras</h1>
          <p className="text-sm text-muted-foreground">
            {mockRevendedores.length} de {LIMITE_REVENDEDORES.toLocaleString('pt-BR')} revendedoras
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DialogImportarLista />
          <DialogNovaRevendedora />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <Button
              key={f.valor}
              variant={filtro === f.valor ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma revendedora encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell className="text-muted-foreground">{r.whatsapp ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatarUltimoAcesso(r.ultimoAcesso)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" aria-label="Ações" />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {r.status === 'convite-pendente' && (
                          <DropdownMenuItem>Reenviar convite</DropdownMenuItem>
                        )}
                        {r.status === 'ativo' && <DropdownMenuItem>Desativar</DropdownMenuItem>}
                        {r.status === 'inativo' && <DropdownMenuItem>Reativar</DropdownMenuItem>}
                        <DropdownMenuItem>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
