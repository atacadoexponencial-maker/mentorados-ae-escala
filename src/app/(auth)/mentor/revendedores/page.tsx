import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'
import { LIMITE_REVENDEDORAS } from './limite'
import { ImportarDialog } from './importar-dialog'
import { NovaRevendedoraDialog } from './nova-revendedora-dialog'
import { RevendedorasTable, type RevendedoraLinha } from './revendedoras-table'

export default async function RevendedorasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS (revendedores_select_mentorado) limita ao espaço do dono
  const { data: revendedoras } = await supabase
    .from('revendedores')
    .select('id, nome, email, whatsapp, status, ultimo_acesso')
    .order('created_at')

  const linhas: RevendedoraLinha[] = (revendedoras ?? []).map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    whatsapp: r.whatsapp,
    status: r.status as RevendedoraLinha['status'],
    ultimoAcesso: r.ultimo_acesso,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revendedoras</h1>
          <p className="text-sm text-muted-foreground">
            {linhas.length} de {LIMITE_REVENDEDORAS.toLocaleString('pt-BR')} revendedoras
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportarDialog />
          <NovaRevendedoraDialog />
        </div>
      </div>
      <RevendedorasTable revendedoras={linhas} />
    </div>
  )
}
