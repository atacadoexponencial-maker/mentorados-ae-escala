import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'
import { PrimeiroAcessoForm } from '@/app/[espaco]/primeiro-acesso/primeiro-acesso-form'

export default async function RedefinirSenhaEquipePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Mentorados AE Escala</h1>
          <p className="text-sm text-muted-foreground">Defina sua nova senha</p>
        </div>
        <PrimeiroAcessoForm />
      </div>
    </div>
  )
}
