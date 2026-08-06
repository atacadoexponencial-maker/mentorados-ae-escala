-- Bucket privado para materiais complementares (PDFs, imagens, arquivos avulsos).
--
-- Por que um bucket separado, e não uma pasta dentro de `conteudo`:
-- `conteudo` é público, e bucket público serve QUALQUER caminho dele pelo
-- endpoint `/storage/v1/object/public/<bucket>/<caminho>`, sem consultar RLS e
-- sem distinguir pasta. Uma subpasta `materiais/` lá dentro seria pública do
-- mesmo jeito. O que fecha o acesso é a flag `public = false` do bucket.
--
-- Por que NENHUMA policy em `storage.objects`:
-- o app só toca o Storage pelo client de serviço (`SUPABASE_SERVICE_ROLE_KEY`),
-- que ignora RLS — upload, listagem e remoção funcionam com zero policies. E o
-- download pelo usuário sai por link assinado
-- (`/storage/v1/object/sign/materiais/...?token=...`), que valida a assinatura
-- do token, não RLS. Uma policy de SELECT para `authenticated` não só seria
-- desnecessária como reabriria a API de LISTAGEM que a migration
-- 20260805120000 acabou de fechar no bucket `conteudo`.
--
-- Por que `file_size_limit` = 20971520 (20 MiB):
-- espelha `LIMITES.material` em `src/lib/upload.ts` — defesa em profundidade
-- para quem chamar o Storage com a service key fora da action. O Storage recusa
-- só o que EXCEDE o limite, então um arquivo de exatamente 20 MiB passa nos dois
-- lugares. ATENÇÃO: mudar o limite de material exige mudar TRÊS lugares —
-- `LIMITES.material` (src/lib/upload.ts), `serverActions.bodySizeLimit`
-- (next.config.ts) e este `file_size_limit`.
--
-- Por que `allowed_mime_types` fica NULL:
-- material aceita qualquer arquivo por decisão de produto. O `Content-Type` do
-- upload nunca vem do navegador: é `contentTypeDeMaterial()` que decide no
-- servidor, servindo como `application/octet-stream` o que não for PDF ou
-- imagem conhecida — e o navegador baixa em vez de renderizar. Uma whitelist
-- aqui seria uma segunda cópia dessa regra, condenada a divergir.
--
-- Por que `DO UPDATE` e não `DO NOTHING`:
-- bucket criado à mão pelo painel nasce PÚBLICO. Uma migration cujo efeito é
-- "garantir bucket privado" não pode terminar com sucesso deixando um bucket
-- público de pé. O `DO UPDATE` força o estado desejado e continua idempotente.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materiais', 'materiais', false, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
