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
// 在现有 import 语句之后添加这些接口定义
interface BusBooking {
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

interface SeatStatus {
  id: string;
  seat_number: number;
  is_available: boolean;
  passenger_name?: string;
}

interface PickupPoint {
  id: string;
  name: string;
  active: boolean;
}

interface Destination {
  id: string;
  name: string;
  price: number;
  active: boolean;
}


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
  const [seatStatus, setSeatStatus] = useState<SeatStatus[]>([]);
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
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [
          { data: pendingBookingsData }, // Fetch pending bookings separately
          { data: approvedBookingsData }, // Fetch approved bookings separately
          { data: seatData },
          { data: pickupData },
          { data: destinationsData },
          adminInfo,
          activities
        ] = await Promise.all([
          supabase.from('bookings')
            .select(`
              *,
              pickup_point:pickup_points(*),
              destination:destinations(*)
            `)
            .eq('status', 'pending') // Filter for pending status
            .order('created_at', { ascending: false }),

          supabase.from('bookings')
            .select(`
              *,
              pickup_point:pickup_points(*),
              destination:destinations(*)
            `)
            .eq('status', 'approved') // Filter for approved status
            .order('created_at', { ascending: false }),

          supabase.from('seat_status').select('*'),
          supabase.from('pickup_points').select('*'),
          supabase.from('destinations').select('*'),
          fetchAdminInfo(),
          fetchActivities()
        ]);

        // Combine or set pending and approved bookings separately as needed
        // For now, let's combine them to maintain the existing structure for other tabs
        setBookings([...(pendingBookingsData || []), ...(approvedBookingsData || [])]); 
        
        setSeatStatus(seatData || []);
        setPickupPoints(pickupData || []);
        setDestinations(destinationsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
  const occupiedSeatsWithDetails = bookings
    .map(booking => {
      const seat = seatStatus.find(s => s.seat_number === booking.seat_number);
      return {
        ...(seat || { id: '', seat_number: booking.seat_number, is_available: false }),
        booking: booking,
        passenger_name: booking.full_name
      };
    })
    .sort((a, b) => a.seat_number - b.seat_number);

  // Get seat counts by status
  const approvedSeats = occupiedSeatsWithDetails.filter(s => s.booking?.status === 'approved').length;
  const pendingSeats = occupiedSeatsWithDetails.filter(s => s.booking?.status === 'pending').length;
  const occupiedSeats = occupiedSeatsWithDetails.length;

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

  // 在 handleRejectBooking 函数之后添加这些函数实现
const updateBookingStatus = async (id: string, status: 'cancelled') => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
  
  setBookings(prev => prev.map(b => 
    b.id === id ? { ...b, status } : b
  ));
};

const updatePickupPoint = async (id: string, data: { name: string }) => {
  const { error } = await supabase
    .from('pickup_points')
    .update(data)
    .eq('id', id);

  if (error) throw error;
  
  setPickupPoints(prev => prev.map(p => 
    p.id === id ? { ...p, ...data } : p
  ));
};

const updateDestination = async (id: string, data: { name: string; price: number }) => {
  const { error } = await supabase
    .from('destinations')
    .update(data)
    .eq('id', id);

  if (error) throw error;
  
  setDestinations(prev => prev.map(d => 
    d.id === id ? { ...d, ...data } : d
  ));
};

const createPickupPoint = async (data: { name: string }) => {
  const { data: newPoint, error } = await supabase
    .from('pickup_points')
    .insert([{ ...data, active: true }])
    .select()
    .single();

  if (error) throw error;
  
  if (newPoint) {
    setPickupPoints(prev => [...prev, newPoint]);
  }
};

const createDestination = async (data: { name: string; price: number }) => {
  const { data: newDestination, error } = await supabase
    .from('destinations')
    .insert([{ ...data, active: true }])
    .select()
    .single();

  if (error) throw error;
  
  if (newDestination) {
    setDestinations(prev => [...prev, newDestination]);
  }
};

const toggleSeatAvailability = async (seatNumber: number) => {
  const seat = seatStatus.find(s => s.seat_number === seatNumber);
  if (!seat) throw new Error('Seat not found');

  const { error } = await supabase
    .from('seat_status')
    .update({ is_available: !seat.is_available })
    .eq('seat_number', seatNumber);

  if (error) throw error;
  
  setSeatStatus(prev => prev.map(s => 
    s.seat_number === seatNumber 
      ? { ...s, is_available: !s.is_available }
      : s
  ));
};

const deletePickupPoint = async (id: string) => {
  if (confirm('Are you sure you want to delete this pickup point?')) {
    try {
      const { error } = await supabase
        .from('pickup_points')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error); // 添加这行
        throw error;
      }
      
      setPickupPoints(prev => prev.filter(p => p.id !== id));
      await logActivity('PICKUP_POINT_DELETED', `Deleted pickup point`, { pickup_point_id: id });
    } catch (error) {
      alert('Failed to delete pickup point');
    }
  }
};

