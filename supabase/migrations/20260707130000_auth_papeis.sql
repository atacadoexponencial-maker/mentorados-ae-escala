-- Papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'mentorado', 'revendedor');

-- Perfis (1:1 com auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "profiles_select_proprio"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_proprio"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Cria o perfil automaticamente no signup/convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Papéis por usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE POLICY "user_roles_select_proprio"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- has_role: checagem de papel sem recursão de RLS (padrão essenciademenina)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Revendedores: cada um pertence a exatamente um espaço
CREATE TABLE public.revendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT NOT NULL,
  whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'convite-pendente'
    CHECK (status IN ('ativo', 'inativo', 'convite-pendente')),
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (espaco_id, email)
);
CREATE INDEX revendedores_espaco_idx ON public.revendedores (espaco_id);
ALTER TABLE public.revendedores ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.revendedores TO authenticated;
GRANT ALL ON public.revendedores TO service_role;

-- Revendedor lê a própria linha
CREATE POLICY "revendedores_select_proprio"
  ON public.revendedores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Mentorado lê os revendedores do espaço que possui
CREATE POLICY "revendedores_select_mentorado"
  ON public.revendedores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.espacos e
      WHERE e.id = revendedores.espaco_id
        AND e.mentorado_user_id = auth.uid()
    )
  );

-- Admin lê tudo
CREATE POLICY "revendedores_select_admin"
  ON public.revendedores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
