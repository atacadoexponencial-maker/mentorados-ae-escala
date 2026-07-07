// Uso exclusivo no servidor (o client de server.ts depende de next/headers)
import { createClient } from '@/integrations/supabase/server'

export type Espaco = {
  id: string
  slug: string
  nome_curso: string
  logo_url: string | null
  cor_primaria: string | null
  cor_destaque: string | null
  ativo: boolean
}

export async function getEspacoPorSlug(slug: string): Promise<Espaco | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('espacos')
    .select('id, slug, nome_curso, logo_url, cor_primaria, cor_destaque, ativo')
    .eq('slug', slug)
    .maybeSingle()
  return data
}
