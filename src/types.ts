export interface BusBooking {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  class: string;
  pickup_point?: PickupPoint;
  destination?: Destination;
  seat_number: number;
  amount?: number;
  status: 'pending' | 'approved' | 'cancelled';
  payment_reference?: string;
  payment_status: string;
  departure_date?: string;
  booking_date: string;
  updated_at: string;
  contact_person_name?: string;
  contact_person_phone?: string;
}

export interface SeatStatus {
  id: string;
  seat_number: number;
  is_available: boolean;
  passenger_name?: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  active: boolean;
}

export interface Destination {
  id: string;
  name: string;
  price: number;
  active: boolean;
}
