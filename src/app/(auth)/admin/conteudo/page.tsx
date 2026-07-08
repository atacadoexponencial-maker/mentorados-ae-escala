import { listarConteudo } from './dados'
import { ConteudoLista } from './conteudo-lista'
import { NovoModuloDialog } from './novo-modulo-dialog'

export default async function ConteudoPage() {
  const modulos = await listarConteudo()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            Módulos e aulas distribuídos para todos os espaços
          </p>
        </div>
        <NovoModuloDialog />
      </div>
      <ConteudoLista modulos={modulos} />
    </div>
  )
}
