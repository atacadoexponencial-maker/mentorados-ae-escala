import { getEspacoPorSlug } from '@/lib/espacos'

export default async function EspacoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = await getEspacoPorSlug(espaco)

  // Slug inexistente: renderiza sem identidade — a página chama notFound()
  // e o not-found.tsx deste segmento assume.
  const style = dados?.cor_primaria
    ? ({ '--primary': dados.cor_primaria, '--ring': dados.cor_primaria } as React.CSSProperties)
    : undefined

  return (
    <div style={style} className="flex min-h-screen flex-1 flex-col">
      {children}
    </div>
  )
}
