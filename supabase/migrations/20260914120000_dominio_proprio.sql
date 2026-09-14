-- Domínio próprio por espaço (ex.: www.veraneioacademy.com).
-- Cadastrar não muda nada para ninguém; só dominio_ativo = true põe o domínio em uso.
-- Leitura segue pública pela política existente: o proxy precisa descobrir o espaço
-- pelo host antes do login, e um domínio não é segredo. Escrita só via service_role.
ALTER TABLE public.espacos
  ADD COLUMN dominio TEXT,
  ADD COLUMN dominio_ativo BOOLEAN NOT NULL DEFAULT false;

-- Um domínio pertence a no máximo um espaço (NULLs não conflitam).
CREATE UNIQUE INDEX espacos_dominio_unico ON public.espacos (dominio);

ALTER TABLE public.espacos
  ADD CONSTRAINT espacos_dominio_minusculo CHECK (dominio IS NULL OR dominio = lower(dominio)),
  ADD CONSTRAINT espacos_dominio_ativo_exige_dominio CHECK (NOT dominio_ativo OR dominio IS NOT NULL);
