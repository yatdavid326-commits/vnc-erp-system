-- This policy allows anyone (anon or authenticated) to read username and email for login
CREATE POLICY "Public can read username for login" ON public.user_profiles
  FOR SELECT
  USING (true);
