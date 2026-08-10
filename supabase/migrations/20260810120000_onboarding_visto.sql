-- Marca de onboarding visto, uma por pessoa: no espaço para a mentorada (tour do
-- painel) e na revendedora (cartão de boas-vindas). Fica no banco, e não no
-- navegador, para que o onboarding não volte ao trocar de aparelho nem ao limpar
-- o cache.
--
-- Nulo = ainda não viu.

alter table public.espacos
  add column if not exists onboarding_visto_em timestamptz;

alter table public.revendedores
  add column if not exists onboarding_visto_em timestamptz;

comment on column public.espacos.onboarding_visto_em is
  'Quando a mentorada concluiu ou pulou o tour do painel. Nulo = ainda não viu.';

comment on column public.revendedores.onboarding_visto_em is
  'Quando a revendedora viu o cartão de boas-vindas. Nulo = ainda não viu.';

-- Quem já usa a plataforma nasce marcado: o onboarding é para quem chega depois.
-- Sem isto, todo mundo que já tem conta levaria um tour na cara no dia do deploy.
update public.espacos set onboarding_visto_em = now() where onboarding_visto_em is null;
update public.revendedores set onboarding_visto_em = now() where onboarding_visto_em is null;
