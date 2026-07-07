'use server'

import { headers } from 'next/headers'
import { createClient } from '@/integrations/supabase/server'

export type EstadoRecuperacao = { enviado: boolean; erro: string | null }

export async function solicitarRedefinicao(
  _estadoAnterior: EstadoRecuperacao,
  formData: FormData
): Promise<EstadoRecuperacao> {
  const email = String(formData.get('email') ?? '').trim()
  const espacoSlug = String(formData.get('espacoSlug') ?? '').trim()

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const destino = espacoSlug ? `/${espacoSlug}/redefinir-senha` : '/redefinir-senha'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}${destino}`,
  })

  // Resposta neutra: não revela se a conta existe (rate limit também cai aqui)
  if (error && error.status !== 429 && error.code !== 'user_not_found') {
    return { enviado: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }
  }
  return { enviado: true, erro: null }
}
