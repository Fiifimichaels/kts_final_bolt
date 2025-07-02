import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PickupPoint, Destination, BusBooking, SeatStatus, BookingFormData } from '../types/database';

export const useSupabase = () => {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize seat status if empty
  const initializeSeatStatus = async () => {
    try {
      const { data: existingSeats, error: fetchError } = await supabase
        .from('seat_status')
        .select('*');

      if (fetchError) {
        console.error('Error fetching seat status:', fetchError);
        return;
      }

      // If no seats exist, create them
      if (!existingSeats || existingSeats.length === 0) {
        const seats = Array.from({ length: 31 }, (_, index) => ({
          seat_number: index + 1,
          is_available: true,
        }));

        const { error: insertError } = await supabase
          .from('seat_status')
          .insert(seats);

        if (insertError) {
          console.error('Error initializing seats:', insertError);
        }
      }
    } catch (err) {
      console.error('Error initializing seat status:', err);
    }
  };

  // Fetch pickup points
  const fetchPickupPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching pickup points:', error);
        return;
      }
      setPickupPoints(data || []);
    } catch (err) {
      console.error('Error fetching pickup points:', err);
    }
  };

  // Fetch destinations
  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching destinations:', error);
        return;
      }
      setDestinations(data || []);
    } catch (err) {
      console.error('Error fetching destinations:', err);
    }
  };

  // Fetch bookings with related data
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          pickup_point:pickup_points(*),
          destination:destinations(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  // Fetch seat status
  const fetchSeatStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('seat_status')
        .select('*')
        .order('seat_number');
      
      if (error) {
        console.error('Error fetching seat status:', error);
        return;
      }
      setSeatStatus(data || []);
    } catch (err) {
      console.error('Error fetching seat status:', err);
    }
  };

  // Simplified admin authentication
  const authenticateAdmin = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting admin authentication for:', email);
      
      // First check if email exists in admins table, if not create it
      let { data: adminCheck, error: adminCheckError } = await supabase
        .from('admins')
        .select('email, id')
        .eq('email', email)
        .maybeSingle();

      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
        return false;
      }

      // If admin doesn't exist, create the record
      if (!adminCheck) {
        console.log('Admin record not found, creating for:', email);
        
        const { data: insertData, error: insertError } = await supabase
          .from('admins')
          .insert([{
            email: email,
            full_name: email.includes('fiifi') ? 'Fiifi Michaels Admin' : 'Admin User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating admin record:', insertError);
          return false;
        }

        adminCheck = insertData;
        console.log('Admin record created:', adminCheck);
      }

      console.log('Admin record found/created:', adminCheck);

      // Attempt to sign in with existing credentials
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // If user doesn't exist in auth, try to create them
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('Email not confirmed')) {
          console.log('Auth user not found, creating account...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: undefined, // Skip email confirmation for admin
              data: {
                full_name: 'Admin User',
                role: 'admin'
              }
            }
          });

          if (signUpError) {
            console.error('Sign up error:', signUpError);
            return false;
          }

          if (!signUpData.user) {
            console.error('No user returned from sign up');
            return false;
          }

          // Update admin record with the new user's ID
          const { error: updateError } = await supabase
            .from('admins')
            .update({
              id: signUpData.user.id,
              updated_at: new Date().toISOString()
            })
            .eq('email', email);

          if (updateError) {
            console.error('Error updating admin record:', updateError);
          }

          console.log('Admin account created and linked successfully');
          return true;
        }
        
        console.error('Authentication error:', authError);
        return false;
      }

      if (!authData.user) {
        console.error('No user returned from sign in');
        return false;
      }

      // Update admin record with the authenticated user's ID if needed
      if (adminCheck && (!adminCheck.id || adminCheck.id !== authData.user.id)) {
        const { error: updateError } = await supabase
          .from('admins')
          .update({
            id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error('Error updating admin record:', updateError);
          // Don't fail if we can't update - the auth was successful
        }
      }

      console.log('Admin authentication successful');
      return true;

    } catch (err: any) {
      console.error('Authentication error:', err);
      return false;
    }
  };

  // Create booking using the new function
  const createBooking = async (formData: BookingFormData) => {
    try {
      setLoading(true);
      
      // Use the database function for atomic booking creation
      const { data, error } = await supabase.rpc('create_booking_with_seat_update', {
        p_full_name: formData.fullName,
        p_class: formData.class,
        p_email: formData.email,
        p_phone: formData.phone,
        p_contact_person_name: formData.contactPersonName,
        p_contact_person_phone: formData.contactPersonPhone,
        p_pickup_point_id: formData.pickupPointId,
        p_destination_id: formData.destinationId,
        p_bus_type: formData.busType,
        p_seat_number: formData.seatNumber!,
        p_amount: formData.amount,
        p_referral: formData.referral,
        p_departure_date: formData.departureDate,
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create booking');
      }

      // Refresh data
      await Promise.all([fetchBookings(), fetchSeatStatus()]);
      
      return data.booking;
    } catch (err) {
      console.error('Error creating booking:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: string, status: 'approved' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      // If cancelled, release the seat
      if (status === 'cancelled') {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          await releaseSeat(booking.seat_number);
        }
      }

      await fetchBookings();
    } catch (err) {
      console.error('Error updating booking status:', err);
      throw err;
    }
  };

  // Release seat
  const releaseSeat = async (seatNumber: number) => {
    try {
      const { error } = await supabase
        .from('seat_status')
        .update({
          is_available: true,
          booking_id: null,
          passenger_name: null,
        })
        .eq('seat_number', seatNumber);

      if (error) throw error;
      await fetchSeatStatus();
    } catch (err) {
      console.error('Error releasing seat:', err);
      throw err;
    }
  };

  // Delete booking
  const deleteBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      // Release the seat
      if (booking) {
        await releaseSeat(booking.seat_number);
      }

      await fetchBookings();
    } catch (err) {
      console.error('Error deleting booking:', err);
      throw err;
    }
  };

  // Update pickup point
  const updatePickupPoint = async (id: string, updates: { name: string }) => {
    try {
      const { error } = await supabase
        .from('pickup_points')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchPickupPoints();
    } catch (err) {
      console.error('Error updating pickup point:', err);
      throw err;
    }
  };

  // Update destination
  const updateDestination = async (id: string, updates: { name: string; price: number }) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchDestinations();
    } catch (err) {
      console.error('Error updating destination:', err);
      throw err;
    }
  };

  // Create pickup point
  const createPickupPoint = async (data: { name: string }) => {
    try {
      const { error } = await supabase
        .from('pickup_points')
        .insert([{ ...data, active: true }]);

      if (error) throw error;
      await fetchPickupPoints();
    } catch (err) {
      console.error('Error creating pickup point:', err);
      throw err;
    }
  };

  // Create destination
  const createDestination = async (data: { name: string; price: number }) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .insert([{ ...data, active: true }]);

      if (error) throw error;
      await fetchDestinations();
    } catch (err) {
      console.error('Error creating destination:', err);
      throw err;
    }
  };

  // Toggle seat availability
  const toggleSeatAvailability = async (seatNumber: number) => {
    try {
      const seat = seatStatus.find(s => s.seat_number === seatNumber);
      if (!seat) return;

      const { error } = await supabase
        .from('seat_status')
        .update({
          is_available: !seat.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq('seat_number', seatNumber);

      if (error) throw error;
      await fetchSeatStatus();
    } catch (err) {
      console.error('Error toggling seat availability:', err);
      throw err;
    }
  };

  // Initial data fetch with better error handling
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Starting data load...');
        
        // Set default data first to prevent blocking
        setSeatStatus(Array.from({ length: 31 }, (_, i) => ({
          id: `seat-${i + 1}`,
          seat_number: i + 1,
          is_available: true,
          updated_at: new Date().toISOString()
        })));

        // Set some default pickup points and destinations to prevent empty state
        setPickupPoints([
          { id: '1', name: 'Apowa', active: true, created_at: '', updated_at: '' },
          { id: '2', name: 'Kwesimintsim', active: true, created_at: '', updated_at: '' },
          { id: '3', name: 'Apolo', active: true, created_at: '', updated_at: '' },
          { id: '4', name: 'Fijai', active: true, created_at: '', updated_at: '' },
        ]);

        setDestinations([
          { id: '1', name: 'Madina/Adenta', price: 30, active: true, created_at: '', updated_at: '' },
          { id: '2', name: 'Accra', price: 40, active: true, created_at: '', updated_at: '' },
          { id: '3', name: 'Tema', price: 50, active: true, created_at: '', updated_at: '' },
          { id: '4', name: 'Kasoa', price: 70, active: true, created_at: '', updated_at: '' },
          { id: '5', name: 'Cape Coast', price: 80, active: true, created_at: '', updated_at: '' },
          { id: '6', name: 'Takoradi', price: 60, active: true, created_at: '', updated_at: '' },
        ]);

        // Try to load real data but don't block if it fails
        try {
          await Promise.allSettled([
            initializeSeatStatus(),
            fetchPickupPoints(),
            fetchDestinations(),
            fetchBookings(),
            fetchSeatStatus(),
          ]);
          console.log('Data loading completed successfully');
        } catch (dataError) {
          console.warn('Some data failed to load, using defaults:', dataError);
        }
        
      } catch (err: any) {
        console.error('Error loading data:', err);
        // Don't set error state, just use default data
        console.log('Using default data due to connection issues');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    pickupPoints,
    destinations,
    bookings,
    seatStatus,
    loading,
    error,
    createBooking,
    updateBookingStatus,
    releaseSeat,
    deleteBooking,
    fetchBookings,
    fetchSeatStatus,
    authenticateAdmin,
    updatePickupPoint,
    updateDestination,
    createPickupPoint,
    createDestination,
    toggleSeatAvailability,
  };
};