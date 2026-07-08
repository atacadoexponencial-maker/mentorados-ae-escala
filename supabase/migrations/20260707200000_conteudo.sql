-- Conteúdo central: módulos e aulas únicos, distribuídos para todos os espaços.
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.modulos TO authenticated;
GRANT ALL ON public.modulos TO service_role;

CREATE POLICY "modulos_select_autenticados"
  ON public.modulos FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  panda_video_id TEXT,
  capa_url TEXT,
  duracao_segundos INT,
  ordem INT NOT NULL DEFAULT 0,
  publicada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX aulas_modulo_idx ON public.aulas (modulo_id);
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.aulas TO authenticated;
GRANT ALL ON public.aulas TO service_role;

-- Rascunho só aparece para admin; publicada para qualquer autenticado
CREATE POLICY "aulas_select_publicadas_ou_admin"
  ON public.aulas FOR SELECT TO authenticated
  USING (publicada = true OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.aula_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX aula_materiais_aula_idx ON public.aula_materiais (aula_id);
ALTER TABLE public.aula_materiais ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.aula_materiais TO authenticated;
GRANT ALL ON public.aula_materiais TO service_role;

-- Materiais seguem a visibilidade da aula
CREATE POLICY "aula_materiais_select"
  ON public.aula_materiais FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas a
      WHERE a.id = aula_materiais.aula_id
        AND (a.publicada = true OR public.has_role(auth.uid(), 'admin'))
    )
  );
