import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'
import type { Espaco } from '@/lib/espacos'
import { PersonalizacaoForm } from './personalizacao-form'

export default async function PersonalizacaoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: espaco } = await supabase
    .from('espacos')
    .select('id, slug, nome_curso, logo_url, cor_primaria, cor_destaque, ativo')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()
  if (!espaco) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personalização</h1>
        <p className="text-sm text-muted-foreground">
          A identidade que suas revendedoras veem no espaço /{espaco.slug}
        </p>
      </div>
      <PersonalizacaoForm espaco={espaco as Espaco} />
    </div>
  )
}
