import { PickupPoint, Destination, SeatStatus } from '../types'; // Adjust the path as needed

// Define Passenger type if not imported
export interface Passenger {
  id: string;
  fullName: string;
  class: string;
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
  status: string;
  paymentStatus: string;
}

export const PICKUP_POINTS: PickupPoint[] = [
  { id: '1', name: 'Apowa', active: true },
  { id: '4', name: 'Fijai', active: true },
];

export const DESTINATIONS: Destination[] = [
  { id: '1', name: 'Madina/Adenta', price: 30, active: true },
  { id: '2', name: 'Accra', price: 1, active: true },
  { id: '3', name: 'Tema', price: 1, active: true },
];

export const REFERRALS = ['Kofi', 'Emma', 'Christabel', 'Kelvin', 'Custom'];

export const CLASS_OPTIONS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Non-Student'];

// Initialize seat status (31 seats + driver)
export const initialSeatStatus: SeatStatus[] = Array.from({ length: 31 }, (_, index) => ({
  id: (index + 1).toString(),
  seat_number: index + 1,
  is_available: true,
}));

// Mock passengers data
export const mockPassengers: Passenger[] = [
  {
    id: '1',
    fullName: 'John Doe',
    class: 'Level 200',
    email: 'john@example.com',
    phone: '+233123456789',
    contactPersonName: 'Jane Doe',
    contactPersonPhone: '+233987654321',
    pickupPoint: 'Apowa',
    busType: 'Economical',
    seatNumber: 5,
    destination: 'Accra',
    amount: 40,
    referral: 'Kofi',
    departureDate: '2025-01-20',
    bookingDate: '2025-01-15',
    status: 'approved',
    paymentStatus: 'completed',
  },
  {
    id: '2',
    fullName: 'Mary Smith',
    class: 'Level 300',
    email: 'mary@example.com',
    phone: '+233111222333',
    contactPersonName: 'Peter Smith',
    contactPersonPhone: '+233444555666',
    pickupPoint: 'Fijai',
    busType: 'Economical',
    seatNumber: 12,
    destination: 'Tema',
    amount: 50,
    referral: 'Emma',
    departureDate: '2025-01-22',
    bookingDate: '2025-01-16',
    status: 'pending',
    paymentStatus: 'completed',
  },
];