const deleteDestination = async (id: string) => {
  if (confirm('Are you sure you want to delete this destination?')) {
    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDestinations(prev => prev.filter(d => d.id !== id));
      await logActivity('DESTINATION_DELETED', `Deleted destination`, { destination_id: id });
    } catch (error) {
      alert('Failed to delete destination');
    }
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
      case 'BOOKING_REJECTED': 
      case 'BOOKING_CANCELLED': return <XCircle className="w-4 h-4 text-red-600" />;
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
            <span className="text-2xl font-bold text-gray-900">{bookings.length}</span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> {/* New Column */}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {seat.booking && seat.booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveBooking(seat.booking!.id)}
                            disabled={actionLoading === seat.booking.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Approve booking"
                          >
                            {actionLoading === seat.booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectBooking(seat.booking!.id)}
                            disabled={actionLoading === seat.booking.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Reject booking"
                          >
                            {actionLoading === seat.booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                      {seat.booking && seat.booking.status === 'approved' && (
                        <button
                          onClick={() => handleRejectBooking(seat.booking!.id)}
                          disabled={actionLoading === seat.booking.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Cancel approved booking"
                        >
                          {actionLoading === seat.booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {/* Optionally add a delete button for all statuses if needed, similar to other tables */}
                       {seat.booking && (
                         <button
                          onClick={() => handleDeleteBooking(seat.booking!.id)}
                          disabled={actionLoading === seat.booking.id}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          title="Delete booking"
                        >
                          {actionLoading === seat.booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                       )}
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

  const renderPending = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-yellow-600" />
            Pending Bookings Awaiting Approval
          </h2>
          <p className="text-gray-600 mt-1">
            {pendingBookings.length} bookings requiring approval • GHS {pendingRevenue.toFixed(2)} potential revenue
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(
              pendingBookings.map(b => ({
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
                contact_person_name: b.contact_person_name,
                contact_person_phone: b.contact_person_phone,
              })),
              'pending-bookings'
            )}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Pending
          </button>
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-yellow-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Passenger Details
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Journey Details
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Emergency Contact
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Info
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Status & Time
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-16 h-16 text-green-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-600">No pending bookings require approval at this time.</p>
                    <p className="text-sm text-gray-500 mt-2">New bookings will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pendingBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-yellow-50 transition-colors">
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-900">{booking.full_name}</div>
                      <div className="text-sm text-gray-600">{booking.class}</div>
                      <div className="text-sm text-blue-600 hover:text-blue-800">
                        <a href={`mailto:${booking.email}`}>{booking.email}</a>
                      </div>
                      <div className="text-sm text-green-600 hover:text-green-800">
                        <a href={`tel:${booking.phone}`}>{booking.phone}</a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <span className="text-blue-600">{booking.pickup_point?.name || 'N/A'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600">{booking.destination?.name || 'N/A'}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Bus className="w-3 h-3" />
                        <span>Seat {booking.seat_number}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{booking.departure_date ? new Date(booking.departure_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.contact_person_name || 'Not provided'}
                      </div>
                      <div className="text-sm text-green-600 hover:text-green-800">
                        {booking.contact_person_phone ? (
                          <a href={`tel:${booking.contact_person_phone}`}>{booking.contact_person_phone}</a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-green-600">
                        GHS {booking.amount?.toFixed(2) || '0.00'}
                      </div>
                      <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                        booking.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.payment_status === 'completed' ? '✅ Paid' : '⏳ Pending Payment'}
                      </div>
                      {booking.payment_reference && (
                        <div className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded truncate max-w-[100px]">
                          {booking.payment_reference.slice(0, 12)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        <Clock className="w-4 h-4 mr-2" />
                        Pending Approval
                      </span>
                      <div className="text-xs text-gray-500">
                        Booked: {new Date(booking.booking_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={() => handleApproveBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Approve booking"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Approve</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Reject booking"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Reject</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete booking"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            <span className="text-xs">Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pendingBookings.length > 0 && (
        <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                <strong>{pendingBookings.length}</strong> bookings awaiting approval
              </span>
              <span className="text-gray-700">
                Potential Revenue: <strong className="text-green-600">GHS {pendingRevenue.toFixed(2)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>Review each booking carefully before approval</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderApproved = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Approved Bookings</h2>
          <p className="text-gray-600 mt-1">
            {approvedBookings.length} approved bookings • GHS {totalRevenue.toFixed(2)} total revenue
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
                        <CheckCircle className="w-3 h-3 mr-1" /> Approved
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
          <h2 className="text-xl font-semibold text-gray-900">Recent Admin Activity</h2>
          <p className="text-gray-600 mt-1">
            Overview of recent actions taken by administrators.
          </p>
        </div>
        <button
          onClick={fetchActivities}
          disabled={activitiesLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {activitiesLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          Refresh Activity
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.length === 0 && !activitiesLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Activity className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600">Admin actions will be logged here.</p>
                  </div>
                </td>
              </tr>
            ) : activitiesLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <p className="mt-4 text-gray-600">Loading activities...</p>
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.action)}
                      <span className="text-sm font-medium text-gray-900">
                        {activity.admin?.full_name || 'Unknown Admin'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {activity.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-6">
      {/* Pickup Points Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Pickup Points Management</h2>
          <button
            onClick={() => setNewItemForm({ type: 'pickup', name: '', price: 0 })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Pickup Point
          </button>
        </div>
        <div className="p-6">
          {newItemForm.type === 'pickup' && (
            <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50 flex items-center gap-4">
              <input
                type="text"
                placeholder="New Pickup Point Name"
                value={newItemForm.name}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleCreateNew}
                disabled={actionLoading === 'new-item' || !newItemForm.name}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'new-item' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setNewItemForm({ type: null, name: '', price: 0 })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pickupPoints.map((point) => (
                <tr key={point.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem?.id === point.id && editingItem.type === 'pickup' ? (
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{point.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      point.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {point.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingItem?.id === point.id && editingItem.type === 'pickup' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={actionLoading === point.id || !editingItem.name}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {actionLoading === point.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditItem(point, 'pickup')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePickupPoint(point.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destinations Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Destinations Management</h2>
          <button
            onClick={() => setNewItemForm({ type: 'destination', name: '', price: 0 })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Destination
          </button>
        </div>
        <div className="p-6">
          {newItemForm.type === 'destination' && (
            <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50 flex items-center gap-4">
              <input
                type="text"
                placeholder="New Destination Name"
                value={newItemForm.name}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="Price"
                value={newItemForm.price}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-24 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleCreateNew}
                disabled={actionLoading === 'new-item' || !newItemForm.name || newItemForm.price <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'new-item' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setNewItemForm({ type: null, name: '', price: 0 })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (GHS)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {destinations.map((destination) => (
                <tr key={destination.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem?.id === destination.id && editingItem.type === 'destination' ? (
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{destination.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem?.id === destination.id && editingItem.type === 'destination' ? (
                      <input
                        type="number"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                        className="w-24 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">GHS {destination.price?.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      destination.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {destination.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingItem?.id === destination.id && editingItem.type === 'destination' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={actionLoading === destination.id || !editingItem.name || editingItem.price! <= 0}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {actionLoading === destination.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditItem(destination, 'destination')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDestination(destination.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seat Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Seat Management</h2>
          <p className="text-gray-600 mt-1">Toggle seat availability. Total 31 seats.</p>
        </div>
        <div className="p-6 grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((seatNumber) => {
            const seat = seatStatus.find(s => s.seat_number === seatNumber);
            const isAvailable = seat ? seat.is_available : true; // Default to available if not found
            
            return (
              <button
                key={seatNumber}
                onClick={() => handleToggleSeat(seatNumber)}
                disabled={actionLoading === `seat-${seatNumber}`}
                className={`relative w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-200 
                  ${isAvailable 
                    ? 'bg-green-200 text-green-800 hover:bg-green-300' 
                    : 'bg-red-200 text-red-800 hover:bg-red-300'}
                  ${actionLoading === `seat-${seatNumber}` ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                title={isAvailable ? `Seat ${seatNumber} (Available)` : `Seat ${seatNumber} (Occupied)`}
              >
                {actionLoading === `seat-${seatNumber}` ? (
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                ) : (
                  <>
                    {seatNumber}
                    {isAvailable ? (
                      <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-white rounded-full" />
                    ) : (
                      <XCircle className="absolute -top-1 -right-1 w-4 h-4 text-red-600 bg-white rounded-full" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            {adminInfo && (
              <span className="text-gray-700 text-sm font-medium">
                Welcome, {adminInfo.full_name}
              </span>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6">
            <nav className="-mb-px flex flex-wrap gap-x-8 px-4 sm:px-0">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'pending', label: `Pending (${pendingBookings.length})`, icon: Clock },
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
        {activeTab === 'pending' && renderPending()}
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'approved' && renderApproved()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'management' && renderManagement()}
      </main>
    </div>
  );
};

export default AdminDashboard;
