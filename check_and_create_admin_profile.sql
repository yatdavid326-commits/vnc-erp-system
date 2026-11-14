-- Verificar si existe el perfil del usuario admin
SELECT COUNT(*) as profile_exists FROM public.user_profiles WHERE email = 'admin@vncsystems.com';

-- Si no existe, crearlo
INSERT INTO public.user_profiles (id, email, username, first_name, last_name, role, department, status, created_at, updated_at)
SELECT
  u.id,
  'admin@vncsystems.com',
  'admin',
  'Administrador',
  'Sistema',
  'admin',
  'Administration',
  'active',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'admin@vncsystems.com'
AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'admin@vncsystems.com')
ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó
SELECT * FROM public.user_profiles WHERE email = 'admin@vncsystems.com';
