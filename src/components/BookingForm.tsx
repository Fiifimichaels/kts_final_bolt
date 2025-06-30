import React, { useState } from 'react';
import { Calendar, User, Phone, MapPin, CreditCard, Loader2, AlertCircle, Mail, MessageCircle, Bus, Plus, Minus, Users } from 'lucide-react';
import BusSeatDiagram from './BusSeatDiagram';
import BookingModal from './BookingModal';
import PaymentModal from './PaymentModal';
import { BookingFormData } from '../types/database';
import { useApp } from '../contexts/AppContext';

const CLASS_OPTIONS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Non-Student'];
const REFERRALS = ['Kofi', 'Emma', 'Christabel', 'Kelvin', 'Custom'];

interface PassengerInfo {
  fullName: string;
  class: string;
  email: string;
  phone: string;
  seatNumber: number | null;
}

const BookingForm: React.FC = () => {
  const { pickupPoints, destinations, createBooking, loading, error } = useApp();
  const [passengers, setPassengers] = useState<PassengerInfo[]>([
    {
      fullName: '',
      class: '',
      email: '',
      phone: '',
      seatNumber: null,
    }
  ]);
  
  const [sharedInfo, setSharedInfo] = useState({
    contactPersonName: '',
    contactPersonPhone: '',
    pickupPointId: '',
    destinationId: '',
    busType: 'Economical',
    referral: '',
    departureDate: '',
    // referral: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customReferral, setCustomReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const selectedDestination = destinations.find(d => d.id === sharedInfo.destinationId);
  const selectedPickupPoint = pickupPoints.find(p => p.id === sharedInfo.pickupPointId);
  const totalAmount = passengers.length * (selectedDestination?.price || 0);

  const addPassenger = () => {
    if (passengers.length < 5) { // Limit to 5 passengers max
      setPassengers([...passengers, {
        fullName: '',
        class: '',
        email: '',
        phone: '',
        seatNumber: null,
      }]);
    }
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      const newPassengers = passengers.filter((_, i) => i !== index);
      setPassengers(newPassengers);
    }
  };

  const updatePassenger = (index: number, field: keyof PassengerInfo, value: string | number | null) => {
    const newPassengers = [...passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setPassengers(newPassengers);
  };

  const handleSharedInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSharedInfo(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSeatSelect = (seatNumber: number) => {
    // Find the first passenger without a seat and assign it
    const passengerIndex = passengers.findIndex(p => p.seatNumber === null);
    if (passengerIndex !== -1) {
      updatePassenger(passengerIndex, 'seatNumber', seatNumber);
    }
  };

  const handleSeatDeselect = (seatNumber: number) => {
    // Remove seat from passenger who has it
    const passengerIndex = passengers.findIndex(p => p.seatNumber === seatNumber);
    if (passengerIndex !== -1) {
      updatePassenger(passengerIndex, 'seatNumber', null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      setBookingError(null);
      
      const bookingIds: string[] = [];
      
      // Create bookings for each passenger
      for (const passenger of passengers) {
        const formData: BookingFormData = {
          fullName: passenger.fullName,
          class: passenger.class,
          email: passenger.email,
          phone: passenger.phone,
          contactPersonName: sharedInfo.contactPersonName,
          contactPersonPhone: sharedInfo.contactPersonPhone,
          pickupPointId: sharedInfo.pickupPointId,
          destinationId: sharedInfo.destinationId,
          busType: sharedInfo.busType,
          seatNumber: passenger.seatNumber!,
          amount: selectedDestination?.price || 0,
          referral: sharedInfo.referral,
          departureDate: sharedInfo.departureDate,
        };
        
        const booking = await createBooking(formData);
        bookingIds.push(booking.id);
      }
      
      setPendingBookingIds(bookingIds);
      setShowModal(false);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Booking creation error:', error);
      setBookingError(error.message || 'Failed to create bookings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPendingBookingIds([]);
    
    // Reset form
    setPassengers([{
      fullName: '',
      class: '',
      email: '',
      phone: '',
      seatNumber: null,
    }]);
    setSharedInfo({
      contactPersonName: '',
      contactPersonPhone: '',
      pickupPointId: '',
      destinationId: '',
      busType: 'Economical',
      referral: '',
      departureDate: '',
    });
    setCustomReferral('');
    
    // Show success message
    // Success is handled by the payment modal, no need for alert here
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPendingBookingIds([]);
    
    if (pendingBookingIds.length > 0) {
      alert('⚠️ Payment was not completed. Your seat reservations will expire in 15 minutes. You can complete payment from the admin panel or contact support.');
    }
  };

  // Helper function to check if form can be submitted (without updating state)
  const canSubmitForm = () => {
    // Check shared info
    if (!sharedInfo.contactPersonName || !sharedInfo.contactPersonPhone || 
        !sharedInfo.pickupPointId || !sharedInfo.destinationId || 
        !sharedInfo.referral || !sharedInfo.departureDate) {
      return false;
    }

    // Check each passenger has complete info AND a seat
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      if (!passenger.fullName || !passenger.class || !passenger.email || 
          !passenger.phone || passenger.seatNumber === null) {
        return false;
      }
    }

    // Check that number of passengers matches number of selected seats
    const selectedSeats = passengers.map(p => p.seatNumber).filter(seat => seat !== null);
    if (selectedSeats.length !== passengers.length) {
      return false;
    }

    // Check for duplicate seats
    const uniqueSeats = new Set(selectedSeats);
    if (selectedSeats.length !== uniqueSeats.size) {
      return false;
    }

    return true;
  };

  // Validation function that updates state (for form submission)
  const validateForm = () => {
    // Check shared info
    if (!sharedInfo.contactPersonName || !sharedInfo.contactPersonPhone || 
        !sharedInfo.pickupPointId || !sharedInfo.destinationId || 
        !sharedInfo.referral || !sharedInfo.departureDate) {
      setBookingError('Please fill in all shared booking information.');
      return false;
    }

    // Check each passenger has complete info
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      if (!passenger.fullName || !passenger.class || !passenger.email || !passenger.phone) {
        setBookingError(`Please complete all personal information for Passenger ${i + 1}.`);
        return false;
      }
    }

    // Check that all passengers have seats selected
    const passengersWithoutSeats = passengers.filter(p => p.seatNumber === null);
    if (passengersWithoutSeats.length > 0) {
      setBookingError(`Please select seats for all ${passengers.length} passenger${passengers.length > 1 ? 's' : ''}. ${passengersWithoutSeats.length} passenger${passengersWithoutSeats.length > 1 ? 's' : ''} still need${passengersWithoutSeats.length === 1 ? 's' : ''} seat assignment.`);
      return false;
    }

    // Check that number of passengers matches number of selected seats
    const selectedSeats = passengers.map(p => p.seatNumber).filter(seat => seat !== null);
    if (selectedSeats.length !== passengers.length) {
      setBookingError(`Seat selection mismatch: ${passengers.length} passenger${passengers.length > 1 ? 's' : ''} but ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} selected.`);
      return false;
    }

    // Check for duplicate seats
    const uniqueSeats = new Set(selectedSeats);
    if (selectedSeats.length !== uniqueSeats.size) {
      setBookingError('Each passenger must have a different seat. Please ensure no duplicate seat selections.');
      return false;
    }

    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Booking System
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Preparing your booking experience...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Connection Error</h1>
          <p className="text-gray-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Retry Connection
          </button>
          <p className="text-sm text-gray-500 mt-4">
            If this persists, please contact support at +233 243 762 748
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-x-hidden">
      {/* Compact Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 max-w-[100vw]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 rounded-lg" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-4 left-10 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-pulse" />
        <div className="absolute top-8 right-20 w-8 h-8 bg-white bg-opacity-10 rounded-full animate-pulse delay-1000" />
        <div className="absolute bottom-4 left-1/4 w-6 h-6 bg-white bg-opacity-10 rounded-full animate-pulse delay-2000" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                  <Bus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
            </div>
            
            {/* Main Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
              Khompatek Transport Service
            </h1>
            
            {/* Subtitle */}
            <p className="text-base sm:text-lg text-blue-100 mb-4 font-light">
              Your trusted partner for comfortable and reliable travel
            </p>
            
            {/* Features */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white font-medium text-xs sm:text-sm">🛡️ Safe & Secure</span>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white font-medium text-xs sm:text-sm">💰 Affordable</span>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white font-medium text-xs sm:text-sm">🕒 24/7 Support</span>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white font-medium text-xs sm:text-sm">👥 Group Bookings</span>
              </div>
            </div>
            
            {/* CTA */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 max-w-xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-1">Book Your Journey Today</h2>
              <p className="text-blue-100 mb-3 text-sm">
                Experience comfort, reliability, and excellent service. Book single or multiple seats for your group.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-xs text-blue-100">
                <span>✓ Instant Confirmation</span>
                <span>✓ Secure Payment</span>
                <span>✓ Email Receipts</span>
                <span>✓ Multiple Passengers</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 sm:h-10">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor" className="text-white"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor" className="text-white"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor" className="text-white"></path>
          </svg>
        </div>
      </div>

      <div className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Booking Summary */}
          {passengers.length > 1 && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <div>
                      <h3 className="text-xl font-bold">Group Booking</h3>
                      <p className="text-blue-100">Booking for {passengers.length} passengers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold">GHS {totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {bookingError && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Booking Error</p>
                  <p className="text-sm">{bookingError}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 justify-center px-2">
            {/* Left Column - Form Fields */}
            <div className="space-y-4 w-full max-w-3xl p-2">
              {/* Passenger Information */}
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mx-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Passenger Information ({passengers.length})
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addPassenger}
                      disabled={passengers.length >= 5}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add passenger"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {passengers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePassenger(passengers.length - 1)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Remove last passenger"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {passengers.map((passenger, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">
                          Passenger {index + 1}
                          {passenger.seatNumber && (
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              Seat {passenger.seatNumber}
                            </span>
                          )}
                          {!passenger.seatNumber && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                              No seat selected
                            </span>
                          )}
                        </h3>
                        {passengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePassenger(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Remove this passenger"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                          <input
                            type="text"
                            value={passenger.fullName}
                            onChange={(e) => updatePassenger(index, 'fullName', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                          <select
                            value={passenger.class}
                            onChange={(e) => updatePassenger(index, 'class', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                            required
                          >
                            <option value="">Select Class</option>
                            {CLASS_OPTIONS.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={passenger.email}
                            onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={passenger.phone}
                            onChange={(e) => updatePassenger(index, 'phone', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                            placeholder="+233 XX XXX XXXX"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {passengers.length < 5 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Group Booking:</strong> You can add up to 5 passengers in a single booking. 
                      Each passenger will receive their own confirmation email.
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Person */}
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Emergency Contact</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Name</label>
                    <input
                      type="text"
                      name="contactPersonName"
                      value={sharedInfo.contactPersonName}
                      onChange={handleSharedInfoChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                      placeholder="Emergency contact name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone Number</label>
                    <input
                      type="tel"
                      name="contactPersonPhone"
                      value={sharedInfo.contactPersonPhone}
                      onChange={handleSharedInfoChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                      placeholder="+233 XX XXX XXXX"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Journey Details */}
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Journey Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pick-up Point</label>
                      <select
                        name="pickupPointId"
                        value={sharedInfo.pickupPointId}
                        onChange={handleSharedInfoChange}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                        required
                      >
                        <option value="">Select Pick-up Point</option>
                        {pickupPoints.map(point => (
                          <option key={point.id} value={point.id}>{point.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                      <select
                        name="destinationId"
                        value={sharedInfo.destinationId}
                        onChange={handleSharedInfoChange}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                        required
                      >
                        <option value="">Select Destination</option>
                        {destinations.map(dest => (
                          <option key={dest.id} value={dest.id}>{dest.name} - GHS {dest.price}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bus Type</label>
                      <select
                        name="busType"
                        value={sharedInfo.busType}
                        onChange={handleSharedInfoChange}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                        required
                      >
                        <option value="Economical">Economical</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={`GHS ${totalAmount.toFixed(2)}`}
                          readOnly
                          className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm sm:text-base font-semibold"
                        />
                      </div>
                      {passengers.length > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          GHS {selectedDestination?.price || 0} × {passengers.length} passengers
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          name="departureDate"
                          value={sharedInfo.departureDate}
                          onChange={handleSharedInfoChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referral</label>
                    <div className="space-y-2">
                      <select
                        name="referral"
                        value={sharedInfo.referral === customReferral ? 'Custom' : sharedInfo.referral}
                        onChange={(e) => {
                          if (e.target.value === 'Custom') {
                            setSharedInfo(prev => ({ ...prev, referral: customReferral }));
                          } else {
                            setSharedInfo(prev => ({ ...prev, referral: e.target.value }));
                            setCustomReferral('');
                          }
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                        required
                      >
                        <option value="">Select Referral</option>
                        {REFERRALS.map(ref => (
                          <option key={ref} value={ref}>{ref}</option>
                        ))}
                      </select>
                      
                      {(sharedInfo.referral === customReferral || sharedInfo.referral === 'Custom') && (
                        <input
                          type="text"
                          value={customReferral}
                          onChange={(e) => {
                            setCustomReferral(e.target.value);
                            setSharedInfo(prev => ({ ...prev, referral: e.target.value }));
                          }}
                          placeholder="Enter custom referral name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Seat Selection */}
            <div className="w-full max-w-2xl xl:sticky xl:top-8 p-2">
              <BusSeatDiagram
                selectedSeats={passengers.map(p => p.seatNumber).filter(Boolean) as number[]}
                onSeatSelect={handleSeatSelect}
                onSeatDeselect={handleSeatDeselect}
                multiSelect={true}
                maxSeats={passengers.length}
              />
              
              {/* Selected Seats Summary */}
              {passengers.some(p => p.seatNumber) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected Seats:</h4>
                  <div className="flex flex-wrap gap-2">
                    {passengers.map((passenger, index) => (
                      passenger.seatNumber && (
                        <div key={index} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                          Seat {passenger.seatNumber}
                          {passenger.fullName && (
                            <span className="ml-1 opacity-75">- {passenger.fullName.split(' ')[0]}</span>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    {passengers.filter(p => p.seatNumber).length} of {passengers.length} seats selected
                  </p>
                </div>
              )}

              {/* Seat Selection Status */}
              {passengers.filter(p => p.seatNumber === null).length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Seat Selection Required</h4>
                  <p className="text-sm text-yellow-800">
                    Please select seats for all {passengers.length} passenger{passengers.length > 1 ? 's' : ''}. 
                    {passengers.filter(p => p.seatNumber === null).length} passenger{passengers.filter(p => p.seatNumber === null).length > 1 ? 's' : ''} still need{passengers.filter(p => p.seatNumber === null).length === 1 ? 's' : ''} seat assignment.
                  </p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={!canSubmitForm() || submitting}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 sm:py-4 px-6 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Bookings...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    {passengers.length > 1 && (
                      <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
                        {passengers.length} passengers
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>

          {showModal && (
            <BookingModal
              passengers={passengers}
              sharedInfo={sharedInfo}
              pickupPoint={selectedPickupPoint}
              destination={selectedDestination}
              totalAmount={totalAmount}
              onClose={() => setShowModal(false)}
              onConfirm={handleConfirmBooking}
              loading={submitting}
            />
          )}

          {showPaymentModal && pendingBookingIds.length > 0 && (
            <PaymentModal
              bookingIds={pendingBookingIds}
              amount={totalAmount}
              passengers={passengers}
              onSuccess={handlePaymentSuccess}
              onClose={handlePaymentClose}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <Bus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Khompatek Transport Service</h3>
                  <p className="text-blue-200 text-sm font-medium">(KTS)</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Your trusted partner for comfortable and reliable bus transportation. 
                We provide safe, affordable, and convenient travel solutions across Ghana.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-blue-200 text-sm">Safe Travel</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-blue-200 text-sm">Affordable Rates</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-blue-200 text-sm">24/7 Support</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-blue-200 text-sm">Group Bookings</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-200">Contact Us</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Phone / WhatsApp</p>
                    <a 
                      href="tel:+233243762748" 
                      className="text-white hover:text-blue-200 transition-colors font-medium"
                    >
                      +233 243 762 748
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-lg">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Email</p>
                    <a 
                      href="mailto:michaelquaicoe60@gmail.com" 
                      className="text-white hover:text-blue-200 transition-colors font-medium break-all"
                    >
                      michaelquaicoe60@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-500 p-2 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">WhatsApp</p>
                    <a 
                      href="https://wa.me/233243762748" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-200 transition-colors font-medium"
                    >
                      Chat with us
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-200">Quick Links</h4>
              <div className="space-y-2">
                <a href="#booking" className="block text-gray-300 hover:text-white transition-colors">
                  Book a Trip
                </a>
                <a href="#routes" className="block text-gray-300 hover:text-white transition-colors">
                  Our Routes
                </a>
                <a href="#schedule" className="block text-gray-300 hover:text-white transition-colors">
                  Schedule
                </a>
                <a href="#support" className="block text-gray-300 hover:text-white transition-colors">
                  Customer Support
                </a>
                <a href="#about" className="block text-gray-300 hover:text-white transition-colors">
                  About Us
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-gray-300 text-sm">
                  © {new Date().getFullYear()} Khompatek Transport Service (KTS). All rights reserved.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Providing reliable transportation services across Ghana
                </p>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <a href="#privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="#terms" className="text-gray-300 hover:text-white transition-colors">
                  Terms of Service
                </a>
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
        {/* Floating WhatsApp and Back to Top Buttons */}
        <div className="fixed left-6 bottom-8 flex flex-col gap-4 z-50">
          {/* WhatsApp Button */}
          <a
            href="https://wa.me/233243762748"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-green-500 hover:bg-green-600 transition-colors rounded-full shadow-lg flex items-center px-4 py-2 gap-2"
            style={{ minWidth: 48 }}
            aria-label="Chat on WhatsApp"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="hidden md:inline text-white font-semibold text-sm group-hover:underline">
              WhatsApp
            </span>
          </a>
          {/* Back to Top Button */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-full shadow-lg flex items-center px-4 py-2 gap-2"
            style={{ minWidth: 48 }}
            aria-label="Back to top"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
            <span className="hidden md:inline text-white font-semibold text-sm">
              Top
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default BookingForm;
