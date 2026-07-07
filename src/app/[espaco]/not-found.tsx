import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function EspacoNaoEncontrado() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Espaço não encontrado</CardTitle>
          <CardDescription>
            O endereço que você acessou não existe ou não está mais disponível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Confira o link que você recebeu do seu mentor e tente novamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
