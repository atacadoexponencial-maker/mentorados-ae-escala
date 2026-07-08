'use client'

import { useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { formatarDuracao } from '@/lib/mock-data'
import { excluirModulo, moverModulo } from './actions'
import type { ModuloLinha } from './dados'
import { CapaDialog } from './capa-dialog'
import { EditarModuloDialog } from './editar-modulo-dialog'
import { NovaAulaDialog } from './nova-aula-dialog'
import type { AulaLinha } from './dados'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export function ConteudoLista({ modulos }: { modulos: ModuloLinha[] }) {
  const [editandoModulo, setEditandoModulo] = useState<ModuloLinha | null>(null)
  const [novaAulaEm, setNovaAulaEm] = useState<{ id: string; titulo: string } | null>(null)
  const [capaDe, setCapaDe] = useState<AulaLinha | null>(null)
  const [pendente, iniciarTransicao] = useTransition()

  if (modulos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Nenhum módulo criado ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {modulos.map((modulo, indice) => (
        <Card key={modulo.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>
                Módulo {modulo.ordem} — {modulo.titulo}
              </CardTitle>
              <CardDescription>
                {modulo.descricao ? `${modulo.descricao} · ` : ''}
                {modulo.aulas.length} {modulo.aulas.length === 1 ? 'aula' : 'aulas'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar módulo"
                onClick={() => setEditandoModulo(modulo)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mover módulo para cima"
                disabled={pendente || indice === 0}
                onClick={() => iniciarTransicao(() => moverModulo(modulo.id, 'cima'))}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mover módulo para baixo"
                disabled={pendente || indice === modulos.length - 1}
                onClick={() => iniciarTransicao(() => moverModulo(modulo.id, 'baixo'))}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNovaAulaEm({ id: modulo.id, titulo: modulo.titulo })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova aula
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pendente || modulo.aulas.length > 0}
                onClick={() => iniciarTransicao(() => excluirModulo(modulo.id))}
              >
                Excluir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulo.aulas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      Nenhuma aula neste módulo
                    </TableCell>
                  </TableRow>
                ) : (
                  modulo.aulas.map((aula) => (
                    <TableRow key={aula.id}>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {aula.ordem}
                          <ArrowUp className="h-3 w-3" />
                          <ArrowDown className="h-3 w-3" />
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{aula.titulo}</TableCell>
                      <TableCell>
                        {aula.duracaoSegundos ? formatarDuracao(aula.duracaoSegundos) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {aula.qtdMateriais === 0
                          ? '—'
                          : `${aula.qtdMateriais} ${aula.qtdMateriais === 1 ? 'arquivo' : 'arquivos'}`}
                      </TableCell>
                      <TableCell>
                        {aula.publicada ? (
                          <Badge>Publicada</Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" aria-label="Ações da aula" />}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCapaDe(aula)}>
                              Definir capa
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              {aula.publicada ? 'Despublicar' : 'Publicar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>Mover para outro módulo</DropdownMenuItem>
                            <DropdownMenuItem>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <EditarModuloDialog
        key={editandoModulo?.id ?? 'fechado'}
        modulo={editandoModulo}
        onClose={() => setEditandoModulo(null)}
      />
      <NovaAulaDialog
        key={`aula-${novaAulaEm?.id ?? 'fechado'}`}
        modulo={novaAulaEm}
        onClose={() => setNovaAulaEm(null)}
      />
      <CapaDialog
        key={`capa-${capaDe?.id ?? 'fechado'}`}
        aula={capaDe}
        onClose={() => setCapaDe(null)}
      />
    </div>
  )
}
