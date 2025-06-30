/*
  # Bus Booking System Schema

  1. New Tables
    - `pickup_points`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `destinations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `price` (numeric)
      - `active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `bus_bookings`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `class` (text)
      - `email` (text)
      - `phone` (text)
      - `contact_person_name` (text)
      - `contact_person_phone` (text)
      - `pickup_point_id` (uuid, foreign key)
      - `destination_id` (uuid, foreign key)
      - `bus_type` (text, default 'Economical')
      - `seat_number` (integer)
      - `amount` (numeric)
      - `referral` (text)
      - `departure_date` (date)
      - `booking_date` (timestamp, default now)
      - `status` (text, default 'pending')
      - `payment_status` (text, default 'pending')
      - `payment_reference` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `seat_status`
      - `id` (uuid, primary key)
      - `seat_number` (integer, unique)
      - `is_available` (boolean, default true)
      - `booking_id` (uuid, foreign key)
      - `passenger_name` (text)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access to read active pickup points and destinations
    - Add policies for booking submissions
    - Add policies for admin management
*/

-- Create pickup_points table
CREATE TABLE IF NOT EXISTS pickup_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price numeric(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bus_bookings table
CREATE TABLE IF NOT EXISTS bus_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  class text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  contact_person_name text NOT NULL,
  contact_person_phone text NOT NULL,
  pickup_point_id uuid REFERENCES pickup_points(id),
  destination_id uuid REFERENCES destinations(id),
  bus_type text DEFAULT 'Economical',
  seat_number integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  referral text NOT NULL,
  departure_date date NOT NULL,
  booking_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seat_status table
CREATE TABLE IF NOT EXISTS seat_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number integer UNIQUE NOT NULL CHECK (seat_number >= 1 AND seat_number <= 31),
  is_available boolean DEFAULT true,
  booking_id uuid REFERENCES bus_bookings(id) ON DELETE SET NULL,
  passenger_name text,
  updated_at timestamptz DEFAULT now()
);

-- Insert initial seat status (31 seats)
INSERT INTO seat_status (seat_number) 
SELECT generate_series(1, 31)
ON CONFLICT (seat_number) DO NOTHING;

-- Insert initial pickup points
INSERT INTO pickup_points (name) VALUES 
  ('Apowa'),
  ('Kwesimintsim'),
  ('Apolo'),
  ('Fijai')
ON CONFLICT (name) DO NOTHING;

-- Insert initial destinations
INSERT INTO destinations (name, price) VALUES 
  ('Madina/Adenta', 30.00),
  ('Accra', 40.00),
  ('Tema', 50.00),
  ('Kasoa', 70.00),
  ('Cape', 80.00),
  ('Takoradi', 60.00)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_status ENABLE ROW LEVEL SECURITY;

-- Policies for pickup_points
CREATE POLICY "Anyone can view active pickup points"
  ON pickup_points
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage pickup points"
  ON pickup_points
  FOR ALL
  TO public
  USING (is_admin());

-- Policies for destinations
CREATE POLICY "Anyone can view active destinations"
  ON destinations
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage destinations"
  ON destinations
  FOR ALL
  TO public
  USING (is_admin());

-- Policies for bus_bookings
CREATE POLICY "Anyone can create bookings"
  ON bus_bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all bookings"
  ON bus_bookings
  FOR SELECT
  TO public
  USING (is_admin());

CREATE POLICY "Admins can update bookings"
  ON bus_bookings
  FOR UPDATE
  TO public
  USING (is_admin());

CREATE POLICY "Admins can delete bookings"
  ON bus_bookings
  FOR DELETE
  TO public
  USING (is_admin());

-- Policies for seat_status
CREATE POLICY "Anyone can view seat status"
  ON seat_status
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update seat status"
  ON seat_status
  FOR UPDATE
  TO public
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_pickup_points_updated_at
  BEFORE UPDATE ON pickup_points
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_bus_bookings_updated_at
  BEFORE UPDATE ON bus_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_seat_status_updated_at
  BEFORE UPDATE ON seat_status
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();