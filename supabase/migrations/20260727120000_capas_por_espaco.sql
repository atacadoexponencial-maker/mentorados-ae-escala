-- Capa de uma aula base variando por marca. Sem linha aqui, vale aulas.capa_url.
CREATE TABLE public.aula_capas_espaco (
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  capa_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (aula_id, espaco_id)
);

ALTER TABLE public.aula_capas_espaco ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.aula_capas_espaco TO authenticated;

-- Leitura: admin, mentorado dono do espaço, ou revendedora daquele espaço.
CREATE POLICY "aula_capas_espaco_select"
  ON public.aula_capas_espaco FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
  );

CREATE INDEX aula_capas_espaco_espaco_idx ON public.aula_capas_espaco (espaco_id);
