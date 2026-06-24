-- Drop the password column — Supabase Auth manages credentials in auth.users.
ALTER TABLE public.user DROP COLUMN password;

-- Remove the random UUID default and add FK to auth.users.
-- ON DELETE CASCADE ensures account deletion cleans up the profile row.
ALTER TABLE public.user
  ALTER COLUMN id DROP DEFAULT,
  ADD CONSTRAINT user_auth_id_fk
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Auto-create a public.user profile row when a new auth user registers.
-- Reads first_name from signup metadata (options.data.first_name in the JS client).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user (id, first_name, email, created_date, modified_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NEW.email,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Keep modified_date current on any profile edit.
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.modified_date := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON public.user
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_updated();
