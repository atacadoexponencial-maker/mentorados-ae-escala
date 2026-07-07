import { LoginForm } from '@/app/[espaco]/login/login-form'

export default function LoginEquipePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Mentorados AE Escala</h1>
          <p className="text-sm text-muted-foreground">Acesso da equipe e mentorados</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
