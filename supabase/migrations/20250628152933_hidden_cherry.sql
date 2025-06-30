/*
  # Create Admin User

  1. New Records
    - Insert admin user record for preachitenterprise_mq@yahoo.com
  
  2. Notes
    - Uses simple INSERT with conflict handling
    - Creates placeholder UUID that can be updated when auth user is created
    - Safe for environments without active Supabase connection
*/

-- Insert admin user with conflict handling
INSERT INTO admins (email, full_name, created_at, updated_at) 
VALUES (
  'preachitenterprise_mq@yahoo.com', 
  'Preach IT Enterprise Admin',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = now();