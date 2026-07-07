'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'

export async function sair(destino: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(destino.startsWith('/') ? destino : '/login')
}
