/*
  # Fix Admin Authentication

  1. Updates
    - Ensure admin email exists in admins table
    - Allow proper auth linking
  
  2. Security
    - Maintains existing admin record structure
*/

-- Ensure the admin record exists and can be updated
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

-- Temporarily make id nullable to allow auth user linking
ALTER TABLE admins ALTER COLUMN id DROP NOT NULL;

-- Update the id column to allow updates when auth user signs in
UPDATE admins 
SET id = NULL 
WHERE email = 'preachitenterprise_mq@yahoo.com' AND id IS NOT NULL;