import { getEspacoPorSlug } from '@/lib/espacos'
import { corDoTextoSobre } from '@/lib/capas'

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
    ? ({
        '--primary': dados.cor_primaria,
        '--ring': dados.cor_primaria,
        // Sem isso o texto do botão herda a cor do tema (escura) e some sobre
        // uma cor primária escura.
        '--primary-foreground': corDoTextoSobre(dados.cor_primaria),
      } as React.CSSProperties)
    : undefined

  return (
    <div style={style} className="flex min-h-screen flex-1 flex-col">
      {children}
    </div>
  )
}
