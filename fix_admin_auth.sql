-- Step 1: Check your current admin record
SELECT * FROM admins WHERE email = 'fiifi.michaels60@outlook.com';

-- Step 2: Make id column nullable temporarily (if needed)
ALTER TABLE admins ALTER COLUMN id DROP NOT NULL;

-- Step 3: Ensure your admin record exists
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

-- Step 4: Update admin record to allow auth linking (reset the id)
UPDATE admins
SET id = NULL
WHERE email = 'fiifi.michaels60@outlook.com';

-- Step 5: Verify the admin record exists and is ready for auth linking
SELECT * FROM admins WHERE email = 'fiifi.michaels60@outlook.com';