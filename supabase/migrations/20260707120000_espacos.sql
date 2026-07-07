-- Espaços (tenants): um por mentorado, identidade white-label pública na tela de login.
CREATE TABLE public.espacos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome_curso TEXT NOT NULL,
  logo_url TEXT,
  cor_primaria TEXT,
  cor_destaque TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  mentorado_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;

-- Identidade visual é pública (tela de login precisa dela antes da autenticação).
-- Escrita apenas via service_role (backend) — nenhuma política de INSERT/UPDATE/DELETE.
GRANT SELECT ON public.espacos TO anon, authenticated;
GRANT ALL ON public.espacos TO service_role;

CREATE POLICY "espacos_select_publico"
  ON public.espacos FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed de teste (mesmos slugs dos protótipos)
INSERT INTO public.espacos (slug, nome_curso, logo_url, cor_primaria, cor_destaque) VALUES
  ('joao-atacados', 'Academia João Atacados', '/globe.svg', '#c2410c', '#f97316'),
  ('maria-modas', 'Escola Maria Modas', NULL, NULL, NULL);
