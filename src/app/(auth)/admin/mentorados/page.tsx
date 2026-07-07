'use client'

import { useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { mockMentorados, type MockMentorado } from '@/lib/mock-data'
import { NovoMentoradoDialog } from './novo-mentorado-dialog'
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

const statusLabel: Record<MockMentorado['status'], string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  'convite-pendente': 'Convite pendente',
}

const statusVariant: Record<MockMentorado['status'], 'default' | 'secondary' | 'outline'> = {
  ativo: 'default',
  inativo: 'secondary',
  'convite-pendente': 'outline',
}

export default function MentoradosPage() {
  const [busca, setBusca] = useState('')

  const filtrados = mockMentorados.filter(
    (m) =>
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.marca.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mentorados</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os espaços dos seus mentorados
          </p>
        </div>
        <NovoMentoradoDialog />
      </div>

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
                  <TableCell className="text-right">{m.qtdRevendedores}</TableCell>
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
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        {m.status === 'ativo' && <DropdownMenuItem>Desativar</DropdownMenuItem>}
                        {m.status === 'inativo' && <DropdownMenuItem>Reativar</DropdownMenuItem>}
                        {m.status === 'convite-pendente' && (
                          <DropdownMenuItem>Reenviar convite</DropdownMenuItem>
                        )}
                        <DropdownMenuItem>Ver dashboard</DropdownMenuItem>
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
