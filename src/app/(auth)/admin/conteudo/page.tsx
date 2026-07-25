import { createAdminClient } from '@/integrations/supabase/admin'
import { listarConteudo } from './dados'
import { ConteudoLista } from './conteudo-lista'
import { NovoModuloDialog } from './novo-modulo-dialog'
import { SeletorEspaco } from './seletor-espaco'

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: Promise<{ espaco?: string }>
}) {
  const { espaco } = await searchParams
  const espacoSelecionado = espaco ?? null

  const admin = createAdminClient()
  const { data: espacos } = await admin
    .from('espacos')
    .select('id, nome_curso')
    .order('nome_curso')

  const modulos = await listarConteudo(espacoSelecionado)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            {espacoSelecionado
              ? 'Você está gerenciando o conteúdo desta marca'
              : 'Base compartilhada — aparece para todos os espaços'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorEspaco espacos={espacos ?? []} atual={espacoSelecionado} />
          <NovoModuloDialog espacoAlvo={espacoSelecionado} />
        </div>
      </div>
      <ConteudoLista modulos={modulos} />
    </div>
  )
}
