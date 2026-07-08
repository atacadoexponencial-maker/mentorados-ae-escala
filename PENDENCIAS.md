# Pendências do Projeto

Itens que dependem de ação manual ou de decisão antes do lançamento. Marque com `[x]` quando resolver.

## Painel do Supabase (fazer quando puder — 5 min)

- [ ] **Template de e-mail "Invite user"** (Authentication → Email Templates): trocar o link do corpo para:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`
  Sem isso, o link dos e-mails de convite reais não funciona no app.
- [ ] **Template "Reset password"**: trocar o link para:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}`

## Antes do lançamento (produção)

- [ ] **SMTP próprio no Supabase** (Authentication → SMTP Settings): o e-mail embutido só envia ~3 mensagens/hora — insuficiente para convidar revendedoras em volume. Sugestão: Resend (tem plano grátis).
- [ ] **URLs de produção no Supabase** (Authentication → URL Configuration): definir o Site URL do domínio final e adicionar `https://SEU-DOMINIO/**` nos Redirect URLs (hoje só localhost funciona).
- [ ] **Limpar dados de teste do banco**: usuários `*.teste@*`, `convite.teste.*@example.com`, espaços `ph-importados` e `carla-modas` (posso fazer com um comando quando você pedir).
- [ ] **Deploy na Vercel** com as variáveis de ambiente do `.env` (exceto `SUPABASE_DB_URL`, que é só para migrations).

## Fase 2 (fora do escopo da v1, anotado na spec)

- [ ] Domínio próprio por mentorado (ex.: `treinamentos.joaoatacados.com.br`)
- [ ] Ranking gamificado e comentários (existem na essenciademenina; ficaram de fora por decisão de escopo)
