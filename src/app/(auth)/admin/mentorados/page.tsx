import { listarMentorados } from './dados'
import { MentoradosTable } from './mentorados-table'
import { NovoMentoradoDialog } from './novo-mentorado-dialog'

export default async function MentoradosPage() {
  const mentorados = await listarMentorados()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mentorados</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os espaços dos seus mentorados
          </p>
        </div>
        <NovoMentoradoDialog />
      </div>
      <MentoradosTable mentorados={mentorados} />
    </div>
  )
}
