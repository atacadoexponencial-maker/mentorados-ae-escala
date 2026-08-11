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
import { LIMITES, erroDeTamanho } from '@/lib/upload'

const estadoInicial: EstadoPersonalizacao = { ok: false, erro: null }

// Um <input type="color"> solto lê como amostra de cor, não como controle: nada
// nele diz que abre um seletor. Aqui a linha inteira é rótulo do campo, então
// clicar em qualquer ponto dela abre o seletor, e o "Trocar" torna isso visível.
function CampoCor({
  id,
  name,
  rotulo,
  valor,
  aoMudar,
}: {
  id: string
  name: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <label
        htmlFor={id}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input px-2 transition-colors hover:bg-accent"
      >
        <input
          id={id}
          name={name}
          type="color"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-sm tabular-nums">{valor}</span>
        <span className="ml-auto text-xs text-muted-foreground">Trocar</span>
      </label>
    </div>
  )
}

export function PersonalizacaoForm({ espaco, espacoId }: { espaco: Espaco; espacoId?: string }) {
  const [logoPrevia, setLogoPrevia] = useState<string | null>(espaco.logo_url)
  const [removerLogo, setRemoverLogo] = useState(false)
  const [bannerPrevia, setBannerPrevia] = useState<string | null>(espaco.banner_url)
  const [removerBanner, setRemoverBanner] = useState(false)
  const [nomeCurso, setNomeCurso] = useState(espaco.nome_curso)
  const [corPrimaria, setCorPrimaria] = useState(espaco.cor_primaria ?? '#171717')
  const [corDestaque, setCorDestaque] = useState(espaco.cor_destaque ?? '#737373')
  const inputLogoRef = useRef<HTMLInputElement>(null)
  const inputBannerRef = useRef<HTMLInputElement>(null)
  const [estado, acao, pendente] = useActionState(salvarPersonalizacao, estadoInicial)
  // Erro detectado no próprio navegador, antes de enviar. O servidor continua
  // validando: isto é aviso, não autorização.
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)

  const aoEscolherLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const erro = erroDeTamanho(arquivo, LIMITES.logo, 'A logo')
    if (erro) {
      setErroArquivo(erro)
      e.target.value = ''
      return
    }
    setErroArquivo(null)
    setLogoPrevia(URL.createObjectURL(arquivo))
    setRemoverLogo(false)
  }

  const aoRemoverLogo = () => {
    setLogoPrevia(null)
    setRemoverLogo(true)
    if (inputLogoRef.current) inputLogoRef.current.value = ''
  }

  const aoEscolherBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const erro = erroDeTamanho(arquivo, LIMITES.banner, 'O banner')
    if (erro) {
      setErroArquivo(erro)
      e.target.value = ''
      return
    }
    setErroArquivo(null)
    setBannerPrevia(URL.createObjectURL(arquivo))
    setRemoverBanner(false)
  }

  const aoRemoverBanner = () => {
    setBannerPrevia(null)
    setRemoverBanner(true)
    if (inputBannerRef.current) inputBannerRef.current.value = ''
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
            <input type="hidden" name="removerBanner" value={removerBanner ? 'sim' : 'nao'} />
            {espacoId && <input type="hidden" name="espacoId" value={espacoId} />}

            {/* Nome e cores vêm antes dos uploads: são os campos mais simples de
                mexer, e enterrados abaixo de dois blocos de imagem com parágrafo
                de instrução eles nem apareciam na primeira tela. */}
            <div className="space-y-2" data-tour="nome-curso">
              <Label htmlFor="nome-curso">Nome do curso</Label>
              <Input
                id="nome-curso"
                name="nomeCurso"
                value={nomeCurso}
                onChange={(e) => setNomeCurso(e.target.value)}
                placeholder="Ex.: Academia João Atacados"
                required
              />
              <p className="text-xs text-muted-foreground">
                Aparece no topo da área de membros, ao lado da logo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4" data-tour="cores">
              <CampoCor
                id="cor-primaria"
                name="corPrimaria"
                rotulo="Cor primária"
                valor={corPrimaria}
                aoMudar={setCorPrimaria}
              />
              <CampoCor
                id="cor-destaque"
                name="corDestaque"
                rotulo="Cor de destaque"
                valor={corDestaque}
                aoMudar={setCorDestaque}
              />
            </div>

            <Separator />

            <div className="space-y-2" data-tour="logo">
              <Label htmlFor="logo">Logo</Label>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou WEBP até 2 MB. Quadrada (ex.: 512×512 px). Ela é recortada em
                círculo, então deixe o símbolo no centro — as quinas não aparecem.
              </p>
              <div className="flex items-center gap-3">
                {logoPrevia ? (
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPrevia} alt="Logo" className="h-full w-full object-cover" />
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
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={aoEscolherLogo}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner">Banner do topo</Label>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou WEBP até 5 MB. Use 2400×640 px. O banner ocupa a largura toda da tela,
                então em telas mais largas ou mais estreitas ele é aparado nas bordas — deixe logo e
                texto no centro. Sem banner, entra um degradê com as suas cores.
              </p>
              {bannerPrevia ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerPrevia}
                    alt="Banner"
                    className="aspect-[2400/640] w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[2400/640] w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  Sem banner (usa o degradê das cores)
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputBannerRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar banner
                </Button>
                {bannerPrevia && (
                  <Button type="button" variant="ghost" size="sm" onClick={aoRemoverBanner}>
                    <X className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
                <input
                  ref={inputBannerRef}
                  id="banner"
                  name="banner"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={aoEscolherBanner}
                />
              </div>
            </div>

            {erroArquivo && (
              <p role="alert" className="text-sm text-destructive">
                {erroArquivo} Escolha um arquivo menor ou reduza a imagem antes de enviar.
              </p>
            )}
            {estado.erro && !erroArquivo && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
            {estado.ok && !erroArquivo && (
              <p role="status" className="text-sm text-muted-foreground">
                Personalização salva! Suas revendedoras já veem a nova identidade.
              </p>
            )}

            <Separator />
            <Button type="submit" disabled={pendente || erroArquivo !== null}>
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
                  <img src={logoPrevia} alt="" className="h-full w-full object-cover" />
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
