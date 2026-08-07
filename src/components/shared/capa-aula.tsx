// src/components/shared/capa-aula.tsx
// Sem capa enviada, a aula ganha um bloco com o degradê da marca do espaço -
// assim nenhuma aula precisa de arte produzida à mão em cada área de membros.
import { anguloDoDegrade, corDoTextoSobre } from '@/lib/capas'

const COR_PRIMARIA_PADRAO = '#171717'
const COR_DESTAQUE_PADRAO = '#525252'

type Props = {
  capaUrl: string | null
  titulo: string
  numero: number
  corPrimaria: string | null
  corDestaque: string | null
  variante: 'card' | 'faixa'
}

export function CapaAula({ capaUrl, titulo, numero, corPrimaria, corDestaque, variante }: Props) {
  if (capaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={capaUrl}
        alt={variante === 'card' ? titulo : ''}
        className="h-full w-full object-cover"
      />
    )
  }

  const primaria = corPrimaria ?? COR_PRIMARIA_PADRAO
  const destaque = corDestaque ?? COR_DESTAQUE_PADRAO
  const estilo = {
    background: `linear-gradient(${anguloDoDegrade(numero)}deg, ${primaria}, ${destaque})`,
    color: corDoTextoSobre(primaria),
  }
  const rotulo = String(numero).padStart(2, '0')

  // Na faixa (128x80 do "Continuar assistindo") o título não cabe, e ele já
  // aparece em texto normal ao lado do bloco.
  if (variante === 'faixa') {
    return (
      <div className="flex h-full w-full items-center justify-center" style={estilo}>
        <span className="text-xl font-black tabular-nums">{rotulo}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3" style={estilo}>
      <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
        Aula {rotulo}
      </span>
      <span className="line-clamp-4 text-base font-black leading-tight">{titulo}</span>
    </div>
  )
}
