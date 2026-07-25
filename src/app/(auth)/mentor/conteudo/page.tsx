import { redirect } from 'next/navigation'
import { exigirMentorado } from '../revendedores/actions'
import { listarConteudo } from '@/app/(auth)/admin/conteudo/dados'
import { ConteudoLista } from '@/app/(auth)/admin/conteudo/conteudo-lista'
import { NovoModuloDialog } from '@/app/(auth)/admin/conteudo/novo-modulo-dialog'

export default async function ConteudoMentorPage() {
  const contexto = await exigirMentorado()
  if (!contexto) redirect('/login')

  // As mesmas ações resolvem o escopo pela sessão (mentorado → próprio espaço),
  // então os componentes do admin funcionam aqui sem alteração.
  const modulos = await listarConteudo(contexto.espacoId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            As aulas do seu espaço. No catálogo, aparecem abaixo do conteúdo da AE Escala.
          </p>
        </div>
        <NovoModuloDialog espacoAlvo={contexto.espacoId} />
      </div>
      <ConteudoLista modulos={modulos} />
    </div>
  )
}
