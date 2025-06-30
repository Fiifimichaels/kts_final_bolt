import React from 'react';
import { X, MapPin, Calendar, User, Phone, CreditCard, Loader2, Users } from 'lucide-react';
import { PickupPoint, Destination } from '../types/database';

interface PassengerInfo {
  fullName: string;
  class: string;
  email: string;
  phone: string;
  seatNumber: number | null;
}

interface SharedInfo {
  contactPersonName: string;
  contactPersonPhone: string;
  pickupPointId: string;
  destinationId: string;
  busType: string;
  referral: string;
  departureDate: string;
}

interface BookingModalProps {
  passengers: PassengerInfo[];
  sharedInfo: SharedInfo;
  pickupPoint?: PickupPoint;
  destination?: Destination;
  totalAmount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  passengers,
  sharedInfo,
  pickupPoint, 
  destination, 
  totalAmount,
  onClose, 
  onConfirm, 
  loading = false 
}) => {
  const isGroupBooking = passengers.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isGroupBooking ? (
                <Users className="w-6 h-6 text-blue-600" />
              ) : (
                <User className="w-6 h-6 text-blue-600" />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isGroupBooking ? `Confirm Group Booking (${passengers.length} Passengers)` : 'Confirm Your Booking'}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Passenger Details */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {isGroupBooking ? (
                <Users className="w-5 h-5 text-blue-600" />
              ) : (
                <User className="w-5 h-5 text-blue-600" />
              )}
              <h3 className="font-semibold text-gray-900">
                {isGroupBooking ? 'Passenger Details' : 'Personal Details'}
              </h3>
            </div>
            
            {isGroupBooking ? (
              <div className="space-y-4">
                {passengers.map((passenger, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-900">Passenger {index + 1}</h4>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Seat {passenger.seatNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-medium">{passenger.fullName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Class:</span>
                        <p className="font-medium">{passenger.class}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium break-all">{passenger.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-medium">{passenger.phone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{passengers[0]?.fullName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Class:</span>
                  <p className="font-medium">{passengers[0]?.class}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium break-all">{passengers[0]?.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{passengers[0]?.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Person */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium">{sharedInfo.contactPersonName}</p>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <p className="font-medium">{sharedInfo.contactPersonPhone}</p>
              </div>
            </div>
          </div>

          {/* Journey Details */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Journey Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pick-up Point:</span>
                <p className="font-medium">{pickupPoint?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Destination:</span>
                <p className="font-medium">{destination?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Bus Type:</span>
                <p className="font-medium">{sharedInfo.busType}</p>
              </div>
              <div>
                <span className="text-gray-600">Seats:</span>
                <p className="font-medium">
                  {passengers.map(p => `Seat ${p.seatNumber}`).join(', ')}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Departure Date:</span>
                <p className="font-medium">{new Date(sharedInfo.departureDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Referral:</span>
                <p className="font-medium">{sharedInfo.referral}</p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5" />
              <h3 className="font-semibold">Payment Summary</h3>
            </div>
            <div className="space-y-2">
              {isGroupBooking && (
                <div className="flex justify-between items-center text-blue-100">
                  <span>Per passenger (GHS {destination?.price}):</span>
                  <span>{passengers.length} passengers</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-blue-500 pt-2">
                <span className="text-blue-100">Total Amount:</span>
                <span className="text-xl sm:text-2xl font-bold">GHS {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Group Booking Notice */}
          {isGroupBooking && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">📋 Group Booking Information</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Each passenger will receive their own confirmation email</li>
                <li>• All passengers share the same journey details and emergency contact</li>
                <li>• Payment covers all {passengers.length} passengers in this booking</li>
                <li>• Seats: {passengers.map(p => p.seatNumber).join(', ')}</li>
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 order-2 sm:order-1"
            >
              Back to Edit
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating {isGroupBooking ? 'Bookings' : 'Booking'}...
                </>
              ) : (
                <>
                  Confirm {isGroupBooking ? 'Group Booking' : 'Booking'}
                  {isGroupBooking && (
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
                      {passengers.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;