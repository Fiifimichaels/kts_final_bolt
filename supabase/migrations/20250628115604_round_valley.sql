/*
  # Fix Bus Bookings RLS Policy

  1. Security Updates
    - Update RLS policy for bus_bookings to properly allow anonymous inserts
    - Ensure the policy works for both authenticated and anonymous users
    - Add proper policy for anon role specifically

  2. Changes
    - Drop existing INSERT policy that may be conflicting
    - Create new INSERT policy that explicitly allows anon role
    - Ensure the policy condition is properly set
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Anyone can create bookings" ON bus_bookings;

-- Create a new INSERT policy that explicitly allows anonymous users
CREATE POLICY "Allow anonymous booking creation"
  ON bus_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the policy for admins to view all bookings exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bus_bookings' 
    AND policyname = 'Admins can view all bookings'
  ) THEN
    CREATE POLICY "Admins can view all bookings"
      ON bus_bookings
      FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure the policy for admins to update bookings exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bus_bookings' 
    AND policyname = 'Admins can update bookings'
  ) THEN
    CREATE POLICY "Admins can update bookings"
      ON bus_bookings
      FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Ensure the policy for admins to delete bookings exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bus_bookings' 
    AND policyname = 'Admins can delete bookings'
  ) THEN
    CREATE POLICY "Admins can delete bookings"
      ON bus_bookings
      FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;