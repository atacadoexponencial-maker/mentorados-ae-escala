'use server'

import { headers } from 'next/headers'
import { createClient } from '@/integrations/supabase/server'
import { enderecoDoEspaco } from '@/lib/dominio/regras'

export type EstadoRecuperacao = { enviado: boolean; erro: string | null }

export async function solicitarRedefinicao(
  _estadoAnterior: EstadoRecuperacao,
  formData: FormData
): Promise<EstadoRecuperacao> {
  const email = String(formData.get('email') ?? '').trim()
  const espacoSlug = String(formData.get('espacoSlug') ?? '').trim()

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const supabase = await createClient()

  // Link do e-mail leva ao endereço do espaço (domínio próprio quando ativo)
  let base = origem
  if (espacoSlug) {
    const { data: espaco } = await supabase
      .from('espacos')
      .select('slug, dominio, dominio_ativo')
      .eq('slug', espacoSlug)
      .maybeSingle()
    const endereco = enderecoDoEspaco(
      espaco ?? { slug: espacoSlug, dominio: null, dominio_ativo: false },
      origem
    )
    base = `${endereco.origem}${endereco.prefixo}`
  }
  const destino = '/redefinir-senha'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}${destino}`,
  })

  // Resposta neutra: não revela se a conta existe (rate limit também cai aqui)
  if (error && error.status !== 429 && error.code !== 'user_not_found') {
    return { enviado: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }
  }
  return { enviado: true, erro: null }
}
