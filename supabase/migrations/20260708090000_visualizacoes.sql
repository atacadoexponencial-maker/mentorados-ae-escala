-- Registro acumulado de visualização por usuário+aula.
-- Referências com ON DELETE SET NULL + título denormalizado preservam o
-- histórico quando aula/revendedora são excluídas (issues 42 e 92).
CREATE TABLE public.aula_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revendedor_id UUID REFERENCES public.revendedores(id) ON DELETE SET NULL,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  aula_id UUID REFERENCES public.aulas(id) ON DELETE SET NULL,
  aula_titulo TEXT NOT NULL,
  segundos_assistidos INT NOT NULL DEFAULT 0,
  ultima_posicao INT NOT NULL DEFAULT 0,
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, aula_id)
);
CREATE INDEX aula_visualizacoes_espaco_idx ON public.aula_visualizacoes (espaco_id);
CREATE INDEX aula_visualizacoes_aula_idx ON public.aula_visualizacoes (aula_id);

ALTER TABLE public.aula_visualizacoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.aula_visualizacoes TO authenticated;
GRANT ALL ON public.aula_visualizacoes TO service_role;

-- Revendedora lê o próprio progresso
CREATE POLICY "visualizacoes_select_proprio"
  ON public.aula_visualizacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Mentorado lê o progresso do espaço que possui
CREATE POLICY "visualizacoes_select_mentorado"
  ON public.aula_visualizacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.espacos e
      WHERE e.id = aula_visualizacoes.espaco_id
        AND e.mentorado_user_id = auth.uid()
    )
  );

-- Admin lê tudo
CREATE POLICY "visualizacoes_select_admin"
  ON public.aula_visualizacoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
