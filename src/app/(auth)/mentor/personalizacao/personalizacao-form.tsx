'use client'

import { useActionState, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { salvarPersonalizacao, type EstadoPersonalizacao } from './actions'
import type { Espaco } from '@/lib/espacos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const estadoInicial: EstadoPersonalizacao = { ok: false, erro: null }

export function PersonalizacaoForm({ espaco }: { espaco: Espaco }) {
  const [logoPrevia, setLogoPrevia] = useState<string | null>(espaco.logo_url)
  const [removerLogo, setRemoverLogo] = useState(false)
  const [nomeCurso, setNomeCurso] = useState(espaco.nome_curso)
  const [corPrimaria, setCorPrimaria] = useState(espaco.cor_primaria ?? '#171717')
  const [corDestaque, setCorDestaque] = useState(espaco.cor_destaque ?? '#737373')
  const inputLogoRef = useRef<HTMLInputElement>(null)
  const [estado, acao, pendente] = useActionState(salvarPersonalizacao, estadoInicial)

  const aoEscolherLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (arquivo) {
      setLogoPrevia(URL.createObjectURL(arquivo))
      setRemoverLogo(false)
    }
  }

  const aoRemoverLogo = () => {
    setLogoPrevia(null)
    setRemoverLogo(true)
    if (inputLogoRef.current) inputLogoRef.current.value = ''
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sua marca</CardTitle>
          <CardDescription>Logo, nome do curso e cores</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acao} className="space-y-5">
            <input type="hidden" name="removerLogo" value={removerLogo ? 'sim' : 'nao'} />
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-3">
                {logoPrevia ? (
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPrevia} alt="Logo" className="h-9 w-9 object-contain" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                    Sem logo
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputLogoRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar logo
                </Button>
                {logoPrevia && (
                  <Button type="button" variant="ghost" size="sm" onClick={aoRemoverLogo}>
                    <X className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
                <input
                  ref={inputLogoRef}
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={aoEscolherLogo}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome-curso">Nome do curso</Label>
              <Input
                id="nome-curso"
                name="nomeCurso"
                value={nomeCurso}
                onChange={(e) => setNomeCurso(e.target.value)}
                placeholder="Ex.: Academia João Atacados"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor-primaria">Cor primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="cor-primaria"
                    name="corPrimaria"
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">{corPrimaria}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor-destaque">Cor de destaque</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="cor-destaque"
                    name="corDestaque"
                    type="color"
                    value={corDestaque}
                    onChange={(e) => setCorDestaque(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">{corDestaque}</span>
                </div>
              </div>
            </div>

            {estado.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
            {estado.ok && (
              <p role="status" className="text-sm text-muted-foreground">
                Personalização salva! Suas revendedoras já veem a nova identidade.
              </p>
            )}

            <Separator />
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Como suas revendedoras vão ver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
              {logoPrevia ? (
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPrevia} alt="" className="h-5 w-5 object-contain" />
                </span>
              ) : null}
              <span className="text-sm font-semibold">{nomeCurso || 'Nome do curso'}</span>
            </div>
            <div className="space-y-3 p-4">
              <div
                className="flex h-16 items-center rounded-md px-4 text-sm font-semibold text-white"
                style={{ backgroundColor: corPrimaria }}
              >
                Bem-vinda ao treinamento!
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['Primeiros passos', 'Precificação'].map((titulo) => (
                  <div key={titulo} className="rounded-md border border-border p-3">
                    <div className="mb-2 h-14 rounded bg-muted" />
                    <p className="text-xs font-medium">{titulo}</p>
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: corDestaque }}
                    >
                      Nova aula
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-white"
                style={{ backgroundColor: corPrimaria }}
              >
                Continuar assistindo
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
