import { RecuperarForm } from '@/app/[espaco]/recuperar-senha/recuperar-form'

export default function RecuperarSenhaEquipePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Mentorados AE Escala</h1>
          <p className="text-sm text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição de senha
          </p>
        </div>
        <RecuperarForm />
      </div>
    </div>
  )
}
