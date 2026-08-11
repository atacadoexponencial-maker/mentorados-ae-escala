import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Eye } from 'lucide-react'
import { createAdminClient } from '@/integrations/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Espaco } from '@/lib/espacos'
import { PersonalizacaoForm } from '@/app/(auth)/mentor/personalizacao/personalizacao-form'
import {
  RevendedorasTable,
  type RevendedoraLinha,
} from '@/app/(auth)/mentor/revendedores/revendedoras-table'
import { NovaRevendedoraDialog } from '@/app/(auth)/mentor/revendedores/nova-revendedora-dialog'
import { ImportarDialog } from '@/app/(auth)/mentor/revendedores/importar-dialog'

export default async function DashboardMentoradoAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: espaco } = await admin
    .from('espacos')
    .select('id, slug, nome_curso, logo_url, banner_url, cor_primaria, cor_destaque, ativo')
    .eq('slug', slug)
    .maybeSingle()
  if (!espaco) notFound()

  const { data: revendedoras } = await admin
    .from('revendedores')
    .select('id, nome, email, whatsapp, status, ultimo_acesso')
    .eq('espaco_id', espaco.id)
    .order('created_at')

  const lista = revendedoras ?? []
  const linhas: RevendedoraLinha[] = lista.map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    whatsapp: r.whatsapp,
    status: r.status as RevendedoraLinha['status'],
    ultimoAcesso: r.ultimo_acesso,
  }))
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
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          render={
            <a href={`/${espaco.slug}`} target="_blank" rel="noopener noreferrer" />
          }
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver área de membros
        </Button>
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
          <CardTitle>Personalização</CardTitle>
          <CardDescription>
            A identidade que as revendedoras veem em /{espaco.slug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalizacaoForm espaco={espaco as Espaco} espacoId={espaco.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Revendedoras</CardTitle>
              <CardDescription>
                Você pode convidar e gerenciar as revendedoras desta marca daqui, como a própria
                mentorada faria.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportarDialog espacoAlvo={espaco.id} />
              <NovaRevendedoraDialog espacoAlvo={espaco.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mesma tabela da tela da mentorada: busca, filtros, menu por linha e
              o diálogo do link de convite vêm junto. */}
          <RevendedorasTable revendedoras={linhas} />
        </CardContent>
      </Card>
    </div>
  )
}
