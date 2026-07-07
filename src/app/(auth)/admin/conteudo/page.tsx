'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from 'lucide-react'
import { formatarDuracao, mockAulas, mockModulos } from '@/lib/mock-data'
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

function DialogNovoModulo() {
  const [aberto, setAberto] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Novo módulo
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
            <DialogTitle>Novo módulo</DialogTitle>
            <DialogDescription>O módulo aparece para todos os espaços.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="modulo-nome">Nome</Label>
            <Input id="modulo-nome" placeholder="Ex.: Precificação e Margem" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modulo-descricao">Descrição</Label>
            <Textarea id="modulo-descricao" placeholder="Sobre o que é este módulo" />
          </div>
          <DialogFooter>
            <Button type="submit">Criar módulo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogNovaAula({ moduloTitulo }: { moduloTitulo: string }) {
  const [aberto, setAberto] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Nova aula
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
            <DialogTitle>Nova aula</DialogTitle>
            <DialogDescription>Aula do módulo &quot;{moduloTitulo}&quot;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="aula-titulo">Título</Label>
            <Input id="aula-titulo" placeholder="Ex.: A regra do markup" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-descricao">Descrição</Label>
            <Textarea id="aula-descricao" placeholder="O que a revendedora vai aprender" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-video">Vídeo (ID no Panda Video)</Label>
            <Input id="aula-video" placeholder="Ex.: 3f8a2b1c-…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-capa">Imagem de capa</Label>
            <Input id="aula-capa" type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-materiais">Materiais complementares</Label>
            <Input id="aula-materiais" type="file" multiple />
          </div>
          <DialogFooter>
            <Button type="submit">Criar aula</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ConteudoPage() {
  const modulosOrdenados = [...mockModulos].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            Módulos e aulas distribuídos para todos os espaços
          </p>
        </div>
        <DialogNovoModulo />
      </div>

      {modulosOrdenados.map((modulo) => {
        const aulas = mockAulas
          .filter((a) => a.moduloId === modulo.id)
          .sort((a, b) => a.ordem - b.ordem)
        return (
          <Card key={modulo.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>
                  Módulo {modulo.ordem} — {modulo.titulo}
                </CardTitle>
                <CardDescription>
                  {modulo.descricao} · {aulas.length}{' '}
                  {aulas.length === 1 ? 'aula' : 'aulas'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Mover módulo para cima">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Mover módulo para baixo">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <DialogNovaAula moduloTitulo={modulo.titulo} />
                <Button variant="outline" size="sm" disabled={aulas.length > 0}>
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
                  {aulas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                        Nenhuma aula neste módulo
                      </TableCell>
                    </TableRow>
                  ) : (
                    aulas.map((aula) => (
                      <TableRow key={aula.id}>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {aula.ordem}
                            <ArrowUp className="h-3 w-3" />
                            <ArrowDown className="h-3 w-3" />
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{aula.titulo}</TableCell>
                        <TableCell>{formatarDuracao(aula.duracaoSegundos)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {aula.materiais.length === 0
                            ? '—'
                            : `${aula.materiais.length} ${aula.materiais.length === 1 ? 'arquivo' : 'arquivos'}`}
                        </TableCell>
                        <TableCell>
                          {aula.status === 'publicada' ? (
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
                              <DropdownMenuItem>
                                {aula.status === 'publicada' ? 'Despublicar' : 'Publicar'}
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
        )
      })}
    </div>
  )
}
