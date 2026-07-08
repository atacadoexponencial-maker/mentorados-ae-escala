'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import {
  desativarRevendedora,
  excluirRevendedora,
  reativarRevendedora,
  reenviarConviteRevendedora,
} from './actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type RevendedoraLinha = {
  id: string
  nome: string | null
  email: string
  whatsapp: string | null
  status: 'ativo' | 'inativo' | 'convite-pendente'
  ultimoAcesso: string | null
}

const statusLabel: Record<RevendedoraLinha['status'], string> = {
  ativo: 'Ativa',
  inativo: 'Inativa',
  'convite-pendente': 'Convite pendente',
}

const statusVariant: Record<RevendedoraLinha['status'], 'default' | 'secondary' | 'outline'> = {
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

export function RevendedorasTable({ revendedoras }: { revendedoras: RevendedoraLinha[] }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<(typeof filtros)[number]['valor']>('todas')
  const [pendente, iniciarTransicao] = useTransition()

  const filtradas = revendedoras.filter((r) => {
    const casaBusca =
      (r.nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
      r.email.toLowerCase().includes(busca.toLowerCase())
    const casaFiltro = filtro === 'todas' || r.status === filtro
    return casaBusca && casaFiltro
  })

  return (
    <div className="space-y-6">
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
                  <TableCell className="font-medium">{r.nome ?? '—'}</TableCell>
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
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => reenviarConviteRevendedora(r.id))}
                          >
                            Reenviar convite
                          </DropdownMenuItem>
                        )}
                        {r.status === 'ativo' && (
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => desativarRevendedora(r.id))}
                          >
                            Desativar
                          </DropdownMenuItem>
                        )}
                        {r.status === 'inativo' && (
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => reativarRevendedora(r.id))}
                          >
                            Reativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={pendente}
                          onClick={() => iniciarTransicao(() => excluirRevendedora(r.id))}
                        >
                          Excluir
                        </DropdownMenuItem>
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
