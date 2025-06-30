import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { BusBooking, PickupPoint, Destination, SeatStatus, BookingFormData } from '../types/database';

interface AppContextType {
  // Data
  pickupPoints: PickupPoint[];
  // Methods
  updateBookingStatus: (bookingId: string, status: 'approved' | 'cancelled') => Promise<void>;
  destinations: Destination[];
  bookings: BusBooking[];
  seatStatus: SeatStatus[];
  loading: boolean;
  error: string | null;
  
  // Auth
  isAdminLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Actions
  createBooking: (formData: BookingFormData) => Promise<BusBooking>;
  updateBookingStatus: (bookingId: string, status: 'approved' | 'cancelled') => Promise<void>;
  releaseSeat: (seatNumber: number) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  
  // Management Actions
  updatePickupPoint: (id: string, updates: { name: string }) => Promise<void>;
  updateDestination: (id: string, updates: { name: string; price: number }) => Promise<void>;
  createPickupPoint: (data: { name: string }) => Promise<void>;
  createDestination: (data: { name: string; price: number }) => Promise<void>;
  toggleSeatAvailability: (seatNumber: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const {
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
    authenticateAdmin,
    updatePickupPoint,
    updateDestination,
    createPickupPoint,
    createDestination,
    toggleSeatAvailability,
  } = useSupabase();

  // Check if user is admin by verifying both auth and admin table
  const checkAdminStatus = async (userEmail: string): Promise<boolean> => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('email, id')
        .eq('email', userEmail)
        .maybeSingle();
      
      return !adminError && !!adminData;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  // Simplified auth check
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('Checking auth status...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error:', error.message);
          setIsAdminLoggedIn(false);
          return;
        }
        
        if (session?.user?.email) {
          console.log('Session found, checking admin status...');
          try {
            const isAdmin = await checkAdminStatus(session.user.email);
            setIsAdminLoggedIn(isAdmin);
            console.log('Admin status:', isAdmin);
          } catch (adminCheckError) {
            console.warn('Admin check failed:', adminCheckError);
            setIsAdminLoggedIn(false);
          }
        } else {
          console.log('No active session found');
          setIsAdminLoggedIn(false);
        }
      } catch (err: any) {
        console.error('Auth check error:', err);
        setIsAdminLoggedIn(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        setIsAdminLoggedIn(false);
      } else if (event === 'SIGNED_IN' && session?.user?.email) {
        try {
          const isAdmin = await checkAdminStatus(session.user.email);
          setIsAdminLoggedIn(isAdmin);
        } catch (error) {
          console.warn('Admin check failed in auth listener:', error);
          setIsAdminLoggedIn(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login...');
      const success = await authenticateAdmin(email, password);
      if (success) {
        setIsAdminLoggedIn(true);
        console.log('Login successful');
        return true;
      }
      console.log('Login failed');
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdminLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
      setIsAdminLoggedIn(false);
    }
  };

  // Only show loading for a short time, then show the app regardless
  const isLoading = authLoading && loading;

  return (
    <AppContext.Provider value={{
      pickupPoints,
      destinations,
      bookings,
      seatStatus,
      loading: isLoading,
      error,
      isAdminLoggedIn,
      login,
      logout,
      createBooking,
      updateBookingStatus,
      releaseSeat,
      deleteBooking,
      updatePickupPoint,
      updateDestination,
      createPickupPoint,
      createDestination,
      toggleSeatAvailability,
    }}>
      {children}
    </AppContext.Provider>
  );
};
