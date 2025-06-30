/*
  # Fix RLS policy for bus_bookings table

  1. Security Changes
    - Update INSERT policy to allow both 'public' and 'anon' roles
    - This enables anonymous users to create bookings without authentication
    
  2. Changes Made
    - Drop existing INSERT policy
    - Create new INSERT policy that includes both 'public' and 'anon' roles
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON bus_bookings;

-- Create new INSERT policy that allows both authenticated and anonymous users
CREATE POLICY "Anyone can create bookings"
  ON bus_bookings
  FOR INSERT
  TO public, anon
  WITH CHECK (true);