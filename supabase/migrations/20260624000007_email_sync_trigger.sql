-- Sync public.user.email when a user's email is changed and confirmed in auth.users.
-- Fires only after re-verification is complete to avoid reflecting an unconfirmed address.
CREATE OR REPLACE FUNCTION public.handle_auth_email_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_email_change();
