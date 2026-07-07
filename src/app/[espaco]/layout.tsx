import { getMockEspaco } from '@/lib/mock-data'

export default async function EspacoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = getMockEspaco(espaco)

  // Slug inexistente: renderiza sem identidade — a página chama notFound()
  // e o not-found.tsx deste segmento assume.
  const style = dados?.corPrimaria
    ? ({ '--primary': dados.corPrimaria, '--ring': dados.corPrimaria } as React.CSSProperties)
    : undefined

  return (
    <div style={style} className="flex min-h-screen flex-1 flex-col">
      {children}
    </div>
  )
}
