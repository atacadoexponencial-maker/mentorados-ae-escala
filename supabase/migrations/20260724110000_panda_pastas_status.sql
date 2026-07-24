-- Organização no Panda: pasta por espaço e por módulo (árvore App/Mentorado/Módulo).
ALTER TABLE public.espacos ADD COLUMN panda_folder_id TEXT;
ALTER TABLE public.modulos ADD COLUMN panda_folder_id TEXT;
-- Status do vídeo da aula: 'processando' | 'pronto'; NULL = sem vídeo / legado.
ALTER TABLE public.aulas ADD COLUMN video_status TEXT;
