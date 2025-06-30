import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Bus, 
  CreditCard, 
  Settings, 
  LogOut,
  Download,
  CheckCircle,
  XCircle,
  BarChart3,
  Trash2,
  Loader2,
  Plus,
  Edit,
  MapPin,
  Navigation,
  DollarSign,
  ToggleLeft, 
  ToggleRight,
  Save,
  X,
  Clock,
  AlertCircle,
  Activity,
  User,
  Shield,
  Calendar,
  TrendingUp,
  Award,
  Star
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import type { BusBooking, SeatStatus, PickupPoint, Destination } from '../types/database';

interface EditingItem {
  id: string;
  type: 'pickup' | 'destination';
  name: string;
  price?: number;
}

interface AdminInfo {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  description: string;
  metadata?: any;
  created_at: string;
  admin?: AdminInfo;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useApp();
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus[]>([] as SeatStatus[]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newItemForm, setNewItemForm] = useState<{ type: 'pickup' | 'destination' | null; name: string; price: number }>({
    type: null,
    name: '',
    price: 0
  });
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Fetch admin info and activities
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all data in parallel with error handling for each request
        const [
          bookingsResponse,
          seatResponse,
          pickupResponse,
          destinationsResponse,
          adminResponse,
          activitiesResponse
        ] = await Promise.all([
          supabase.from('bookings')
            .select('*, pickup_point(*), destination(*)')
            .order('created_at', { ascending: false })
            .then(res => {
              if (res.error) throw res.error;
              return res;
            }),
          supabase.from('seat_status').select('*')
            .then(res => {
              if (res.error) throw res.error;
              return res;
            }),
          supabase.from('pickup_points').select('*')
            .then(res => {
              if (res.error) throw res.error;
              return res;
            }),
          supabase.from('destinations').select('*')
            .then(res => {
              if (res.error) throw res.error;
              return res;
            }),
          fetchAdminInfo().catch(error => {
            console.error('Admin info fetch error:', error);
            return null;
          }),
          fetchActivities().catch(error => {
            console.error('Activities fetch error:', error);
            return [];
          })
        ]);

        setBookings(bookingsResponse.data || []);
        setSeatStatus(seatResponse.data || []);
        setPickupPoints(pickupResponse.data || []);
        setDestinations(destinationsResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleSeatAvailability = async (seatNumber: number) => {
    const { data, error } = await supabase
      .from('seat_status')
      .update({ is_available: !seatStatus.find(s => s.seat_number === seatNumber)?.is_available })
      .eq('seat_number', seatNumber)
      .select();

    if (error) throw error;
    setSeatStatus(prev => prev.map(s => s.seat_number === seatNumber ? data[0] : s));
  };

  const createPickupPoint = async (point: { name: string }) => {
    const { data, error } = await supabase
      .from('pickup_points')
      .insert([{ ...point, active: true }])
      .select();

    if (error) throw error;
    setPickupPoints(prev => [...prev, data[0]]);
  };

  const createDestination = async (dest: { name: string; price: number }) => {
    const { data, error } = await supabase
      .from('destinations')
      .insert([{ ...dest, active: true }])
      .select();

    if (error) throw error;
    setDestinations(prev => [...prev, data[0]]);
  };

  const updatePickupPoint = async (id: string, updates: { name: string }) => {
    const { data, error } = await supabase
      .from('pickup_points')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    setPickupPoints(prev => prev.map(p => p.id === id ? data[0] : p));
  };

  const updateDestination = async (id: string, updates: { name: string; price: number }) => {
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    setDestinations(prev => prev.map(d => d.id === id ? data[0] : d));
  };

  const deletePickupPoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pickup point?')) return;
    
    const { error } = await supabase
      .from('pickup_point')  // Corrected table name
      .delete()
      .eq('id', id);

    if (error) throw error;
    setPickupPoints(prev => prev.filter(p => p.id !== id));
    await logActivity('PICKUP_POINT_DELETED', `Deleted pickup point`, { pickup_point_id: id });
  };

  const deleteDestination = async (id: string) => {
    if (!confirm('Are you sure you want to delete this destination?')) return;
    
    const { error } = await supabase
      .from('destination')  // Corrected table name
      .delete()
      .eq('id', id);

    if (error) throw error;
    setDestinations(prev => prev.filter(d => d.id !== id));
    await logActivity('DESTINATION_DELETED', `Deleted destination`, { destination_id: id });
  };

