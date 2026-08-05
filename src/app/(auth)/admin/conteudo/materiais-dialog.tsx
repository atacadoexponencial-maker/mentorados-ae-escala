'use client'

import { useActionState, useState, useTransition } from 'react'
import { Link2 } from 'lucide-react'
import {
  adicionarMaterialArquivo,
  adicionarMaterialLink,
  removerMaterial,
  type EstadoConteudo,
} from './actions'
import type { AulaLinha } from './dados'
import { ItemMaterialDialog } from './item-material-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LIMITES, erroDeTamanho } from '@/lib/upload'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function MateriaisDialog({
  aula,
  onClose,
}: {
  aula: AulaLinha | null
  onClose: () => void
}) {
  const [estadoArquivo, acaoArquivo, pendenteArquivo] = useActionState(
    adicionarMaterialArquivo,
    estadoInicial
  )
  const [estadoLink, acaoLink, pendenteLink] = useActionState(adicionarMaterialLink, estadoInicial)
  const [removendo, iniciarRemocao] = useTransition()
  // Aviso do próprio navegador: acima do limite, o corpo do Server Action
  // estoura e o erro que voltaria seria genérico.
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)

  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return setErroArquivo(null)
    const erro = erroDeTamanho(arquivo, LIMITES.material, 'O arquivo')
    if (erro) e.target.value = ''
    setErroArquivo(erro)
  }

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {aula && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Materiais da aula</DialogTitle>
              <DialogDescription>&quot;{aula.titulo}&quot;</DialogDescription>
            </DialogHeader>

            {aula.materiais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material anexado.</p>
            ) : (
              <ul className="space-y-2">
                {aula.materiais.map((material) => (
                  <ItemMaterialDialog
                    key={material.id}
                    // TODO(issue 10/12): a origem vem fixa em 'link' porque a coluna
                    // ainda não existe e a pasta de materiais do bucket está vazia —
                    // toda linha de hoje é link externo. A issue 10 traz `origem` em
                    // `MaterialLinha` e a constante some. Nunca inspecionar o texto
                    // de `url` para adivinhar a origem.
                    material={{ id: material.id, nome: material.nome, origem: 'link', url: material.url }}
                    removendo={removendo}
                    onRemover={() => iniciarRemocao(() => removerMaterial(material.id))}
                  />
                ))}
              </ul>
            )}

            <Separator />

            <form action={acaoArquivo} className="space-y-2">
              <input type="hidden" name="aulaId" value={aula.id} />
              <Label htmlFor="material-arquivo">Anexar arquivo (até 20 MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="material-arquivo"
                  name="arquivo"
                  type="file"
                  onChange={aoEscolherArquivo}
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={pendenteArquivo || erroArquivo !== null}
                >
                  {pendenteArquivo ? 'Enviando…' : 'Anexar'}
                </Button>
              </div>
              {(erroArquivo || estadoArquivo.erro) && (
                <p role="alert" className="text-sm text-destructive">
                  {erroArquivo ?? estadoArquivo.erro}
                </p>
              )}
            </form>

            <form action={acaoLink} className="space-y-2">
              <input type="hidden" name="aulaId" value={aula.id} />
              <Label>Ou anexar link</Label>
              <div className="flex items-center gap-2">
                <Input name="nome" placeholder="Nome" required className="max-w-36" />
                <Input name="url" type="url" placeholder="https://…" required />
                <Button type="submit" variant="outline" disabled={pendenteLink}>
                  <Link2 className="mr-1 h-4 w-4" />
                  {pendenteLink ? '…' : 'Anexar'}
                </Button>
              </div>
              {estadoLink.erro && (
                <p role="alert" className="text-sm text-destructive">
                  {estadoLink.erro}
                </p>
              )}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
