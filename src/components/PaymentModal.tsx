import React, { useState, useEffect } from 'react';
import { X, CreditCard, Shield, Loader2, ExternalLink, CheckCircle, Mail, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PassengerInfo {
  fullName: string;
  class: string;
  email: string;
  phone: string;
  seatNumber: number | null;
}

interface PaymentModalProps {
  bookingIds: string[];
  amount: number;
  passengers: PassengerInfo[];
  onSuccess: () => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  bookingIds,
  amount,
  passengers,
  onSuccess,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [sendingReceipts, setSendingReceipts] = useState(false);
  
  const publicKey = 'pk_live_17f317c97c729f9e877d65d23d9f45f0c959ec63';
  const isGroupBooking = passengers.length > 1;
  const primaryPassenger = passengers[0];
  
  useEffect(() => {
    if (window.PaystackPop) {
      setPaystackLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    script.onerror = () => setError('Failed to load payment system. Please check your internet connection.');
    
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  
  const updateBookingsPaymentStatus = async (reference: string, status: 'completed' | 'failed') => {
    try {
      for (const bookingId of bookingIds) {
        const { error } = await supabase
          .from('bookings')  // Corrected table name
          .update({
            payment_status: status,
            payment_reference: reference,
            status: status === 'completed' ? 'approved' : 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (error) {
          console.error(`Error updating booking ${bookingId}:`, error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
      throw err;
    }
  };

  const sendBookingReceipts = async (transaction: any) => {
    try {
      setSendingReceipts(true);
      
      for (const bookingId of bookingIds) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bus_bookings')
          .select(`
            *,
            pickup_point:pickup_points(name),
            destination:destinations(name)
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError || !bookingData) {
          console.error(`Error fetching booking ${bookingId}:`, bookingError);
          continue;
        }

        const { data, error } = await supabase.functions.invoke('send-booking-receipts', {  // Corrected function name
          body: {
            booking_data: {
              booking_id: bookingData.id,
              customer_name: bookingData.full_name,
              customer_email: bookingData.email,
              pickup_point: bookingData.pickup_point?.name || 'N/A',
              destination: bookingData.destination?.name || 'N/A',
              seat_number: bookingData.seat_number,
              departure_date: bookingData.departure_date,
              amount: bookingData.amount,
              payment_reference: transaction.reference,
              booking_date: bookingData.created_at,
              class: bookingData.class,
              phone: bookingData.phone,
              contact_person_name: bookingData.contact_person_name,
              contact_person_phone: bookingData.contact_person_phone,
              referral: bookingData.referral,
              bus_type: bookingData.bus_type,
            }
          }
        });

        if (error) {
          console.error(`Error sending receipt for booking ${bookingId}:`, error);
        } else {
          console.log(`Receipt sent successfully for booking ${bookingId}:`, data);
        }
      }
    } catch (error) {
      console.error('Error in sendBookingReceipts:', error);
    } finally {
      setSendingReceipts(false);
    }
  };

  const handlePaystackPayment = () => {
    if (!paystackLoaded || !window.PaystackPop) {
      setError('Payment system is not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    const reference = `group_booking_${bookingIds[0].slice(0, 8)}_${Date.now()}`;
    
    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: primaryPassenger.email,
        amount: Math.round(amount * 100),
        currency: 'GHS',
        reference: reference,
        metadata: {
          booking_id: bookingIds.join(','),
          customer_name: primaryPassenger.fullName,
          passenger_count: passengers.length,
          custom_fields: [
            {
              display_name: "Booking Type",
              variable_name: "booking_type",
              value: isGroupBooking ? "Group Booking" : "Single Booking"
            },
            {
              display_name: "Passenger Count",
              variable_name: "passenger_count", 
              value: passengers.length.toString()
            },
            {
              display_name: "Primary Passenger",
              variable_name: "primary_passenger",
              value: primaryPassenger.fullName
            },
            // Add passenger details
            ...passengers.map((passenger, index) => [
              {
                display_name: `Passenger ${index + 1} Name`,
                variable_name: `passenger_${index + 1}_name`,
                value: passenger.fullName
              },
              {
                display_name: `Passenger ${index + 1} Phone`,
                variable_name: `passenger_${index + 1}_phone`,
                value: passenger.phone
              }
            ]).flat()
          ]
        },
        onSuccess: async (transaction: any) => {
          console.log('Payment successful:', transaction);
          
          try {
            // Update bookings first
            // Update backend first
            await updateBookingsPaymentStatus(transaction.reference, 'completed');
            
            // Then update UI state before sending receipts
            setPaymentDetails(transaction);
            setPaymentSuccess(true);
            
            // Send receipts in background
            sendBookingReceipts(transaction).finally(() => {
              setIsProcessing(false);
              
              // Small delay for smooth transition
              setTimeout(() => {
                const iframe = document.querySelector('iframe[src*="paystack"]');
                if (iframe) {
                  (iframe.parentNode?.parentNode as HTMLElement)?.style.removeProperty('display');
                }
              }, 500);
            });
            
          } catch (error) {
            console.error('Error processing successful payment:', error);
            setIsProcessing(false);
            setError('Payment was successful but there was an error updating your bookings. Please contact support with reference: ' + transaction.reference);
          }
        },
        onCancel: () => {
          console.log('Payment cancelled by user');
          setIsProcessing(false);
          setError('Payment was cancelled. You can try again or contact support if you need help.');
        },
        onClose: () => {
          console.log('Payment modal closed');
          // Ensure processing state clears even if Paystack modal hangs
          setTimeout(() => setIsProcessing(false), 2000);
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error('Error initializing payment:', err);
      setIsProcessing(false);
      setError('Failed to initialize payment. Please try again.');
    }
  };

  const handleSuccessClose = () => {
    setPaymentSuccess(false);
    onSuccess();
  };

  if (paymentSuccess && paymentDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 p-4 sm:p-6 rounded-t-2xl text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {isGroupBooking ? 'Group Booking Successful!' : 'Payment Successful!'}
                </h2>
              </div>
              <button
                onClick={handleSuccessClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isGroupBooking ? 'All Bookings Confirmed!' : 'Booking Confirmed!'}
              </h3>
              <p className="text-gray-600">
                {isGroupBooking 
                  ? `Payment has been processed successfully for all ${passengers.length} passengers and all bookings have been automatically approved.`
                  : 'Your payment has been processed successfully and your booking has been automatically approved.'
                }
              </p>
            </div>

            {/* Group Summary */}
            {isGroupBooking && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Group Booking Summary</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Passengers:</span>
                    <span className="font-semibold text-blue-900">{passengers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Seats Booked:</span>
                    <span className="font-semibold text-blue-900">
                      {passengers.map(p => p.seatNumber).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Primary Contact:</span>
                    <span className="font-semibold text-blue-900">{primaryPassenger.fullName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold text-green-600">GHS {amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono text-gray-900">{paymentDetails.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-gray-900">{paymentDetails.trans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">Approved & Confirmed</span>
                </div>
              </div>
            </div>

            {/* Receipt Email Status */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Receipt Emails</h4>
              </div>
              {sendingReceipts ? (
                <div className="flex items-center gap-2 text-blue-800">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    Sending detailed receipts to {isGroupBooking ? 'all passengers' : primaryPassenger.email}...
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-blue-800">
                    ✅ Detailed receipts have been sent to {isGroupBooking ? 'each passenger' : 'your email'}
                  </p>
                  {isGroupBooking && (
                    <div className="text-xs text-blue-700 space-y-1">
                      {passengers.map((passenger, index) => (
                        <div key={index}>• {passenger.fullName} - {passenger.email}</div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-blue-700">From: michaelquaicoe60@gmail.com</p>
                </div>
              )}
            </div>

            {/* Approval Notice */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">🎉 Bookings Approved!</h4>
              <p className="text-sm text-green-800">
                {isGroupBooking 
                  ? `All ${passengers.length} bookings have been automatically approved upon successful payment. No further action is required.`
                  : 'Your booking has been automatically approved upon successful payment. No further action is required.'
                }
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">📋 Next Steps</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Check {isGroupBooking ? 'all passenger emails' : 'your email'} for detailed receipts and booking confirmations</li>
                <li>• Arrive at pickup point 15 minutes before departure</li>
                <li>• {isGroupBooking ? 'Each passenger should bring' : 'Bring'} a valid ID for verification</li>
                <li>• Contact us if you need to make changes</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Phone/WhatsApp:</strong> +233 243 762 748</p>
                <p><strong>Email:</strong> michaelquaicoe60@gmail.com</p>
              </div>
            </div>

            <button
              onClick={handleSuccessClose}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 sm:py-4 px-6 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-gray-200 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isGroupBooking ? 'Complete Group Payment' : 'Complete Payment'}
            </h2>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">
                {isGroupBooking ? 'Group Payment Summary' : 'Payment Summary'}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Primary Contact:</span>
                <span className="font-medium text-gray-900 text-sm text-right">{primaryPassenger.fullName}</span>
              </div>
              {isGroupBooking && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 text-sm">Passengers:</span>
                  <span className="font-medium text-gray-900 text-sm">{passengers.length}</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Booking IDs:</span>
                <span className="font-medium text-gray-900 font-mono text-sm">
                  {bookingIds.length > 1 ? `${bookingIds.length} bookings` : bookingIds[0].slice(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-green-200">
                <span className="text-gray-600">Total Amount:</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600">GHS {amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Group Details */}
          {isGroupBooking && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Passengers & Seats</h4>
              </div>
              <div className="space-y-2 text-sm">
                {passengers.map((passenger, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-blue-800">{passenger.fullName}</span>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Seat {passenger.seatNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-approval Notice */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Instant Approval</h4>
            </div>
            <p className="text-sm text-blue-800">
              {isGroupBooking 
                ? 'All bookings will be automatically approved upon successful payment, and receipts will be sent to each passenger\'s email.'
                : 'Your booking will be automatically approved upon successful payment, and a receipt will be sent to your email.'
              }
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Secure Payment</h4>
            </div>
            <p className="text-sm text-gray-600">
              Your payment is processed securely through Paystack. We do not store your card details.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Payment Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Payment Processing State */}
          {isProcessing && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                <span className="text-yellow-800 font-medium">Processing your payment...</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete the payment in the Paystack window that opened.
              </p>
            </div>
          )}

          {/* Loading State */}
          {!paystackLoaded && !error && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                <span className="text-gray-800 font-medium">Loading payment system...</span>
              </div>
            </div>
          )}

          {/* Payment Button */}
          <div className="space-y-4">
            <button
              onClick={handlePaystackPayment}
              disabled={isProcessing || !paystackLoaded || !!error}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 sm:py-4 px-6 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              {isProcessing ? 'Processing...' : paystackLoaded ? 'Pay with Paystack' : 'Loading...'}
              {isGroupBooking && !isProcessing && (
                <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
                  {passengers.length} passengers
                </span>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Payment
            </button>
          </div>

          {/* Payment Methods */}
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">Accepted payment methods:</p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-xs">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Visa</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Mastercard</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Mobile Money</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Bank Transfer</span>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>Important:</strong> {isGroupBooking ? 'All seats' : 'Your seat'} will be held for 15 minutes. 
              Complete payment to confirm {isGroupBooking ? 'all bookings' : 'your booking'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
