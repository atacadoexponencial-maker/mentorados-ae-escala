'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { desativarMentorado, reativarMentorado, reenviarConviteMentorado } from './actions'
import type { MentoradoLinha } from './dados'
import { EditarMentoradoDialog } from './editar-mentorado-dialog'
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

const statusLabel: Record<MentoradoLinha['status'], string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  'convite-pendente': 'Convite pendente',
}

const statusVariant: Record<MentoradoLinha['status'], 'default' | 'secondary' | 'outline'> = {
  ativo: 'default',
  inativo: 'secondary',
  'convite-pendente': 'outline',
}

export function MentoradosTable({ mentorados }: { mentorados: MentoradoLinha[] }) {
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<MentoradoLinha | null>(null)
  const [pendente, iniciarTransicao] = useTransition()

  const filtrados = mentorados.filter(
    (m) =>
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.marca.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou marca…"
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="text-right">Revendedores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum mentorado encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell>{m.marca}</TableCell>
                  <TableCell className="text-muted-foreground">/{m.slug}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.qtdRevendedores}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[m.status]}>{statusLabel[m.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" aria-label="Ações" />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditando(m)}>Editar</DropdownMenuItem>
                        {m.status === 'ativo' && (
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => desativarMentorado(m.id))}
                          >
                            Desativar
                          </DropdownMenuItem>
                        )}
                        {m.status === 'inativo' && (
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => reativarMentorado(m.id))}
                          >
                            Reativar
                          </DropdownMenuItem>
                        )}
                        {m.status === 'convite-pendente' && (
                          <DropdownMenuItem
                            disabled={pendente}
                            onClick={() => iniciarTransicao(() => reenviarConviteMentorado(m.id))}
                          >
                            Reenviar convite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          render={<Link href={`/admin/mentorados/${m.slug}`} />}
                        >
                          Ver dashboard
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

      {/* key remonta o dialog a cada linha editada — zera o estado da action anterior */}
      <EditarMentoradoDialog
        key={editando?.id ?? 'fechado'}
        mentorado={editando}
        onClose={() => setEditando(null)}
      />
    </div>
  )
}
