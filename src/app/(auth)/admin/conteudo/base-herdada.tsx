'use client'

import { useActionState, useState } from 'react'
import { removerCapaDoEspaco, type EstadoConteudo } from './actions'
import { CapaDialog } from './capa-dialog'
import type { AulaBaseLinha, ModuloBaseLinha } from './dados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

function BotaoRemoverCapa({ aulaId, espacoId }: { aulaId: string; espacoId: string }) {
  const [estado, acao, pendente] = useActionState(removerCapaDoEspaco, estadoInicial)
  return (
    <form action={acao}>
      <input type="hidden" name="aulaId" value={aulaId} />
      <input type="hidden" name="espacoId" value={espacoId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendente}>
        {pendente ? 'Removendo…' : 'Remover capa desta marca'}
      </Button>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
    </form>
  )
}

// Conteúdo base visto por uma marca: só leitura, exceto a capa.
export function BaseHerdada({
  modulos,
  espacoId,
}: {
  modulos: ModuloBaseLinha[]
  espacoId: string
}) {
  const [capaDe, setCapaDe] = useState<AulaBaseLinha | null>(null)

  if (modulos.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conteúdo base (herdado)</CardTitle>
        <CardDescription>
          Aparece nesta marca junto com o conteúdo próprio. Só a capa pode ser trocada aqui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {modulos.map((modulo) => (
          <section key={modulo.id}>
            <h3 className="mb-3 text-sm font-semibold">{modulo.titulo}</h3>
            <div className="space-y-2">
              {modulo.aulas.map((aula) => (
                <div
                  key={aula.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">
                    {aula.capaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={aula.capaUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{aula.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {aula.temCapaPropria ? 'Capa própria desta marca' : 'Usando a capa base'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCapaDe(aula)}>
                    Trocar capa nesta marca
                  </Button>
                  {aula.temCapaPropria && (
                    <BotaoRemoverCapa aulaId={aula.id} espacoId={espacoId} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <CapaDialog
          key={`capa-${capaDe?.id ?? 'fechado'}`}
          aula={capaDe}
          espacoId={espacoId}
          onClose={() => setCapaDe(null)}
        />
      </CardContent>
    </Card>
  )
}
