/*
  # Fix booking creation policies and permissions

  1. Security Updates
    - Update RLS policies for anonymous booking creation
    - Ensure proper permissions for seat status updates
    - Add better error handling for booking creation

  2. Policy Updates
    - Allow anonymous users to create bookings
    - Allow system to update seat status
    - Ensure proper foreign key relationships
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON bus_bookings;
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON bus_bookings;

-- Create comprehensive booking creation policy
CREATE POLICY "Enable booking creation for all users"
  ON bus_bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Ensure seat status can be updated by the system
DROP POLICY IF EXISTS "System can update seat status" ON seat_status;
CREATE POLICY "Enable seat status updates"
  ON seat_status
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow reading seat status for everyone
DROP POLICY IF EXISTS "Anyone can view seat status" ON seat_status;
CREATE POLICY "Enable seat status reading"
  ON seat_status
  FOR SELECT
  TO public
  USING (true);

-- Ensure pickup points and destinations are readable
DROP POLICY IF EXISTS "Anyone can view active pickup points" ON pickup_points;
CREATE POLICY "Enable pickup points reading"
  ON pickup_points
  FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Anyone can view active destinations" ON destinations;
CREATE POLICY "Enable destinations reading"
  ON destinations
  FOR SELECT
  TO public
  USING (active = true);

-- Create function to handle booking creation with proper error handling
CREATE OR REPLACE FUNCTION create_booking_with_seat_update(
  p_full_name text,
  p_class text,
  p_email text,
  p_phone text,
  p_contact_person_name text,
  p_contact_person_phone text,
  p_pickup_point_id uuid,
  p_destination_id uuid,
  p_bus_type text,
  p_seat_number integer,
  p_amount numeric,
  p_referral text,
  p_departure_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_booking_id uuid;
  booking_record record;
BEGIN
  -- Check if seat is available
  IF NOT EXISTS (
    SELECT 1 FROM seat_status 
    WHERE seat_number = p_seat_number AND is_available = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Seat is no longer available'
    );
  END IF;

  -- Create the booking
  INSERT INTO bus_bookings (
    full_name,
    class,
    email,
    phone,
    contact_person_name,
    contact_person_phone,
    pickup_point_id,
    destination_id,
    bus_type,
    seat_number,
    amount,
    referral,
    departure_date,
    status,
    payment_status
  ) VALUES (
    p_full_name,
    p_class,
    p_email,
    p_phone,
    p_contact_person_name,
    p_contact_person_phone,
    p_pickup_point_id,
    p_destination_id,
    p_bus_type,
    p_seat_number,
    p_amount,
    p_referral,
    p_departure_date,
    'pending',
    'pending'
  ) RETURNING id INTO new_booking_id;

  -- Update seat status
  UPDATE seat_status 
  SET 
    is_available = false,
    booking_id = new_booking_id,
    passenger_name = p_full_name,
    updated_at = now()
  WHERE seat_number = p_seat_number;

  -- Get the complete booking record with related data
  SELECT 
    b.*,
    row_to_json(pp.*) as pickup_point,
    row_to_json(d.*) as destination
  INTO booking_record
  FROM bus_bookings b
  LEFT JOIN pickup_points pp ON b.pickup_point_id = pp.id
  LEFT JOIN destinations d ON b.destination_id = d.id
  WHERE b.id = new_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking', row_to_json(booking_record)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_booking_with_seat_update TO public;