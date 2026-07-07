'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { getMockEspaco } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const espacoInicial = getMockEspaco('joao-atacados')!

export default function PersonalizacaoPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(espacoInicial.logoUrl)
  const [nomeCurso, setNomeCurso] = useState(espacoInicial.nomeCurso)
  const [corPrimaria, setCorPrimaria] = useState(espacoInicial.corPrimaria ?? '#171717')
  const [corDestaque, setCorDestaque] = useState(espacoInicial.corDestaque ?? '#737373')
  const inputLogoRef = useRef<HTMLInputElement>(null)

  const aoEscolherLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (arquivo) setLogoUrl(URL.createObjectURL(arquivo))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personalização</h1>
        <p className="text-sm text-muted-foreground">
          A identidade que suas revendedoras veem no espaço
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sua marca</CardTitle>
            <CardDescription>Logo, nome do curso e cores</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                      Sem logo
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => inputLogoRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar logo
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                      <X className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                  <input
                    ref={inputLogoRef}
                    id="logo"
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
                  value={nomeCurso}
                  onChange={(e) => setNomeCurso(e.target.value)}
                  placeholder="Ex.: Academia João Atacados"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cor-primaria">Cor primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cor-primaria"
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
                      type="color"
                      value={corDestaque}
                      onChange={(e) => setCorDestaque(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1"
                    />
                    <span className="text-sm tabular-nums text-muted-foreground">{corDestaque}</span>
                  </div>
                </div>
              </div>

              <Separator />
              <Button type="submit">Salvar</Button>
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
                {logoUrl ? (
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="" className="h-5 w-5 object-contain" />
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
    </div>
  )
}
