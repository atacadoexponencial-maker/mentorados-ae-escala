import { describe, it, expect } from 'vitest'
import {
  ERRO_DOMINIO_DA_PLATAFORMA,
  ERRO_DOMINIO_INVALIDO,
  ehHostDaPlataforma,
  erroDoDominio,
  normalizarDominio,
} from '@/lib/dominio/regras'

describe('normalizarDominio', () => {
  it('tira protocolo, barra final, espaços e maiúsculas', () => {
    expect(normalizarDominio('  https://WWW.VeraneioAcademy.com/ ')).toBe('www.veraneioacademy.com')
    expect(normalizarDominio('http://marca.com.br//')).toBe('marca.com.br')
  })
})

describe('erroDoDominio', () => {
  it('aceita domínios comuns', () => {
    expect(erroDoDominio('www.veraneioacademy.com')).toBeNull()
    expect(erroDoDominio('marca.com.br')).toBeNull()
    expect(erroDoDominio('veraneio.localhost')).toBeNull()
  })

  it('recusa texto que não é domínio', () => {
    for (const texto of ['veraneio', 'www.marca.com/veraneio', 'marca .com', 'marca_x.com', '', '-a.com']) {
      expect(erroDoDominio(texto)).toBe(ERRO_DOMINIO_INVALIDO)
    }
  })

  it('recusa o endereço da plataforma e seus subdomínios', () => {
    expect(erroDoDominio('areademembros.atacadoexponencial.com')).toBe(ERRO_DOMINIO_DA_PLATAFORMA)
    expect(erroDoDominio('x.areademembros.atacadoexponencial.com')).toBe(ERRO_DOMINIO_DA_PLATAFORMA)
    expect(erroDoDominio('projeto.vercel.app')).toBe(ERRO_DOMINIO_DA_PLATAFORMA)
  })
})

describe('ehHostDaPlataforma', () => {
  it('reconhece produção, previews e máquina local, com ou sem porta', () => {
    expect(ehHostDaPlataforma('areademembros.atacadoexponencial.com')).toBe(true)
    expect(ehHostDaPlataforma('mentorados-git-x.vercel.app')).toBe(true)
    expect(ehHostDaPlataforma('localhost:3000')).toBe(true)
  })

  it('não confunde domínio de mentorado com a plataforma', () => {
    expect(ehHostDaPlataforma('www.veraneioacademy.com')).toBe(false)
    expect(ehHostDaPlataforma('veraneio.localhost:3000')).toBe(false)
  })
})
