/*
  # Admin Authentication System

  1. New Tables
    - Update admins table to work with Supabase Auth
    - Add proper RLS policies for admin authentication

  2. Security
    - Enable RLS on admins table
    - Add policies for admin access
    - Create function to check admin status

  3. Functions
    - Create function to handle admin user creation
    - Update is_admin function to work with auth
*/

-- Create or update the is_admin function to work with Supabase Auth
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is authenticated and exists in admins table
  RETURN EXISTS (
    SELECT 1 
    FROM admins 
    WHERE id = auth.uid()
  );
END;
$$;

-- Update admins table to use auth.users id
DO $$
BEGIN
  -- Add foreign key constraint to auth.users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admins_id_fkey' AND table_name = 'admins'
  ) THEN
    ALTER TABLE admins 
    ADD CONSTRAINT admins_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for admins table
DROP POLICY IF EXISTS "Admins can view their own record" ON admins;
DROP POLICY IF EXISTS "System can create admin records" ON admins;

-- Create new policies
CREATE POLICY "Admins can view their own record"
  ON admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert admin records"
  ON admins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to create admin user (call this after creating user in auth)
CREATE OR REPLACE FUNCTION create_admin_profile(
  user_id uuid,
  admin_email text,
  admin_full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admins (id, email, full_name)
  VALUES (user_id, admin_email, admin_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
END;
$$;

-- Create a trigger to automatically create admin profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create admin profile if email is in a predefined list or has admin domain
  -- For now, we'll create for any authenticated user and let the app handle admin verification
  INSERT INTO public.admins (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup (optional - you may want to handle this manually)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_admin_user();