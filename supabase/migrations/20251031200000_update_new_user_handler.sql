-- supabase/migrations/20251031200000_update_new_user_handler.sql

-- Remove a função e o gatilho antigos para recriá-los
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Cria a nova função
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- Define o search_path para garantir que 'public' seja encontrado
SET search_path = public
AS $$
BEGIN
  -- 1. Cria o perfil básico
  INSERT INTO public.profiles (id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));

  -- 2. Define o cargo do novo usuário como 'paciente'
  -- (Esta é a correção para o erro RLS, pois SECURITY DEFINER tem permissão)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'paciente');

  -- 3. Cria a entrada correspondente na tabela 'pacientes'
  INSERT INTO public.pacientes (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Recria o gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();