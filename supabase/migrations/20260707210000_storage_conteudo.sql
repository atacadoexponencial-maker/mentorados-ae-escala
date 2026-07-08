-- Bucket público para capas de aulas e materiais complementares.
-- Escrita acontece só no backend (service_role ignora RLS de storage.objects).
INSERT INTO storage.buckets (id, name, public)
VALUES ('conteudo', 'conteudo', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "conteudo_leitura_publica"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'conteudo');
