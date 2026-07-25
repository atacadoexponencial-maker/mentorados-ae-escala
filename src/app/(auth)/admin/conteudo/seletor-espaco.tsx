'use client'

import { useRouter } from 'next/navigation'

// Admin escolhe qual marca gerenciar: base compartilhada ou um mentorado.
export function SeletorEspaco({
  espacos,
  atual,
}: {
  espacos: { id: string; nome_curso: string }[]
  atual: string | null
}) {
  const router = useRouter()

  return (
    <select
      aria-label="Marca a gerenciar"
      value={atual ?? ''}
      onChange={(e) => {
        const id = e.target.value
        router.push(id ? `/admin/conteudo?espaco=${id}` : '/admin/conteudo')
      }}
      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
    >
      <option value="">Base (compartilhada)</option>
      {espacos.map((espaco) => (
        <option key={espaco.id} value={espaco.id}>
          {espaco.nome_curso}
        </option>
      ))}
    </select>
  )
}
