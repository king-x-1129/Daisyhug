import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, increment, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, OrderStatus, UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, User, Phone, MapPin, Package, CreditCard, Calendar, History, AlertCircle, CheckSquare, XCircle, Truck, CheckCircle2, Circle, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { OrderTracker } from '@/components/OrderTracker';
import { COURIER_OPTIONS } from '@/lib/courierTracking';

export function OrderManagement() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Cancellation state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isBulkCancel, setIsBulkCancel] = useState(false);
  
  // Bulk confirmation state
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<OrderStatus | null>(null);

  // Tracking Info state
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [orderToShip, setOrderToShip] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [isShipping, setIsShipping] = useState(false);

  const [isBulkShipping, setIsBulkShipping] = useState(false);

  // Resellers data for mapping IDs to names
  const [resellers, setResellers] = useState<UserProfile[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [resellerSearch, setResellerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'reseller'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setResellers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerPhone.includes(searchLower) ||
        order.customerCity.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // Reseller filter
      if (resellerSearch) {
        const resellerSearchLower = resellerSearch.toLowerCase();
        const reseller = resellers.find(r => r.uid === order.resellerId);
        const resellerName = reseller ? reseller.fullName.toLowerCase() : 'direct customer';
        const matchesReseller = 
          (order.resellerId && order.resellerId.toLowerCase().includes(resellerSearchLower)) ||
          resellerName.includes(resellerSearchLower);
        
        if (!matchesReseller) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Date range filter
      if (startDate || endDate) {
        const orderDate = parseISO(order.createdAt);
        const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
        const end = endDate ? endOfDay(new Date(endDate)) : new Date(8640000000000000);
        
        if (!isWithinInterval(orderDate, { start, end })) return false;
      }

      return true;
    });
  }, [orders, search, resellerSearch, statusFilter, startDate, endDate, resellers]);

  const handleStatusChange = async (order: Order, newStatus: OrderStatus, cancellationNote?: string, trackingData?: { trackingNumber: string, carrier: string }) => {
    if (newStatus === order.status && !trackingData) return;

    try {
      const orderRef = doc(db, 'orders', order.id);

      // Construct userRef and update ledger only if resellerId exists
      if (order.resellerId) {
        const userRef = doc(db, 'users', order.resellerId);
        const isTerminalReturn = newStatus === 'Returned' || newStatus === 'Refused';
        const wasTerminalReturn = order.status === 'Returned' || order.status === 'Refused';

        // 1. Logic for 'Delivered' status (Profit becomes pending)
        if (newStatus === 'Delivered' && order.status !== 'Delivered') {
          await updateDoc(userRef, {
            pendingProfit: increment(order.profit)
          });
        } 
        // 2. Logic for 'Returned' or 'Refused' status
        else if (isTerminalReturn && !wasTerminalReturn) {
          if (order.status === 'Delivered') {
            // If it was delivered, deduct both profit and shipping
            await updateDoc(userRef, {
              pendingProfit: increment(-order.profit),
              walletBalance: increment(-order.shippingCost)
            });
          } else {
            // If it was never delivered, only deduct shipping
            await updateDoc(userRef, {
              walletBalance: increment(-order.shippingCost)
            });
          }
        }
        // 3. Logic for reversing 'Delivered' status (if admin changes it back to Shipped/Packed)
        else if (order.status === 'Delivered' && newStatus !== 'Delivered' && !isTerminalReturn) {
          await updateDoc(userRef, {
            pendingProfit: increment(-order.profit)
          });
        }
      }

      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: cancellationNote || (trackingData ? `Order shipped via ${trackingData.carrier} (Tracking: ${trackingData.trackingNumber})` : `Status updated to ${newStatus}`)
          }
        ]
      };

      if (trackingData) {
        updateData.trackingNumber = trackingData.trackingNumber;
        updateData.carrier = trackingData.carrier;
      }

      if (newStatus === 'Cancelled' && cancellationNote) {
        updateData.cancellationNote = cancellationNote;
      } else if (newStatus !== 'Cancelled') {
        // Clear cancellation note if moving away from Cancelled status
        updateData.cancellationNote = null;
      }

      await updateDoc(orderRef, updateData);
      
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleShipOrder = async () => {
    if ((!orderToShip && !isBulkShipping) || !trackingNumber.trim() || !carrier.trim()) {
      toast.error("Please provide tracking number and carrier");
      return;
    }

    setIsShipping(true);
    try {
      if (isBulkShipping) {
        const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
        const batch = writeBatch(db);
        
        for (const order of selectedOrders) {
          const orderRef = doc(db, 'orders', order.id);
          
          batch.update(orderRef, {
            status: 'Shipped',
            carrier,
            trackingNumber,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...(order.statusHistory || []),
              {
                status: 'Shipped',
                timestamp: new Date().toISOString(),
                note: `Bulk shipped via ${carrier} (Tracking: ${trackingNumber})`
              }
            ]
          });
        }
        
        await batch.commit();
        toast.success(`Bulk shipping update completed`);
        setSelectedOrderIds(new Set());
      } else if (orderToShip) {
        await handleStatusChange(orderToShip, 'Shipped', undefined, { trackingNumber, carrier });
      }
      
      setIsTrackingDialogOpen(false);
      setOrderToShip(null);
      setTrackingNumber('');
      setCarrier('');
      setIsBulkShipping(false);
    } catch (error) {
      console.error("Shipping update error:", error);
      toast.error("Failed to update shipping info");
    } finally {
      setIsShipping(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrderIds.size === 0) return;
    
    if (newStatus === 'Cancelled') {
      setIsBulkCancel(true);
      setIsCancelDialogOpen(true);
      return;
    }

    if (newStatus === 'Shipped') {
      setIsBulkShipping(true);
      setIsTrackingDialogOpen(true);
      return;
    }

    setBulkTargetStatus(newStatus);
    setIsBulkConfirmOpen(true);
  };

  const executeBulkStatusChange = async () => {
    if (!bulkTargetStatus) return;
    
    setIsBulkProcessing(true);
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const batch = writeBatch(db);
    
    try {
      for (const order of selectedOrders) {
        const orderRef = doc(db, 'orders', order.id);

        if (order.resellerId) {
          const userRef = doc(db, 'users', order.resellerId);
          const isTerminalReturn = bulkTargetStatus === 'Returned' || bulkTargetStatus === 'Refused';
          const wasTerminalReturn = order.status === 'Returned' || order.status === 'Refused';

          // 1. Logic for 'Delivered' status
          if (bulkTargetStatus === 'Delivered' && order.status !== 'Delivered') {
            batch.update(userRef, { pendingProfit: increment(order.profit) });
          } 
          // 2. Logic for 'Returned' or 'Refused' status
          else if (isTerminalReturn && !wasTerminalReturn) {
            if (order.status === 'Delivered') {
              batch.update(userRef, {
                pendingProfit: increment(-order.profit),
                walletBalance: increment(-order.shippingCost)
              });
            } else {
              batch.update(userRef, { walletBalance: increment(-order.shippingCost) });
            }
          }
          // 3. Logic for reversing 'Delivered' status
          else if (order.status === 'Delivered' && bulkTargetStatus !== 'Delivered' && !isTerminalReturn) {
            batch.update(userRef, { pendingProfit: increment(-order.profit) });
          }
        }

        const updateData: any = { 
          status: bulkTargetStatus,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...(order.statusHistory || []),
            {
              status: bulkTargetStatus,
              timestamp: new Date().toISOString(),
              note: `Bulk status update to ${bulkTargetStatus}`
            }
          ]
        };

        if (bulkTargetStatus !== 'Cancelled') {
          updateData.cancellationNote = null;
        }

        batch.update(orderRef, updateData);
      }
      
      await batch.commit();
      toast.success(`Bulk update to ${bulkTargetStatus} completed`);
      setSelectedOrderIds(new Set());
      setIsBulkConfirmOpen(false);
      setBulkTargetStatus(null);
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Bulk update failed");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    
    try {
      if (isBulkCancel) {
        const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
        for (const order of selectedOrders) {
          const orderRef = doc(db, 'orders', order.id);

          // If cancelling a delivered order, reverse profit
          if (order.status === 'Delivered' && order.resellerId) {
            const userRef = doc(db, 'users', order.resellerId);
            batch.update(userRef, { pendingProfit: increment(-order.profit) });
          }

          batch.update(orderRef, {
            status: 'Cancelled',
            cancellationNote: cancelReason,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...(order.statusHistory || []),
              {
                status: 'Cancelled',
                timestamp: new Date().toISOString(),
                note: cancelReason
              }
            ]
          });
        }
        await batch.commit();
        toast.success(`Bulk cancellation completed`);
        setSelectedOrderIds(new Set());
      } else if (orderToCancel) {
        await handleStatusChange(orderToCancel, 'Cancelled', cancelReason);
      }
      
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
      setCancelReason('');
      setIsBulkCancel(false);
    } catch (error) {
      console.error("Cancellation error:", error);
      toast.error("Cancellation failed");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOrderIds(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Confirmed': 'bg-blue-100 text-blue-700',
      'Shipped': 'bg-indigo-100 text-indigo-700',
      'Delivered': 'bg-emerald-100 text-emerald-700',
      'Returned': 'bg-rose-100 text-rose-700',
      'Refused': 'bg-rose-100 text-rose-700',
      'Cancelled': 'bg-slate-100 text-slate-500',
    };
    return <Badge className={`${colors[status] || 'bg-slate-100'} border-none rounded-full px-3`}>{status}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Order Management</h1>
        <p className="text-slate-500">Process orders and manage returns</p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Order ID, Customer, Phone, City..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl h-11 border-slate-100 bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reseller</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Name or ID..." 
                  value={resellerSearch}
                  onChange={(e) => setResellerSearch(e.target.value)}
                  className="pl-10 rounded-xl h-11 border-slate-100 bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl h-11 border-slate-100 bg-slate-50/50">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Packed">Packed</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Refused">Refused</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Range</Label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl h-11 border-slate-100 bg-slate-50/50"
                />
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl h-11 border-slate-100 bg-slate-50/50"
                />
                {(search || resellerSearch || statusFilter !== 'all' || startDate || endDate) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setSearch('');
                      setResellerSearch('');
                      setStatusFilter('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="h-11 w-11 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-bold">Order ID</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Reseller</TableHead>
              <TableHead className="font-bold">Price</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  No orders found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow 
                  key={order.id} 
                  className={`cursor-pointer transition-colors ${selectedOrderIds.has(order.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsDetailOpen(true);
                  }}
                >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedOrderIds.has(order.id)}
                    onCheckedChange={() => toggleSelectOrder(order.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <p className="font-bold text-slate-900">{order.customerName}</p>
                  <p className="text-xs text-slate-500">{order.customerPhone}</p>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {order.resellerId ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">
                        {resellers.find(r => r.uid === order.resellerId)?.fullName || 'Loading...'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {order.resellerId.slice(0, 8)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Direct Customer</span>
                  )}
                </TableCell>
                <TableCell className="font-bold">{formatPrice(order.sellingPrice)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {getStatusBadge(order.status)}
                    {order.trackingNumber && (
                      <div className="flex items-center gap-1 mt-1">
                        <Truck className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[100px]">
                          {order.trackingNumber}
                        </span>
                      </div>
                    )}
                    {order.cancellationNote && (
                      <span className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate" title={order.cancellationNote}>
                        Reason: {order.cancellationNote}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailOpen(true);
                      }}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Select onValueChange={(val: OrderStatus) => {
                      if (val === 'Cancelled') {
                        setOrderToCancel(order);
                        setIsBulkCancel(false);
                        setIsCancelDialogOpen(true);
                      } else if (val === 'Shipped') {
                        setOrderToShip(order);
                        setTrackingNumber(order.trackingNumber || '');
                        setCarrier(order.carrier || 'TCS');
                        setIsTrackingDialogOpen(true);
                      } else {
                        handleStatusChange(order, val);
                      }
                    }}>
                      <SelectTrigger className="w-[120px] rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Update" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Packed">Packed</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Returned">Returned</SelectItem>
                        <SelectItem value="Refused">Refused</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    {(order.status === 'Confirmed' || order.status === 'Packed') && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setOrderToShip(order);
                          setTrackingNumber(order.trackingNumber || '');
                          setCarrier(order.carrier || 'TCS');
                          setIsTrackingDialogOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-3 text-xs font-bold"
                      >
                        <Truck className="w-3 h-3 mr-1" /> Ship
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedOrderIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-800"
          >
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              <span className="font-bold">{selectedOrderIds.size} Orders Selected</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center space-x-3">
              <Button 
                disabled={isBulkProcessing}
                onClick={() => handleBulkStatusChange('Shipped')}
                className="bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl px-4 text-sm font-bold"
              >
                <Truck className="w-4 h-4 mr-2" /> Mark Shipped
              </Button>
              <Button 
                disabled={isBulkProcessing}
                onClick={() => handleBulkStatusChange('Cancelled')}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 h-10 rounded-xl px-4 text-sm font-bold text-rose-400"
              >
                <XCircle className="w-4 h-4 mr-2" /> Cancel Orders
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedOrderIds(new Set())}
                className="text-slate-400 hover:text-white h-10 rounded-xl px-4 text-sm font-bold"
              >
                Deselect
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl rounded-3xl overflow-hidden p-0">
          {selectedOrder && (
            <>
              <DialogHeader className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900">Order Details</DialogTitle>
                    <DialogDescription className="font-mono text-xs mt-1">
                      Order ID: #{selectedOrder.id}
                    </DialogDescription>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    {getStatusBadge(selectedOrder.status)}
                    {selectedOrder.carrier && (
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {selectedOrder.carrier}
                        </Badge>
                        {selectedOrder.trackingNumber && (
                          <span className="text-[10px] font-mono text-slate-500 mt-1">
                            Tracking: {selectedOrder.trackingNumber}
                          </span>
                        )}
                      </div>
                    )}
                    <Select value={selectedOrder.status} onValueChange={(val: OrderStatus) => {
                      if (val === 'Cancelled') {
                        setOrderToCancel(selectedOrder);
                        setIsBulkCancel(false);
                        setIsCancelDialogOpen(true);
                      } else if (val === 'Shipped') {
                        setOrderToShip(selectedOrder);
                        setTrackingNumber(selectedOrder.trackingNumber || '');
                        setCarrier(selectedOrder.carrier || 'TCS');
                        setIsTrackingDialogOpen(true);
                      } else {
                        handleStatusChange(selectedOrder, val);
                      }
                    }}>
                      <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Packed">Packed</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Returned">Returned</SelectItem>
                        <SelectItem value="Refused">Refused</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Last updated: {format(parseISO(selectedOrder.updatedAt), 'MMM dd, HH:mm')}
                    </p>
                    {(selectedOrder.status === 'Confirmed' || selectedOrder.status === 'Packed' || selectedOrder.status === 'Shipped') && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setOrderToShip(selectedOrder);
                          setTrackingNumber(selectedOrder.trackingNumber || '');
                          setCarrier(selectedOrder.carrier || 'TCS');
                          setIsTrackingDialogOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-4 text-xs font-bold mt-2"
                      >
                        <Truck className="w-4 h-4 mr-2" /> 
                        {selectedOrder.status === 'Shipped' ? 'Edit Tracking' : 'Ship Order'}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Progress Step Indicator */}
                <div className="pb-8 border-b">
                  <div className="relative flex justify-between items-center max-w-2xl mx-auto">
                    {/* Line Background */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                    
                    {/* Active Line */}
                    {(() => {
                      const steps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
                      const currentStepIndex = steps.indexOf(selectedOrder.status);
                      const isTerminal = ['Returned', 'Refused', 'Cancelled'].includes(selectedOrder.status);
                      
                      if (isTerminal || currentStepIndex < 0) return null;
                      
                      return (
                        <div 
                          className="absolute top-4 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500" 
                          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        />
                      );
                    })()}

                    {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'].map((step, index) => {
                      const steps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
                      const currentStepIndex = steps.indexOf(selectedOrder.status);
                      const isTerminal = ['Returned', 'Refused', 'Cancelled'].includes(selectedOrder.status);
                      const isCompleted = !isTerminal && index <= currentStepIndex;
                      const isActive = !isTerminal && index === currentStepIndex;
                      
                      return (
                        <div key={step} className="relative z-10 flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                              : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                          </div>
                          <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${
                            isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {['Returned', 'Refused', 'Cancelled'].includes(selectedOrder.status) && (
                    <div className="mt-6 flex justify-center">
                      <Badge className="bg-rose-100 text-rose-700 border-none rounded-full px-4 py-1 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Order is {selectedOrder.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Customer & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <User className="w-4 h-4 mr-2" /> Customer Info
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center text-slate-900">
                        <span className="font-bold mr-2">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center text-slate-600 text-sm">
                        <Phone className="w-3 h-3 mr-2 text-slate-400" />
                        {selectedOrder.customerPhone}
                      </div>
                      <div className="flex items-start text-slate-600 text-sm">
                        <MapPin className="w-3 h-3 mr-2 mt-1 text-slate-400" />
                        <span>
                          {selectedOrder.customerAddress}<br />
                          <span className="font-bold">{selectedOrder.customerCity}</span>
                        </span>
                      </div>
                      {selectedOrder.trackingNumber && (
                        <div className="pt-3 mt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Tracking Information</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{selectedOrder.carrier}</span>
                            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{selectedOrder.trackingNumber}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <Calendar className="w-4 h-4 mr-2" /> Order Timeline
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Placed On:</span>
                        <span className="font-medium">{format(parseISO(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last Update:</span>
                        <span className="font-medium">{format(parseISO(selectedOrder.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      {selectedOrder.resellerId && (
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-slate-500">Reseller ID:</span>
                          <span className="font-mono text-xs">{selectedOrder.resellerId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Map Tracking Visualizer (ONLY for Shipped or Delivered status) */}
                {['Shipped', 'Delivered'].includes(selectedOrder.status) && selectedOrder.trackingNumber && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <Truck className="w-4 h-4 mr-2" /> Live Parcel Tracking
                    </h3>
                    <OrderTracker
                      trackingNumber={selectedOrder.trackingNumber || ''}
                      carrier={selectedOrder.carrier || 'other'}
                      orderStatus={selectedOrder.status}
                    />
                  </div>
                )}

                {/* Status History */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <History className="w-4 h-4 mr-2" /> Status History
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200">
                      {selectedOrder.statusHistory?.length || 1} Updates
                    </Badge>
                  </div>
                  
                  <div className="relative space-y-0">
                    {/* Vertical Line */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 -translate-x-1/2 z-0" />

                    {[...(selectedOrder.statusHistory || [
                      { status: 'Pending', timestamp: selectedOrder.createdAt, note: 'Order placed' }
                    ])].reverse().map((history, i, arr) => {
                      const isLatest = i === 0;
                      const statusColors: Record<string, string> = {
                        'Pending': 'bg-amber-500',
                        'Confirmed': 'bg-blue-500',
                        'Packed': 'bg-purple-500',
                        'Shipped': 'bg-indigo-500',
                        'Delivered': 'bg-emerald-500',
                        'Returned': 'bg-rose-500',
                        'Refused': 'bg-rose-500',
                        'Cancelled': 'bg-slate-500',
                      };

                      return (
                        <div key={i} className="relative z-10 flex items-start space-x-6 pb-8 last:pb-0">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all duration-300 ${
                            isLatest ? `${statusColors[history.status] || 'bg-slate-500'} ring-4 ring-indigo-50` : 'bg-slate-200'
                          }`}>
                            {isLatest ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            )}
                          </div>
                          
                          <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 ${
                            isLatest 
                              ? 'bg-white border-indigo-100 shadow-md ring-1 ring-indigo-50/50' 
                              : 'bg-slate-50/50 border-slate-100 opacity-80'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                  isLatest ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {history.status}
                                </span>
                                <h4 className={`font-bold text-sm ${isLatest ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {history.status === 'Cancelled' ? 'Order Cancelled' : 
                                   history.status === 'Delivered' ? 'Order Delivered' :
                                   history.status === 'Shipped' ? 'Package Shipped' :
                                   `Status: ${history.status}`}
                                </h4>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {format(parseISO(history.timestamp), 'MMM dd, yyyy')}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {format(parseISO(history.timestamp), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                            
                            {history.note && (
                              <div className={`text-xs leading-relaxed p-3 rounded-xl ${
                                isLatest ? 'bg-slate-50 text-slate-700' : 'bg-transparent text-slate-500'
                              }`}>
                                {history.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Package className="w-4 h-4 mr-2" /> Order Items
                  </h3>
                  <div className="border rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Product</TableHead>
                          <TableHead className="text-xs font-bold text-center">Qty</TableHead>
                          <TableHead className="text-xs font-bold text-right">Price</TableHead>
                          <TableHead className="text-xs font-bold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium">{item.title}</TableCell>
                            <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                            <TableCell className="text-sm text-right">{formatPrice(item.price)}</TableCell>
                            <TableCell className="text-sm text-right font-bold">{formatPrice(item.price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" /> Financial Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Selling Price</p>
                      <p className="text-xl font-black text-indigo-700">{formatPrice(selectedOrder.sellingPrice)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Shipping Cost</p>
                      <p className="text-xl font-black text-slate-700">{formatPrice(selectedOrder.shippingCost)}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Reseller Profit</p>
                      <p className="text-xl font-black text-emerald-700">{formatPrice(selectedOrder.profit)}</p>
                    </div>
                  </div>
                </div>

                {/* Cancellation Note */}
                {selectedOrder.status === 'Cancelled' && selectedOrder.cancellationNote && (
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                    <h3 className="text-sm font-bold text-rose-600 uppercase tracking-widest flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 mr-2" /> Cancellation Reason
                    </h3>
                    <p className="text-rose-700 text-sm italic">"{selectedOrder.cancellationNote}"</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Cancellation Reason Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
        setIsCancelDialogOpen(open);
        if (!open) {
          setOrderToCancel(null);
          setCancelReason('');
          setIsBulkCancel(false);
        }
      }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Cancel {isBulkCancel ? `${selectedOrderIds.size} Orders` : 'Order'}</DialogTitle>
            <DialogDescription>
              Please provide a reason for this cancellation. This will be visible to the reseller.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Cancellation Reason</label>
              <textarea
                className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="e.g., Out of stock, Invalid address, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} className="rounded-xl font-bold">
              Go Back
            </Button>
            <Button 
              onClick={handleConfirmCancellation}
              disabled={isBulkProcessing || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold px-8"
            >
              {isBulkProcessing ? "Processing..." : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Confirmation Dialog */}
      <Dialog open={isBulkConfirmOpen} onOpenChange={setIsBulkConfirmOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark <span className="font-bold text-indigo-600">{selectedOrderIds.size}</span> orders as <span className="font-bold text-slate-900">{bulkTargetStatus}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="ghost" onClick={() => setIsBulkConfirmOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={executeBulkStatusChange}
              disabled={isBulkProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8"
            >
              {isBulkProcessing ? "Processing..." : "Confirm Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracking Info Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={(open) => {
        setIsTrackingDialogOpen(open);
        if (!open) {
          setOrderToShip(null);
          setTrackingNumber('');
          setCarrier('');
          setIsBulkShipping(false);
        }
      }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {isBulkShipping ? `Ship ${selectedOrderIds.size} Orders` : 'Input Tracking Info'}
            </DialogTitle>
            <DialogDescription>
              {isBulkShipping 
                ? 'Enter the carrier and tracking number for these selected orders.'
                : 'Enter the carrier and tracking number for this shipment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrier" className="font-bold text-slate-700">Courier Service / Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-slate-50/50">
                  <SelectValue placeholder="Select Carrier" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking" className="font-bold text-slate-700">Tracking Number</Label>
              <Input 
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="rounded-xl h-11 border-slate-200 bg-slate-50/50"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setIsTrackingDialogOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleShipOrder}
              disabled={isShipping || !trackingNumber.trim() || !carrier.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8"
            >
              {isShipping ? "Updating..." : "Confirm Shipment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
