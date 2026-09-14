# Ativar domínio próprio de um espaço

Checklist da equipe para colocar um espaço de mentorado num domínio próprio
(ex.: `www.veraneioacademy.com`). Nada disso é automático.

## 1. DNS (feito pelo mentorado, no provedor do domínio)

Adicione o domínio na Vercel (passo 2) primeiro: ela mostra os valores **específicos do projeto**.

- `A` em `@` → IP indicado pela Vercel
- `CNAME` em `www` → endereço `*.vercel-dns-*.com` indicado pela Vercel

Conferir: `Resolve-DnsName www.dominio.com -Server 8.8.8.8`

## 2. Vercel

Projeto → Settings → Domains → Add → `dominio.com`, conectado a **Production**, com
**Redirect apex domains to www** marcado. O endereço canônico é o `www`.

## 3. Supabase (autenticação)

Authentication → URL Configuration → **Redirect URLs** → adicionar `https://www.dominio.com/**`.
Sem isso, convites e recuperações de senha com o domínio voltam para o endereço da plataforma.

## 4. Conferir

Abrir `https://www.dominio.com` no navegador: precisa abrir com cadeado. Enquanto o domínio
não estiver ativo na plataforma, a tela mostrada é "Espaço indisponível" — é o esperado.

## 5. Plataforma

Admin → Mentorados → abrir o mentorado → card **Domínio próprio** → Cadastrar domínio
(`www.dominio.com`) → **Ativar domínio**.

A partir daí:
- `https://www.dominio.com` abre o espaço com endereço limpo;
- o endereço antigo (`/{endereço-do-espaço}`) redireciona as revendedoras para o domínio;
- convites, links copiáveis e recuperação de senha saem com o domínio.

## Voltar atrás

Card **Domínio próprio** → **Desativar domínio**. O espaço volta imediatamente para o endereço da
plataforma, sem redirecionamento.
