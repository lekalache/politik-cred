-- Function to automatically create user profile when new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to ensure user exists before vote submission
CREATE OR REPLACE FUNCTION public.ensure_user_exists(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    RETURN user_id;
  END IF;

  -- Get user info from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO user_email, user_name
  FROM auth.users
  WHERE id = user_id;

  -- If user exists in auth but not in public.users, create the profile
  IF user_email IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, user_email, user_name, 'user')
    ON CONFLICT (id) DO NOTHING;

    RETURN user_id;
  END IF;

  -- If user doesn't exist at all, raise an error
  RAISE EXCEPTION 'User with ID % does not exist', user_id;
END;
$$;