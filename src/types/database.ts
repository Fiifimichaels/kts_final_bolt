export interface PickupPoint {
  id: string;
  name: string;
  active: boolean;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusBooking {
  id: string;
  full_name: string;
  class: string;
  email: string;
  phone: string;
  contact_person_name: string;
  contact_person_phone: string;
  pickup_point_id: string;
  destination_id: string;
  bus_type: string;
  seat_number: number;
  amount: number;
  referral: string;
  departure_date: string;
  booking_date: string;
  status: 'pending' | 'approved' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed';
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  pickup_point?: PickupPoint;
  destination?: Destination;
}

export interface SeatStatus {
  id: string;
  seat_number: number;
  is_available: boolean;
  booking_id?: string;
  passenger_name?: string;
  updated_at: string;
}

export interface BookingFormData {
  fullName: string;
  class: string;
  email: string;
  phone: string;
  contactPersonName: string;
  contactPersonPhone: string;
  pickupPointId: string;
  destinationId: string;
  busType: string;
  seatNumber: number | null;
  amount: number;
  referral: string;
  departureDate: string;
}
