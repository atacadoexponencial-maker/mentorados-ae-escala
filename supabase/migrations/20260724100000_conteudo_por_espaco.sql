-- Conteúdo por espaço: NULL = base compartilhada (admin); preenchido = do mentorado.
-- espaco_id da aula é denormalizado (= o do módulo) para o RLS ser comparação direta.
ALTER TABLE public.modulos ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
ALTER TABLE public.aulas   ADD COLUMN espaco_id UUID REFERENCES public.espacos(id) ON DELETE CASCADE;
CREATE INDEX modulos_espaco_idx ON public.modulos (espaco_id);
CREATE INDEX aulas_espaco_idx   ON public.aulas (espaco_id);
