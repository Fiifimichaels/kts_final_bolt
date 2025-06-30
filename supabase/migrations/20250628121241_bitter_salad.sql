/*
  # Create sample data for bus booking system

  1. Sample Data
    - Create pickup points
    - Create destinations
    - Initialize seat status
    - Create sample admin user
*/

-- Insert pickup points
INSERT INTO pickup_points (name, active) VALUES
  ('Apowa', true),
  ('Kwesimintsim', true),
  ('Apolo', true),
  ('Fijai', true)
ON CONFLICT (name) DO NOTHING;

-- Insert destinations
INSERT INTO destinations (name, price, active) VALUES
  ('Madina/Adenta', 30.00, true),
  ('Accra', 40.00, true),
  ('Tema', 50.00, true),
  ('Kasoa', 70.00, true),
  ('Cape Coast', 80.00, true),
  ('Takoradi', 60.00, true)
ON CONFLICT (name) DO NOTHING;

-- Initialize seat status for all 31 seats
INSERT INTO seat_status (seat_number, is_available)
SELECT 
  generate_series(1, 31) as seat_number,
  true as is_available
ON CONFLICT (seat_number) DO NOTHING;

-- Note: Admin users should be created through Supabase Auth UI or programmatically
-- After creating an auth user, you can insert into admins table:
-- INSERT INTO admins (id, email, full_name) VALUES 
--   ('auth-user-id-here', 'admin@example.com', 'Admin User');