  const fetchAdminInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (adminData) {
          setAdminInfo(adminData);
        }
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      const { data: activitiesData } = await supabase
        .from('admin_activities')
        .select(`
          *,
          admin:admins(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (activitiesData) {
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const logActivity = async (action: string, description: string, metadata?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('admin_activities')
          .insert([{
            admin_id: user.id,
            action,
            description,
            metadata
          }]);
        
        // Refresh activities
        fetchActivities();
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Enhanced calculations with better data handling
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  
  const totalRevenue = approvedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  
  // Get occupied seats with booking details
  const occupiedSeatsWithDetails = seatStatus
    .filter(s => !s.is_available)
    .map(seat => {
      const booking = bookings.find(b => b.seat_number === seat.seat_number);
      return {
        ...seat,
        booking: booking || null
      };
    })
    .sort((a, b) => a.seat_number - b.seat_number);

  const occupiedSeats = occupiedSeatsWithDetails.length;

  // Get seat occupancy by status
  const approvedSeats = occupiedSeatsWithDetails.filter(s => s.booking?.status === 'approved').length;
  const pendingSeats = occupiedSeatsWithDetails.filter(s => s.booking?.status === 'pending').length;

  const updateBookingStatus = async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status } : b
      ));
    } catch (error) {
      throw error; // Rethrow for error handling in calling function
    }
  };

  const handleApproveBooking = async (id: string) => {
    try {
      setActionLoading(id);
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'approved' } : b
      ));
      
      await logActivity('BOOKING_APPROVED', `Approved booking ${id.slice(0, 8)}`, { booking_id: id });
    } catch (error) {
      alert('Failed to approve booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBooking = async (id: string) => {
    try {
      setActionLoading(id);
      await updateBookingStatus(id, 'cancelled');
      await logActivity('BOOKING_REJECTED', `Rejected booking ${id.slice(0, 8)}`, { booking_id: id });
    } catch (error) {
      alert('Failed to reject booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      try {
        setActionLoading(id);
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Update local state
        setBookings(prev => prev.filter(b => b.id !== id));
        
        await logActivity('BOOKING_DELETED', `Deleted booking ${id.slice(0, 8)}`, { booking_id: id });
      } catch (error) {
        alert('Failed to delete booking');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleEditItem = (item: any, type: 'pickup' | 'destination') => {
    setEditingItem({
      id: item.id,
      type,
      name: item.name,
      price: type === 'destination' ? item.price : undefined
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      setActionLoading(editingItem.id);
      
      if (editingItem.type === 'pickup') {
        await updatePickupPoint(editingItem.id, { name: editingItem.name });
        await logActivity('PICKUP_POINT_UPDATED', `Updated pickup point: ${editingItem.name}`, { 
          pickup_point_id: editingItem.id, 
          name: editingItem.name 
        });
      } else {
        await updateDestination(editingItem.id, { 
          name: editingItem.name, 
          price: editingItem.price! 
        });
        await logActivity('DESTINATION_UPDATED', `Updated destination: ${editingItem.name} (GHS ${editingItem.price})`, { 
          destination_id: editingItem.id, 
          name: editingItem.name, 
          price: editingItem.price 
        });
      }
      
      setEditingItem(null);
    } catch (error) {
      alert(`Failed to update ${editingItem.type} point`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateNew = async () => {
    if (!newItemForm.type || !newItemForm.name) return;
    
    try {
      setActionLoading('new-item');
      
      if (newItemForm.type === 'pickup') {
        await createPickupPoint({ name: newItemForm.name });
        await logActivity('PICKUP_POINT_CREATED', `Created pickup point: ${newItemForm.name}`, { 
          name: newItemForm.name 
        });
      } else {
        await createDestination({ 
          name: newItemForm.name, 
          price: newItemForm.price 
        });
        await logActivity('DESTINATION_CREATED', `Created destination: ${newItemForm.name} (GHS ${newItemForm.price})`, { 
          name: newItemForm.name, 
          price: newItemForm.price 
        });
      }
      
      setNewItemForm({ type: null, name: '', price: 0 });
    } catch (error) {
      alert(`Failed to create ${newItemForm.type} point`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSeat = async (seatNumber: number) => {
    try {
      setActionLoading(`seat-${seatNumber}`);
      await toggleSeatAvailability(seatNumber);
      const seat = seatStatus.find(s => s.seat_number === seatNumber);
      await logActivity('SEAT_TOGGLED', `Toggled seat ${seatNumber} to ${seat?.is_available ? 'unavailable' : 'available'}`, { 
        seat_number: seatNumber, 
        new_status: !seat?.is_available 
      });
    } catch (error) {
      alert('Failed to toggle seat status');
    } finally {
      setActionLoading(null);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + data.map(row => headers.map(header => `"${row[header] || ''}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity('DATA_EXPORTED', `Exported ${filename} data (${data.length} records)`, { 
      filename, 
      record_count: data.length 
    });
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'BOOKING_APPROVED': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'BOOKING_REJECTED': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'BOOKING_DELETED': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'PICKUP_POINT_CREATED':
      case 'PICKUP_POINT_UPDATED': return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'DESTINATION_CREATED':
      case 'DESTINATION_UPDATED': return <Navigation className="w-4 h-4 text-green-600" />;
      case 'SEAT_TOGGLED': return <Bus className="w-4 h-4 text-orange-600" />;
      case 'DATA_EXPORTED': return <Download className="w-4 h-4 text-purple-600" />;
      case 'LOGIN': return <User className="w-4 h-4 text-blue-600" />;
      case 'LOGOUT': return <LogOut className="w-4 h-4 text-gray-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">{bookings.length}</span>
              <div className="text-xs font-medium space-x-1">
                <span className="text-green-600">{approvedBookings.length} approved</span>
                <span className="text-yellow-600">{pendingBookings.length} pending</span>
              </div>
            </div>
          </div>
          <h3 className="text-gray-600 font-medium">Total Bookings</h3>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-green-600">✓ {approvedBookings.length} Approved</span>
            <span className="text-yellow-600">⏳ {pendingBookings.length} Pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{approvedBookings.length}</span>
          </div>
          <h3 className="text-gray-600 font-medium">Approved Bookings</h3>
          <div className="mt-2 text-sm text-gray-500">
            {pendingBookings.length} pending approval
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Bus className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{occupiedSeats}/31</span>
          </div>
          <h3 className="text-gray-600 font-medium">Occupied Seats</h3>
          <div className="mt-2 flex gap-3 text-sm">
            <span className="text-green-600">✓ {approvedSeats}</span>
            <span className="text-yellow-600">⏳ {pendingSeats}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">GHS {totalRevenue.toFixed(2)}</span>
          </div>
          <h3 className="text-gray-600 font-medium">Total Revenue</h3>
          <div className="mt-2 text-sm text-gray-500">
            GHS {pendingRevenue.toFixed(2)} pending
          </div>
        </div>
      </div>

      {/* Seat Occupancy Details */}
      {occupiedSeatsWithDetails.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Occupied Seats Details</h2>
            <p className="text-gray-600 mt-1">Current seat occupancy with booking status</p>
          </div>
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {occupiedSeatsWithDetails.map((seat) => (
                  <tr key={seat.seat_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-800 font-bold text-sm">{seat.seat_number}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {seat.booking?.full_name || seat.passenger_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{seat.booking?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {seat.booking?.pickup_point?.name || 'N/A'} → {seat.booking?.destination?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      GHS {seat.booking?.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {seat.booking ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          seat.booking.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : seat.booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {seat.booking.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {seat.booking.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {seat.booking.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                          {seat.booking.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          No booking
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.booking?.departure_date ? new Date(seat.booking.departure_date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Total Value: <span className="font-semibold text-gray-900">
                  GHS {occupiedSeatsWithDetails.reduce((sum, seat) => sum + (seat.booking?.amount || 0), 0).toFixed(2)}
                </span>
              </span>
              <span className="text-gray-600">
                {occupiedSeatsWithDetails.length} of 31 seats occupied
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium">No bookings yet</p>
                      <p className="text-sm">Bookings will appear here once customers start making reservations</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.slice(0, 5).map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.full_name}</div>
                        <div className="text-sm text-gray-500">{booking.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.pickup_point?.name || 'N/A'} → {booking.destination?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Seat {booking.seat_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GHS {booking.amount?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderApproved = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Approved Bookings</h2>
          <p className="text-gray-600 mt-1">
            {approvedBookings.length} approved • {pendingBookings.length} pending • GHS {totalRevenue.toFixed(2)} revenue
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(
              approvedBookings.map(b => ({
                booking_id: b.id.slice(0, 8),
                name: b.full_name,
                email: b.email,
                phone: b.phone,
                class: b.class,
                pickup: b.pickup_point?.name,
                destination: b.destination?.name,
                seat: b.seat_number,
                amount: b.amount,
                payment_reference: b.payment_reference,
                payment_status: b.payment_status,
                departure_date: b.departure_date,
                booking_date: new Date(b.booking_date).toLocaleDateString(),
                approved_date: new Date(b.updated_at).toLocaleDateString(),
              })),
              'approved-bookings'
            )}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Approved
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {approvedBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No approved bookings yet</h3>
                    <p className="text-gray-600">Approved bookings will appear here with their transaction details.</p>
                  </div>
                </td>
              </tr>
            ) : (
              approvedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.full_name}</div>
                      <div className="text-sm text-gray-500">{booking.class}</div>
                      <div className="text-sm text-gray-500">{booking.email}</div>
                      <div className="text-sm text-gray-500">{booking.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {booking.pickup_point?.name || 'N/A'} → {booking.destination?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Seat {booking.seat_number}</div>
                      <div className="text-sm text-gray-500">{booking.departure_date ? new Date(booking.departure_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-green-600">GHS {booking.amount?.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-gray-500">{booking.payment_status}</div>
                      <div className="text-sm text-gray-500">
                        {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {booking.payment_reference ? (
                        <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded truncate max-w-[120px]">
                          {booking.payment_reference}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No reference</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.payment_status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.payment_status === 'completed' ? '💳 Paid' : '⏳ Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete booking"
                    >
                      {actionLoading === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Bookings</h2>
          <p className="text-gray-600 mt-1">
            {bookings.length} total bookings • GHS {totalRevenue.toFixed(2)} confirmed revenue
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(
              bookings.map(b => ({
                name: b.full_name,
                email: b.email,
                phone: b.phone,
                class: b.class,
                pickup: b.pickup_point?.name,
                destination: b.destination?.name,
                seat: b.seat_number,
                amount: b.amount,
                status: b.status,
                departure_date: b.departure_date,
                booking_date: new Date(b.booking_date).toLocaleDateString(),
              })),
              'bookings'
            )}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-gray-600">When customers make bookings, they will appear here for management.</p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.full_name}</div>
                      <div className="text-sm text-gray-500">{booking.class}</div>
                      <div className="text-sm text-gray-500">{booking.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {booking.pickup_point?.name || 'N/A'} → {booking.destination?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Seat {booking.seat_number}</div>
                      <div className="text-sm text-gray-500">{booking.departure_date ? new Date(booking.departure_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{booking.phone}</div>
                      <div className="text-sm text-gray-500">{booking.contact_person_name}</div>
                      <div className="text-sm text-gray-500">{booking.contact_person_phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">GHS {booking.amount?.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-gray-500">{booking.payment_status}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveBooking(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectBooking(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {actionLoading === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Admin Activity Log</h2>
          <p className="text-gray-600 mt-1">Track all administrative actions and system events</p>
        </div>
        <button
          onClick={fetchActivities}
          disabled={activitiesLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {activitiesLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>
      
      <div className="p-6">
        {activitiesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
            <p className="text-gray-600">Admin activities will appear here as they occur</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <time className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </time>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activity.admin?.full_name || activity.admin?.email || 'Unknown Admin'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {activity.action.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                  {activity.metadata && (
                    <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
                      <pre className="whitespace-pre-wrap font-mono">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-6">
      {/* Pickup Points Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pickup Points</h2>
            </div>
            <button
              onClick={() => setNewItemForm({ type: 'pickup', name: '', price: 0 })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Pickup Point
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Add New Pickup Point Form */}
          {newItemForm.type === 'pickup' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Point Name</label>
                  <input
                    type="text"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter pickup point name"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateNew}
                    disabled={!newItemForm.name || actionLoading === 'new-item'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === 'new-item' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => setNewItemForm({ type: null, name: '', price: 0 })}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {pickupPoints.map((point) => (
              <div key={point.id} className="border border-gray-200 rounded-lg p-4">
                {editingItem?.id === point.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={actionLoading === point.id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === point.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{point.name}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            point.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {point.active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(point.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Associated bookings: {bookings.filter(b => b.pickup_point_id === point.id).length}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditItem(point, 'pickup')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePickupPoint(point.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Destinations Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Destinations</h2>
            </div>
            <button
              onClick={() => setNewItemForm({ type: 'destination', name: '', price: 0 })}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Destination
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Add New Destination Form */}
          {newItemForm.type === 'destination' && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination Name</label>
                  <input
                    type="text"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter destination name"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (GHS)</label>
                  <input
                    type="number"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateNew}
                    disabled={!newItemForm.name || newItemForm.price <= 0 || actionLoading === 'new-item'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === 'new-item' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => setNewItemForm({ type: null, name: '', price: 0 })}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinations.map((destination) => (
              <div key={destination.id} className="border border-gray-200 rounded-lg p-4">
                {editingItem?.id === destination.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={editingItem.price || 0}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Price (GHS)"
                      min="0"
                      step="0.01"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={actionLoading === destination.id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === destination.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{destination.name}</h3>
                      <p className="text-lg font-bold text-green-600">GHS {destination.price}</p>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            destination.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {destination.active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(destination.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Associated bookings: {bookings.filter(b => b.destination_id === destination.id).length}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditItem(destination, 'destination')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDestination(destination.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seat Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Seat Management</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {seatStatus.map((seat) => (
              <div key={seat.id} className="flex flex-col items-center">
                <button
                  onClick={() => handleToggleSeat(seat.seat_number)}
                  disabled={actionLoading === `seat-${seat.seat_number}`}
                  className={`w-12 h-12 rounded-lg border-2 font-bold text-sm transition-all duration-200 flex items-center justify-center ${
                    seat.is_available
                      ? 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200'
                  } disabled:opacity-50`}
                >
                  {actionLoading === `seat-${seat.seat_number}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    seat.seat_number
                  )}
                </button>
                <div className="mt-1 flex items-center">
                  {seat.is_available ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {seat.is_available ? 'Available' : 'Blocked'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Seat Management Instructions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Click on any seat to toggle its availability</li>
              <li>• Green seats are available for booking</li>
              <li>• Red seats are blocked and cannot be booked</li>
              <li>• Use this to temporarily disable problematic seats</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Loading Admin Dashboard</h2>
        <p className="text-gray-600 max-w-md text-center">
          Loading transportation data, bookings, and system configuration...
        </p>
        <div className="h-1.5 w-48 bg-blue-100 rounded-full overflow-hidden">
          <div className="w-full h-full bg-blue-600 animate-progress origin-left" 
               style={{animation: 'progress 2s ease-in-out infinite'}} />
        </div>
        <p className="text-sm text-gray-500 mt-4">
          This may take a moment. Please don't close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Beautiful Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 max-w-[100vw]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full animate-pulse" />
        <div className="absolute top-32 right-20 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-pulse delay-2000" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-2xl shadow-2xl">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-green-500 w-5 h-5 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Admin Portal
                </h1>
                <p className="text-blue-100 text-lg font-light mt-1">
                  Khompatek Transport Service Management
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white font-medium text-sm">🛡️ Secure Access</span>
                  </div>
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white font-medium text-sm">📊 Real-time Data</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Admin Info and Actions */}
            <div className="flex items-center gap-4">
              {/* Admin Info Card */}
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                <div className="flex items-center gap-3">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {adminInfo?.full_name || 'Admin User'}
                    </p>
                    <p className="text-blue-100 text-sm">
                      {adminInfo?.email || 'admin@khompatek.com'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-100 text-xs">Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-4">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-white font-bold text-lg">{bookings.length}</div>
                  <div className="text-blue-100 text-xs">Bookings</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-white font-bold text-lg">{approvedBookings.length}</div>
                  <div className="text-blue-100 text-xs">Approved</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-white font-bold text-lg">GHS {totalRevenue.toFixed(0)}</div>
                  <div className="text-blue-100 text-xs">Revenue</div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="bg-red-500 bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-red-400 border-opacity-30 hover:bg-red-500 hover:bg-opacity-30 transition-all duration-200 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-300" />
                <span className="text-white font-semibold text-sm">Performance</span>
              </div>
              <div className="text-green-300 text-xs">Excellent</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-300" />
                <span className="text-white font-semibold text-sm">Efficiency</span>
              </div>
              <div className="text-yellow-300 text-xs">98.5%</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-4 h-4 text-blue-300" />
                <span className="text-white font-semibold text-sm">Rating</span>
              </div>
              <div className="text-blue-300 text-xs">4.9/5</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-300" />
                <span className="text-white font-semibold text-sm">Uptime</span>
              </div>
              <div className="text-purple-300 text-xs">99.9%</div>
            </div>
          </div>
        </div>
        
        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 sm:h-12">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor" className="text-gray-50"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor" className="text-gray-50"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor" className="text-gray-50"></path>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap gap-x-8 px-4 sm:px-0">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'bookings', label: 'Bookings', icon: Bus },
                { key: 'approved', label: 'Approved', icon: CheckCircle },
                { key: 'activity', label: 'Activity', icon: Activity },
                { key: 'management', label: 'Management', icon: Settings },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'approved' && renderApproved()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'management' && renderManagement()}
      </div>
    </div>
  );
};

export default AdminDashboard;
