'use client'

import { useState, useTransition } from 'react'
import { FileText, Loader2Icon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Contrato de dados de um material dentro do diálogo "Materiais da aula".
 *
 * A união é discriminada por `origem` e o ramo `'arquivo'` **não tem** campo `url`:
 * é o próprio tipo que garante que nenhum caminho de bucket ou endereço assinado
 * chegue ao navegador. O ramo `'link'` continua carregando a URL pública, porque
 * link externo é âncora direta e nunca passa pelo servidor.
 */
export type MaterialDialogItem =
  | { id: string; nome: string; origem: 'arquivo' }
  | { id: string; nome: string; origem: 'link'; url: string }

/** Ponto único de resolução do endereço de um material de arquivo. */
export type ResolverLinkDoMaterial = (id: string) => Promise<{ url: string } | null>

/**
 * Marcador do protótipo: devolve sempre `null` (= indisponível).
 *
 * TODO(issue 12): só o **corpo** desta função muda ao ligar o emissor de link
 * temporário da issue 05. A união `MaterialDialogItem`, a máquina de estados de
 * `ItemMaterialDialog`, a marcação e o CSS ficam intactos. `null` continua
 * significando "indisponível por qualquer motivo" — a tela nunca distingue a causa.
 */
const resolverLinkDoMaterial: ResolverLinkDoMaterial = async (id) => {
  void id
  return null
}

export function ItemMaterialDialog({
  material,
  removendo,
  onRemover,
  /**
   * Ponto de injeção usado **apenas pelo teste de componente**, para exercitar os
   * três estados de forma determinística. A aplicação nunca passa esta prop.
   */
  resolver = resolverLinkDoMaterial,
}: {
  material: MaterialDialogItem
  removendo: boolean
  onRemover: () => void
  resolver?: ResolverLinkDoMaterial
}) {
  // useTransition próprio de cada item: o estado é por material, não do diálogo.
  // `removendo` (do diálogo) e `pendente` (do item) são independentes.
  const [pendente, iniciar] = useTransition()
  const [indisponivel, setIndisponivel] = useState(false)

  const aoClicar = () => {
    if (pendente) return
    setIndisponivel(false)
    iniciar(async () => {
      try {
        const resultado = await resolver(material.id)
        if (!resultado) {
          setIndisponivel(true)
          return
        }
        // Abertura na aba atual de propósito: depois do `await`, `window.open` é
        // barrado por bloqueador de pop-up. Como o endereço assinado responde com
        // `Content-Disposition` de download, a tela do diálogo não é substituída.
        window.location.assign(resultado.url)
      } catch {
        // Exceção inesperada cai na mesma mensagem: sem detalhe técnico, sem
        // distinguir a causa.
        setIndisponivel(true)
      }
    })
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {material.origem === 'link' ? (
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            {material.nome}
          </a>
        ) : (
          <Button
            variant="link"
            disabled={pendente}
            onClick={aoClicar}
            className="h-auto min-w-0 justify-start px-0 py-0 text-sm break-words whitespace-normal text-foreground"
          >
            {pendente ? (
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            {pendente ? 'Abrindo…' : material.nome}
          </Button>
        )}
        {/* `!pendente` evita o piscar de "Abrindo…" junto com a mensagem: a marcação
            da falha só aparece depois que o item sai do carregando. */}
        {indisponivel && !pendente && (
          <p role="alert" className="text-sm text-destructive">
            Material indisponível.
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remover ${material.nome}`}
        disabled={removendo}
        onClick={onRemover}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}
