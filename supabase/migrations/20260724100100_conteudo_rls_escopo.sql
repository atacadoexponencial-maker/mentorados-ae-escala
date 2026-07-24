-- modulos: base OU dono-mentorado OU revendedora-do-espaço OU admin
DROP POLICY "modulos_select_autenticados" ON public.modulos;
CREATE POLICY "modulos_select_escopo"
  ON public.modulos FOR SELECT TO authenticated
  USING (
    espaco_id IS NULL
    OR public.has_role(auth.uid(), 'admin')
    OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
  );

-- aulas: visibilidade de espaço E visibilidade de rascunho
DROP POLICY "aulas_select_publicadas_ou_admin" ON public.aulas;
CREATE POLICY "aulas_select_escopo"
  ON public.aulas FOR SELECT TO authenticated
  USING (
    (
      espaco_id IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
      OR espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
    )
    AND (
      publicada = true
      OR public.has_role(auth.uid(), 'admin')
      OR espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
    )
  );

-- materiais: seguem a mesma visibilidade da aula (espaço + rascunho)
DROP POLICY "aula_materiais_select" ON public.aula_materiais;
CREATE POLICY "aula_materiais_select"
  ON public.aula_materiais FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas a
      WHERE a.id = aula_materiais.aula_id
        AND (
          a.espaco_id IS NULL
          OR public.has_role(auth.uid(), 'admin')
          OR a.espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
          OR a.espaco_id IN (SELECT espaco_id FROM public.revendedores WHERE user_id = auth.uid())
        )
        AND (
          a.publicada = true
          OR public.has_role(auth.uid(), 'admin')
          OR a.espaco_id IN (SELECT id FROM public.espacos WHERE mentorado_user_id = auth.uid())
        )
    )
  );
