/*
  # Update booking payment status function

  1. New Functions
    - `update_booking_payment_status` - Updates booking payment status and reference
    - Handles payment completion and booking approval

  2. Security
    - Function is accessible to public for payment webhook integration
    - Validates booking exists before updating
*/

-- Function to update booking payment status
CREATE OR REPLACE FUNCTION update_booking_payment_status(
  booking_id uuid,
  payment_reference text,
  payment_status text,
  booking_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_booking record;
BEGIN
  -- Update the booking
  UPDATE bus_bookings 
  SET 
    payment_status = update_booking_payment_status.payment_status,
    payment_reference = update_booking_payment_status.payment_reference,
    status = COALESCE(update_booking_payment_status.booking_status, status),
    updated_at = now()
  WHERE id = booking_id
  RETURNING * INTO updated_booking;

  -- Check if booking was found and updated
  IF updated_booking.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'booking', row_to_json(updated_booking)
  );
END;
$$;

-- Grant execute permission to public (for webhook integration)
GRANT EXECUTE ON FUNCTION update_booking_payment_status TO public;