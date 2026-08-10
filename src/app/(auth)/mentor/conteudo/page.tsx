import { redirect } from 'next/navigation'
import { exigirMentorado } from '../revendedores/actions'
import { listarConteudo, listarBaseComCapas } from '@/app/(auth)/admin/conteudo/dados'
import { BaseHerdada } from '@/app/(auth)/admin/conteudo/base-herdada'
import { ConteudoLista } from '@/app/(auth)/admin/conteudo/conteudo-lista'
import { NovoModuloDialog } from '@/app/(auth)/admin/conteudo/novo-modulo-dialog'

export default async function ConteudoMentorPage() {
  const contexto = await exigirMentorado()
  if (!contexto) redirect('/login')

  // As mesmas ações resolvem o escopo pela sessão (mentorado → próprio espaço),
  // então os componentes do admin funcionam aqui sem alteração.
  const modulos = await listarConteudo(contexto.espacoId)
  const baseHerdada = await listarBaseComCapas(contexto.espacoId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            O conteúdo da AE Escala vem primeiro no seu catálogo e você pode trocar as capas dele.
            Abaixo aparecem as aulas que você criar aqui.
          </p>
        </div>
        <NovoModuloDialog espacoAlvo={contexto.espacoId} />
      </div>
      <BaseHerdada modulos={baseHerdada} espacoId={contexto.espacoId} />
      <ConteudoLista modulos={modulos} />
    </div>
  )
}
