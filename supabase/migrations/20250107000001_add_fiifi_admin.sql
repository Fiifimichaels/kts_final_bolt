/*
  # Add Fiifi Admin User

  1. Changes
    - Add fiifi.michaels60@outlook.com to admins table
    - Allow proper auth linking for this admin
  
  2. Security
    - Maintains existing admin record structure
*/

-- Add the new admin record
INSERT INTO admins (email, full_name, created_at, updated_at) 
VALUES (
  'fiifi.michaels60@outlook.com', 
  'Fiifi Michaels Admin',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Set id to NULL to allow auth user linking during first login
UPDATE admins 
SET id = NULL 
WHERE email = 'fiifi.michaels60@outlook.com';