import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/integrations/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusLabel: Record<string, string> = {
  ativo: 'Ativa',
  inativo: 'Inativa',
  'convite-pendente': 'Convite pendente',
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function DashboardMentoradoAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: espaco } = await admin
    .from('espacos')
    .select('id, slug, nome_curso, ativo')
    .eq('slug', slug)
    .maybeSingle()
  if (!espaco) notFound()

  const { data: revendedoras } = await admin
    .from('revendedores')
    .select('id, nome, email, status, ultimo_acesso')
    .eq('espaco_id', espaco.id)
    .order('created_at')

  const lista = revendedoras ?? []
  const contagens = {
    ativas: lista.filter((r) => r.status === 'ativo').length,
    inativas: lista.filter((r) => r.status === 'inativo').length,
    pendentes: lista.filter((r) => r.status === 'convite-pendente').length,
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/mentorados"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar aos mentorados
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{espaco.nome_curso}</h1>
        <span className="text-sm text-muted-foreground">/{espaco.slug}</span>
        <Badge variant={espaco.ativo ? 'default' : 'secondary'}>
          {espaco.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { rotulo: 'Revendedoras ativas', valor: contagens.ativas },
          { rotulo: 'Inativas', valor: contagens.inativas },
          { rotulo: 'Convite pendente', valor: contagens.pendentes },
        ].map((t) => (
          <Card key={t.rotulo}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t.rotulo}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{t.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revendedoras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhuma revendedora cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                lista.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'ativo' ? 'default' : 'secondary'}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatarData(r.ultimo_acesso)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
