'use client'

import { useState, useTransition } from 'react'
import { FileText, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { emitirLinkDeMaterial } from '@/lib/materiais/emitir-link'

/**
 * Contrato de dados dos materiais da aula.
 *
 * A união é discriminada por `origem` e o ramo `'arquivo'` **não tem** campo `url`:
 * é o próprio tipo que garante que nenhum caminho de bucket ou endereço assinado
 * chegue ao navegador. O ramo `'link'` continua carregando a URL pública, porque
 * link externo é âncora direta e nunca passa pelo servidor.
 */
export type MaterialItem =
  | { id: string; nome: string; origem: 'arquivo' }
  | { id: string; nome: string; origem: 'link'; url: string }

/** Ponto único de resolução do endereço de um material de arquivo. */
export type ResolverLinkDoMaterial = (id: string) => Promise<{ url: string } | null>

/**
 * Emissor real: a Server Action de `@/lib/materiais/emitir-link`, que confere a
 * sessão, deixa a RLS decidir o direito e assina o endereço temporário.
 *
 * A anotação `: ResolverLinkDoMaterial` é o que faz o compilador provar que a
 * action satisfaz o contrato do componente — não trocar por inferência. `null`
 * continua significando "indisponível por qualquer motivo" (sem sessão, sem
 * direito, arquivo sumido, Storage fora do ar): a tela nunca distingue a causa.
 */
const resolverLinkDoMaterial: ResolverLinkDoMaterial = emitirLinkDeMaterial

function ItemMaterialArquivo({
  material,
  resolver,
}: {
  material: Extract<MaterialItem, { origem: 'arquivo' }>
  resolver: ResolverLinkDoMaterial
}) {
  // useTransition próprio de cada item: o estado é por material, não do cartão.
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
        // `Content-Disposition` de download, a página da aula não é substituída.
        //
        // CONFIRMADO NO NAVEGADOR (issue 11, PDF real de material acentuado): a
        // resposta vem `attachment; filename*=UTF-8''Relat%C3%B3rio%20de%20Pre%C3%A7os...`,
        // o arquivo cai no gerenciador de downloads com o nome amigável do banco,
        // a URL da barra de endereço não muda, `history.length` não cresce e o
        // iframe do player continua o mesmo nó (não remontou).
        window.location.assign(resultado.url)
      } catch {
        // Exceção inesperada cai na mesma mensagem: sem detalhe técnico, sem
        // distinguir a causa.
        setIndisponivel(true)
      }
    })
  }

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2">
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
      {/* `!pendente` evita o piscar de "Abrindo…" junto com a mensagem: a marcação
          da falha só aparece depois que o item sai do carregando. */}
      {indisponivel && !pendente && (
        <p role="alert" className="text-sm text-destructive">
          Material indisponível.
        </p>
      )}
    </li>
  )
}

export function MateriaisAula({
  materiais,
  /**
   * Ponto de injeção usado **apenas pelo teste de componente**, para exercitar os
   * três estados de forma determinística. A aplicação nunca passa esta prop.
   */
  resolver = resolverLinkDoMaterial,
}: {
  materiais: MaterialItem[]
  resolver?: ResolverLinkDoMaterial
}) {
  if (materiais.length === 0) return null

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Materiais da aula</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {materiais.map((material) =>
            material.origem === 'link' ? (
              <li key={material.id}>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {material.nome}
                </a>
              </li>
            ) : (
              <ItemMaterialArquivo key={material.id} material={material} resolver={resolver} />
            )
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
