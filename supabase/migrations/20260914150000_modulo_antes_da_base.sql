-- Módulo de marca exibido antes do conteúdo base no catálogo da revendedora.
-- Só o admin liga (a server action confere o papel); escrita segue só via service_role.
ALTER TABLE public.modulos
  ADD COLUMN antes_da_base BOOLEAN NOT NULL DEFAULT false;

-- Conteúdo base não tem "antes da base": a marcação só vale para módulo de um espaço.
ALTER TABLE public.modulos
  ADD CONSTRAINT modulos_antes_da_base_exige_espaco CHECK (NOT antes_da_base OR espaco_id IS NOT NULL);
