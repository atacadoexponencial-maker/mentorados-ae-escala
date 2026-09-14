import type { Metadata } from 'next'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sobrescreve o título da plataforma herdado do layout raiz.
export const metadata: Metadata = { title: 'Espaço indisponível', description: '' }

// Servida quando um domínio chega à plataforma sem espaço ativo ligado a ele.
// Neutra de propósito: não mostra marca da plataforma nem de nenhum espaço.
export default function EspacoIndisponivelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Espaço indisponível</CardTitle>
          <CardDescription>
            Este endereço não está disponível no momento. Tente novamente mais tarde.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
