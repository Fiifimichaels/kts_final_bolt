/*
  # Admin Activities Table

  1. New Tables
    - `admin_activities`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key to admins)
      - `action` (text) - Type of action performed
      - `description` (text) - Human readable description
      - `metadata` (jsonb) - Additional data about the action
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on admin_activities table
    - Add policies for admin access only
*/

-- Create admin_activities table
CREATE TABLE IF NOT EXISTS admin_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Policies for admin_activities
CREATE POLICY "Admins can view all activities"
  ON admin_activities
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create activities"
  ON admin_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

-- Insert initial activity for existing admin
INSERT INTO admin_activities (admin_id, action, description, metadata)
SELECT 
  id,
  'SYSTEM_SETUP',
  'Admin portal initialized with activity logging',
  '{"version": "1.0", "features": ["activity_logging", "admin_dashboard"]}'
FROM admins
WHERE email = 'preachitenterprise_mq@yahoo.com'
ON CONFLICT DO NOTHING;