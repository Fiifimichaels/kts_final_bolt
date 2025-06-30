export interface Passenger {
  id: string;
  fullName: string;
  class: 'Level 100' | 'Level 200' | 'Level 300' | 'Level 400' | 'Non-Student';
  email: string;
  phone: string;
  contactPersonName: string;
  contactPersonPhone: string;
  pickupPoint: string;
  busType: string;
  seatNumber: number;
  destination: string;
  amount: number;
  referral: string;
  departureDate: string;
  bookingDate: string;
  status: 'pending' | 'approved' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export interface BookingFormData {
  fullName: string;
  class: string;
  email: string;
  phone: string;
  contactPersonName: string;
  contactPersonPhone: string;
  pickupPoint: string;
  busType: string;
  seatNumber: number | null;
  destination: string;
  amount: number;
  referral: string;
  departureDate: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  active: boolean;
  price: number;
}

export interface Destination {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'super-admin';
  createdAt: string;
}

export interface SeatStatus {
  seatNumber: number;
  isAvailable: boolean;
  passengerName?: string;
  bookingId?: string;
}
