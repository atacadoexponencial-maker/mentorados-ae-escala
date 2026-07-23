-- Banner (imagem) do topo do catálogo, por espaço. Opcional; sem valor,
-- o catálogo cai no degradê com as cores do tenant.
ALTER TABLE public.espacos ADD COLUMN banner_url TEXT;
