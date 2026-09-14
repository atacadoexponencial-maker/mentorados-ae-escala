import { describe, it, expect } from 'vitest'
import {
  caminhoLimpo,
  decidirNoDominio,
  deveIrParaODominio,
  slugDoCaminho,
} from '@/lib/dominio/rotas'
import { enderecoDoEspaco, origemNoDominio } from '@/lib/dominio/regras'

const base = { busca: '', slug: 'veraneio', logado: true }

describe('decidirNoDominio', () => {
  it('raiz do domínio abre o catálogo do espaço', () => {
    expect(decidirNoDominio({ ...base, pathname: '/' })).toEqual({
      tipo: 'reescrever',
      caminho: '/veraneio',
    })
  })

  it('aula e login ganham o prefixo interno', () => {
    expect(decidirNoDominio({ ...base, pathname: '/aula/1' })).toEqual({
      tipo: 'reescrever',
      caminho: '/veraneio/aula/1',
    })
    expect(decidirNoDominio({ ...base, logado: false, pathname: '/login' })).toEqual({
      tipo: 'reescrever',
      caminho: '/veraneio/login',
    })
  })

  it('sem sessão, tela protegida vai para o login do domínio', () => {
    expect(decidirNoDominio({ ...base, logado: false, pathname: '/aula/1' })).toEqual({
      tipo: 'redirecionar',
      destino: '/login',
    })
    expect(decidirNoDominio({ ...base, logado: false, pathname: '/primeiro-acesso' }).tipo).toBe(
      'reescrever'
    )
  })

  it('endereço com o espaço repetido vira o limpo, mantendo a busca', () => {
    expect(decidirNoDominio({ ...base, pathname: '/veraneio/aula/1', busca: '?x=1' })).toEqual({
      tipo: 'redirecionar',
      destino: '/aula/1?x=1',
    })
  })

  it('telas da equipe não abrem no domínio', () => {
    expect(decidirNoDominio({ ...base, pathname: '/admin/mentorados' })).toEqual({
      tipo: 'redirecionar',
      destino: '/',
    })
    expect(decidirNoDominio({ ...base, pathname: '/mentor' }).tipo).toBe('redirecionar')
  })

  it('outro espaço cai dentro do espaço do domínio (não encontrado)', () => {
    expect(decidirNoDominio({ ...base, pathname: '/outro-espaco' })).toEqual({
      tipo: 'reescrever',
      caminho: '/veraneio/outro-espaco',
    })
  })

  it('links de e-mail seguem para a rota de confirmação', () => {
    expect(decidirNoDominio({ ...base, logado: false, pathname: '/auth/confirm' }).tipo).toBe(
      'seguir'
    )
  })

  it('domínio desconhecido ou inativo mostra espaço indisponível', () => {
    expect(decidirNoDominio({ ...base, slug: null, pathname: '/login' })).toEqual({
      tipo: 'reescrever',
      caminho: '/espaco-indisponivel',
    })
  })
})

describe('caminho antigo → domínio', () => {
  it('reconhece slug e ignora rotas da plataforma', () => {
    expect(slugDoCaminho('/veraneio/aula/1')).toBe('veraneio')
    expect(slugDoCaminho('/admin/mentorados')).toBeNull()
    expect(slugDoCaminho('/auth/confirm')).toBeNull()
    expect(slugDoCaminho('/')).toBeNull()
  })

  it('tira o slug do começo do caminho', () => {
    expect(caminhoLimpo('veraneio', '/veraneio')).toBe('/')
    expect(caminhoLimpo('veraneio', '/veraneio/login')).toBe('/login')
    expect(caminhoLimpo('veraneio', '/veraneio-2/login')).toBe('/veraneio-2/login')
  })

  it('só revendedoras e visitantes são levados ao domínio', () => {
    const e = { dominioAtivo: true, dominio: 'www.x.com', mentoradoUserId: 'dona' }
    expect(deveIrParaODominio({ ...e, userId: null, ehAdmin: false })).toBe(true)
    expect(deveIrParaODominio({ ...e, userId: 'rev', ehAdmin: false })).toBe(true)
    expect(deveIrParaODominio({ ...e, userId: 'dona', ehAdmin: false })).toBe(false)
    expect(deveIrParaODominio({ ...e, userId: 'adm', ehAdmin: true })).toBe(false)
    expect(deveIrParaODominio({ ...e, dominioAtivo: false, userId: null, ehAdmin: false })).toBe(
      false
    )
  })
})

describe('endereço dos links de um espaço', () => {
  it('usa o domínio ativo, herdando protocolo e porta', () => {
    expect(origemNoDominio('www.x.com', 'https://areademembros.atacadoexponencial.com/a')).toBe(
      'https://www.x.com'
    )
    expect(origemNoDominio('x.localhost', 'http://localhost:3000')).toBe('http://x.localhost:3000')
    expect(
      enderecoDoEspaco(
        { slug: 'veraneio', dominio: 'www.x.com', dominio_ativo: true },
        'https://areademembros.atacadoexponencial.com'
      )
    ).toEqual({ origem: 'https://www.x.com', prefixo: '' })
  })

  it('sem domínio ativo continua na plataforma com o slug', () => {
    const origem = 'https://areademembros.atacadoexponencial.com'
    expect(enderecoDoEspaco({ slug: 'up', dominio: null, dominio_ativo: false }, origem)).toEqual({
      origem,
      prefixo: '/up',
    })
    expect(
      enderecoDoEspaco({ slug: 'up', dominio: 'www.up.com', dominio_ativo: false }, origem)
    ).toEqual({ origem, prefixo: '/up' })
  })
})
