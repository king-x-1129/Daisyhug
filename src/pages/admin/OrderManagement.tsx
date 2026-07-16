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

  // Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCheckedItems({});
  }, [selectedOrder]);

  const generateSmartSKU = (item: any, index: number) => {
    if (item.sku) return item.sku;
    const titlePart = item.title ? item.title.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') : 'PRD';
    const varPart = item.variation ? item.variation.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X') : 'VR';
    return `${titlePart}-${varPart}-${index + 1}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white transition-colors duration-350">
      {/* Stylesheet injected for handling print media queries cleanly */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide all dashboard chrome */
          aside, header, nav, footer, button, .no-print, [role="dialog"], .bulk-actions-bar {
            display: none !important;
          }
          main, .flex-grow, body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 12px !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Visual improvements for print high-contrast */
          .print-border {
            border: 1px solid #000 !important;
          }
          .print-border-b {
            border-bottom: 1px solid #000 !important;
          }
          .print-bg-gray {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-text-lg {
            font-size: 16px !important;
          }
        }
      `}} />

      {selectedOrder ? (
        <div id="printable-invoice" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 print-full-width">
          {/* Detail View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <Button
              variant="ghost"
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-350 dark:hover:text-amber-400 transition-colors bg-transparent border-none pl-0 hover:bg-transparent"
            >
              <span className="text-lg">←</span> Back to Orders
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={handlePrint}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                Print Invoice / Packing Slip
              </Button>
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
                <SelectTrigger className="w-[140px] rounded-xl h-10 text-xs">
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
              {(selectedOrder.status === 'Confirmed' || selectedOrder.status === 'Packed' || selectedOrder.status === 'Shipped') && (
                <Button 
                  size="sm"
                  onClick={() => {
                    setOrderToShip(selectedOrder);
                    setTrackingNumber(selectedOrder.trackingNumber || '');
                    setCarrier(selectedOrder.carrier || 'TCS');
                    setIsTrackingDialogOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 text-xs font-bold"
                >
                  <Truck className="w-4 h-4 mr-2" /> 
                  {selectedOrder.status === 'Shipped' ? 'Edit Tracking' : 'Ship Order'}
                </Button>
              )}
            </div>
          </div>

          {/* Invoice / Packing Slip Header */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 print-border">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl no-print">
                  <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print-text-lg">
                      Order Details & Packing Slip
                    </h2>
                    <span className="no-print">
                      {getStatusBadge(selectedOrder.status)}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-0.5">
                    Order ID: #{selectedOrder.id}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 md:items-end">
              {/* Order Type Badge */}
              {selectedOrder.resellerId ? (
                <Badge className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-full px-3 py-1 font-bold text-xs uppercase tracking-wider self-start md:self-auto">
                  Reseller Order (Reseller: {resellers.find(r => r.uid === selectedOrder.resellerId)?.fullName || selectedOrder.resellerId})
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-455 border border-emerald-200 dark:border-emerald-900/40 rounded-full px-3 py-1 font-bold text-xs uppercase tracking-wider self-start md:self-auto">
                  Direct Customer Order
                </Badge>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Last updated: {format(parseISO(selectedOrder.updatedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Dual-Card Layout: Customer Details & Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-border-b pb-4">
            {/* Left Card: Customer Delivery Details */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 print-border">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center border-b pb-2">
                <User className="w-4 h-4 mr-2 text-amber-500" /> Customer Delivery Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">Recipient Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">Phone Number</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">City</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerCity}</span>
                </div>
                <div className="flex flex-col py-1">
                  <span className="text-slate-400 dark:text-slate-500 mb-1">Shipping Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800/50 leading-relaxed">
                    {selectedOrder.customerAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Payment Summary */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 print-border">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center border-b pb-2">
                <CreditCard className="w-4 h-4 mr-2 text-amber-500" /> Payment Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">Order ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">Payment Method</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">COD (Cash on Delivery)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30 bg-amber-500/10 dark:bg-amber-500/20 px-2 rounded-lg print-bg-gray">
                  <span className="text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider text-xs">Total COD to Collect</span>
                  <span className="font-black text-amber-600 dark:text-amber-450 text-base">{formatPrice(selectedOrder.sellingPrice)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/30">
                  <span className="text-slate-400 dark:text-slate-500">Order Date</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {format(parseISO(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Packing Checklist Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 print-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                <CheckSquare className="w-4 h-4 mr-2 text-amber-500" /> Packing Item Checklist
              </h3>
              <span className="text-xs text-slate-400 no-print">Packer verification checklist</span>
            </div>

            <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b">
                  <TableRow>
                    <TableHead className="w-12 text-center no-print">Picked</TableHead>
                    <TableHead className="text-xs font-bold">Smart SKU</TableHead>
                    <TableHead className="text-xs font-bold">Item & Variation</TableHead>
                    <TableHead className="text-xs font-bold text-center">Quantity</TableHead>
                    <TableHead className="text-xs font-bold text-right no-print">Price</TableHead>
                    <TableHead className="text-xs font-bold text-right no-print">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item, i) => (
                    <TableRow key={i} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 border-b last:border-0 ${checkedItems[i] ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}>
                      <TableCell className="text-center no-print" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={!!checkedItems[i]}
                          onCheckedChange={(checked) => {
                            setCheckedItems(prev => ({ ...prev, [i]: !!checked }));
                          }}
                          className="h-5 w-5 rounded border-slate-300 focus:ring-amber-500 text-amber-600"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-black text-amber-600 dark:text-amber-455">{generateSmartSKU(item, i)}</TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</p>
                        {item.variation && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Variation: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.variation}</span></p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-base font-black text-slate-900 dark:text-white">QTY: {item.quantity}</span>
                      </TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-slate-400 no-print">{formatPrice(item.price)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 dark:text-white no-print">{formatPrice(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Visual Tracking Map in Detail View (only for shipped/delivered) */}
          {['Shipped', 'Delivered'].includes(selectedOrder.status) && selectedOrder.trackingNumber && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 no-print">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                <Truck className="w-4 h-4 mr-2 text-amber-500" /> Live Parcel Tracking Status
              </h3>
              <OrderTracker
                trackingNumber={selectedOrder.trackingNumber || ''}
                carrier={selectedOrder.carrier || 'other'}
                orderStatus={selectedOrder.status}
              />
            </div>
          )}

          {/* Detailed Status History Log */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 no-print">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                <History className="w-4 h-4 mr-2 text-amber-500" /> Status History Log
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800">
                {selectedOrder.statusHistory?.length || 1} Events
              </Badge>
            </div>
            
            <div className="relative space-y-0">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800 -translate-x-1/2 z-0" />
              {[...(selectedOrder.statusHistory || [
                { status: 'Pending', timestamp: selectedOrder.createdAt, note: 'Order placed' }
              ])].reverse().map((history, i) => {
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
                  <div key={i} className="relative z-10 flex items-start space-x-6 pb-6 last:pb-0">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm ${
                      isLatest ? `${statusColors[history.status] || 'bg-slate-500'} ring-4 ring-amber-50 dark:ring-amber-950/20` : 'bg-slate-200 dark:bg-slate-800'
                    }`}>
                      {isLatest ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-650" />
                      )}
                    </div>
                    
                    <div className={`flex-1 p-4 rounded-xl border transition-all ${
                      isLatest 
                        ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-slate-800 shadow-sm' 
                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900 opacity-70'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1 ${
                            isLatest ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {history.status}
                          </span>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-250">
                            {history.note || `Order moved to ${history.status}`}
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {format(parseISO(history.timestamp), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancellation Note Details */}
          {selectedOrder.status === 'Cancelled' && selectedOrder.cancellationNote && (
            <div className="bg-rose-50 dark:bg-rose-950/15 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-455 uppercase tracking-widest flex items-center mb-2">
                <AlertCircle className="w-4 h-4 mr-2" /> Cancellation Reason
              </h3>
              <p className="text-rose-700 dark:text-rose-350 text-sm italic">"{selectedOrder.cancellationNote}"</p>
            </div>
          )}

          {/* Printable Invoice Footer */}
          <div className="hidden print:block text-center mt-12 pt-8 border-t border-dashed border-slate-300 text-sm text-slate-655 font-medium">
            Thank you for shopping with ResellXPK!
          </div>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Order Management</h1>
            <p className="text-slate-500 dark:text-slate-400">Process orders and manage returns</p>
          </div>

          {/* Filters */}
          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden border border-slate-100 dark:border-slate-800/80">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Orders</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Order ID, Customer, Phone, City..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reseller</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Name or ID..." 
                      value={resellerSearch}
                      onChange={(e) => setResellerSearch(e.target.value)}
                      className="pl-10 rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
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
                  <Label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date Range</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white"
                    />
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white"
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
                        className="h-11 w-11 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white">Order ID</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white">Customer</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white">Reseller</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white">Price</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                      No orders found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className={`cursor-pointer border-b border-slate-100 dark:border-slate-800/80 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}
                      onClick={() => {
                        setSelectedOrder(order);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={() => toggleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-900 dark:text-white">{order.customerName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.customerPhone}</p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {order.resellerId ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {resellers.find(r => r.uid === order.resellerId)?.fullName || 'Loading...'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-450 dark:text-slate-500 mt-0.5">
                              ID: {order.resellerId.slice(0, 8)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-550 italic">Direct Customer</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-slate-855 dark:text-slate-205">{formatPrice(order.sellingPrice)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {getStatusBadge(order.status)}
                          {order.trackingNumber && (
                            <div className="flex items-center gap-1 mt-1">
                              <Truck className="w-3 h-3 text-indigo-500" />
                              <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 truncate max-w-[100px]">
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
                            }}
                            className="text-slate-400 hover:text-amber-500 hover:bg-slate-105 dark:hover:bg-slate-800"
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
                              className="bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl h-9 px-3 text-xs font-bold"
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
        </>
      )}

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedOrderIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-800 bulk-actions-bar no-print"
          >
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-amber-500" />
              <span className="font-bold">{selectedOrderIds.size} Orders Selected</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center space-x-3">
              <Button 
                disabled={isBulkProcessing}
                onClick={() => handleBulkStatusChange('Shipped')}
                className="bg-amber-500 hover:bg-amber-600 h-10 rounded-xl px-4 text-sm font-bold border-none"
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
              <label className="text-sm font-bold text-slate-700 dark:text-slate-305">Cancellation Reason</label>
              <textarea
                className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm"
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
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark <span className="font-bold text-amber-500">{selectedOrderIds.size}</span> orders as <span className="font-bold text-slate-900 dark:text-white">{bulkTargetStatus}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="ghost" onClick={() => setIsBulkConfirmOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={executeBulkStatusChange}
              disabled={isBulkProcessing}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold px-8"
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
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">
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
              <Label htmlFor="carrier" className="font-bold text-slate-700 dark:text-slate-305">Courier Service / Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
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
              <Label htmlFor="tracking" className="font-bold text-slate-700 dark:text-slate-305">Tracking Number</Label>
              <Input 
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white"
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
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold px-8"
            >
              {isShipping ? "Updating..." : "Confirm Shipment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

