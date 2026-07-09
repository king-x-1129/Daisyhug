import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Order, OrderStatus, Product } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Trash2, Edit3, Eye, Filter, X, XCircle, Search, History, User, Phone, MapPin, Package, CreditCard, Calendar, CheckCircle2, AlertCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { OrderTracker } from '@/components/OrderTracker';

export function OrdersList() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter, Tab & Sort states
  const [activeTab, setActiveTab] = useState<'all' | 'returns'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Cancellation state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Detail dialog state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Edit Order states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerCity, setEditCustomerCity] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editCarrier, setEditCarrier] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Tracking Info state (kept for visual compliance)
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [orderToShip, setOrderToShip] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [isShipping, setIsShipping] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (err) {
        console.error("Error fetching products in OrdersList:", err);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('resellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
      // Returned & Refused Orders tab filter
      if (activeTab === 'returns' && !['Returned', 'Refused'].includes(order.status)) {
        return false;
      }

      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerPhone.includes(searchLower) ||
        order.customerCity.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

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

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'price-desc') {
        return b.sellingPrice - a.sellingPrice;
      }
      if (sortBy === 'price-asc') {
        return a.sellingPrice - b.sellingPrice;
      }
      return 0;
    });

    return result;
  }, [orders, activeTab, statusFilter, startDate, endDate, sortBy]);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSortBy('date-desc');
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setIsCancelling(true);
    try {
      const orderRef = doc(db, 'orders', orderToCancel);
      const orderSnap = await getDoc(orderRef);
      const orderData = orderSnap.data() as Order;

      await updateDoc(orderRef, {
        status: 'Cancelled',
        cancellationNote: cancelReason,
        statusHistory: [
          ...(orderData.statusHistory || []),
          {
            status: 'Cancelled',
            timestamp: new Date().toISOString(),
            note: `Cancelled by reseller: ${cancelReason}`
          }
        ],
        updatedAt: new Date().toISOString()
      });
      toast.success("Order cancelled successfully");
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
      setCancelReason('');
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus, trackingData?: { trackingNumber: string, carrier: string }) => {
    if (newStatus === order.status && !trackingData) return;

    try {
      const orderRef = doc(db, 'orders', order.id);
      
      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: trackingData ? `Order shipped via ${trackingData.carrier} (Tracking: ${trackingData.trackingNumber})` : `Status updated to ${newStatus}`
          }
        ]
      };

      if (trackingData) {
        updateData.trackingNumber = trackingData.trackingNumber;
        updateData.carrier = trackingData.carrier;
      }

      await updateDoc(orderRef, updateData);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleShipOrder = async () => {
    if (!orderToShip || !trackingNumber.trim() || !carrier.trim()) {
      toast.error("Please provide tracking number and carrier");
      return;
    }

    setIsShipping(true);
    await handleStatusChange(orderToShip, 'Shipped', { trackingNumber, carrier });
    setIsTrackingDialogOpen(false);
    setOrderToShip(null);
    setTrackingNumber('');
    setCarrier('');
    setIsShipping(false);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Confirmed': 'bg-blue-100 text-blue-700',
      'Shipped': 'bg-indigo-100 text-indigo-700',
      'Delivered': 'bg-emerald-100 text-emerald-700',
      'Returned': 'bg-rose-100 text-rose-700',
      'Refused': 'bg-rose-100 text-rose-700',
      'Cancelled': 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return <Badge className={`${colors[status] || 'bg-slate-100'} border-none rounded-full px-3`}>{status}</Badge>;
  };

  const carriers = [
    { name: 'TCS', cost: 250 },
    { name: 'Leopard', cost: 200 },
    { name: 'Call Courier', cost: 180 },
    { name: 'Post Office', cost: 150 }
  ];

  const selectedProdObj = products.find(p => p.id === editProductId);
  const selectedCarrierObj = carriers.find(c => c.name === editCarrier);
  const calculatedShippingCost = selectedCarrierObj?.cost || 250;
  const calculatedProfit = selectedProdObj ? editSellingPrice - selectedProdObj.companyPrice - calculatedShippingCost : 0;

  const handleUpdateOrder = async () => {
    if (!orderToEdit) return;
    if (!selectedProdObj) {
      toast.error("Please select a product");
      return;
    }
    if (editSellingPrice < selectedProdObj.companyPrice + calculatedShippingCost) {
      toast.error(`Selling price must cover company cost (${formatPrice(selectedProdObj.companyPrice)}) and shipping (${formatPrice(calculatedShippingCost)})!`);
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', orderToEdit.id), {
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        customerCity: editCustomerCity,
        customerAddress: editCustomerAddress,
        items: [{
          productId: selectedProdObj.id,
          title: selectedProdObj.title,
          quantity: 1,
          price: selectedProdObj.price
        }],
        sellingPrice: editSellingPrice,
        companyPrice: selectedProdObj.companyPrice,
        shippingCost: calculatedShippingCost,
        profit: calculatedProfit,
        carrier: editCarrier,
        updatedAt: new Date().toISOString()
      });
      toast.success("Order updated successfully!");
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error("Error updating order:", err);
      toast.error(err.message || "Failed to update order");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div>Loading orders...</div>;

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Orders</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage your customer orders</p>
        </div>
      </div>

      {/* Tabs for Separate Section: Returned / Refused Orders */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-6">
        <button 
          onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button 
          onClick={() => { setActiveTab('returns'); setStatusFilter('all'); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'returns' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Returned & Refused Orders
          <span className="bg-rose-100 dark:bg-rose-950/20 text-rose-750 dark:text-rose-455 text-[10px] font-black px-2 py-0.5 rounded-full">
            {orders.filter(o => ['Returned', 'Refused'].includes(o.status)).length}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-2">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <Input 
                placeholder="Order ID, Name, Phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Refused">Refused</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Start Date</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">End Date</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="flex-grow rounded-xl border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900"
            >
              <X className="w-4 h-4 mr-2" /> Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
            <TableRow>
              <TableHead className="font-bold text-slate-900 dark:text-white">Order ID</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">Date</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">Customer</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">City</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">Selling Price</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">Profit</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
              <TableHead className="font-bold text-slate-900 dark:text-white text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                  No orders found matching the filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-505 dark:text-slate-400">#{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs text-slate-505 dark:text-slate-450">
                    {format(parseISO(order.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white">{order.customerName}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">{order.customerCity}</TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white font-sans">{formatPrice(order.sellingPrice)}</TableCell>
                  <TableCell className="font-bold text-emerald-600 dark:text-emerald-450 font-sans">{formatPrice(order.profit)}</TableCell>
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
                      {order.status === 'Cancelled' && order.cancellationNote && (
                        <span className="text-[10px] text-rose-500 mt-1 max-w-[120px] truncate" title={order.cancellationNote}>
                          {order.cancellationNote}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailOpen(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600"
                        title="View Order"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {order.status === 'Pending' && (Date.now() - new Date(order.createdAt).getTime() <= 300000) && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setOrderToEdit(order);
                              setEditCustomerName(order.customerName);
                              setEditCustomerPhone(order.customerPhone);
                              setEditCustomerCity(order.customerCity);
                              setEditCustomerAddress(order.customerAddress);
                              setEditSellingPrice(order.sellingPrice);
                              setEditCarrier(order.carrier || 'TCS');
                              setEditProductId(order.items[0]?.productId || '');
                              setIsEditDialogOpen(true);
                            }}
                            className="text-slate-400 hover:text-amber-600"
                            title="Edit Order"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setOrderToCancel(order.id);
                              setIsCancelDialogOpen(true);
                            }} 
                            className="text-slate-400 hover:text-rose-600"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Cancel Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this order. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-bold">Cancellation Reason</Label>
              <textarea
                id="reason"
                className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="e.g., Customer changed their mind, Incorrect address, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setIsCancelDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              Go Back
            </Button>
            <Button 
              onClick={handleCancelOrder}
              disabled={isCancelling || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Pending Order</DialogTitle>
            <DialogDescription>
              Modify customer details, change product selection, set selling price, or update the courier. Profit will recalculate automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Customer Name</Label>
                <Input 
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Customer Full Name"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Customer Phone</Label>
                <Input 
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  placeholder="03001234567"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Customer City</Label>
                <Input 
                  value={editCustomerCity}
                  onChange={(e) => setEditCustomerCity(e.target.value)}
                  placeholder="Karachi"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Delivery Courier</Label>
                <Select value={editCarrier} onValueChange={setEditCarrier}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select Courier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name} (Cost: {formatPrice(c.cost)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Complete Address</Label>
              <Input 
                value={editCustomerAddress}
                onChange={(e) => setEditCustomerAddress(e.target.value)}
                placeholder="House #, Street, Block, Area"
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Selected Product</Label>
                <Select value={editProductId} onValueChange={setEditProductId}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Choose product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title} (Cost: {formatPrice(p.companyPrice)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wide text-slate-400">Selling Price (Rs.)</Label>
                <Input 
                  type="number"
                  value={editSellingPrice || ''}
                  onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                  placeholder="Price charged to customer"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {selectedProdObj && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financial breakdown</span>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Selling Price: <span className="font-bold text-slate-900">{formatPrice(editSellingPrice)}</span></p>
                    <p>Company Cost: <span className="font-bold text-slate-900">- {formatPrice(selectedProdObj.companyPrice)}</span></p>
                    <p>Courier Cost: <span className="font-bold text-slate-900">- {formatPrice(calculatedShippingCost)}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Calculated Profit</span>
                  <span className={`text-2xl font-black ${calculatedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPrice(calculatedProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl font-bold"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateOrder}
              disabled={isUpdating || !editCustomerName || !editCustomerPhone || !editCustomerCity || !editCustomerAddress || !editProductId || editSellingPrice <= 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100"
            >
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {selectedOrder.trackingNumber && (
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {selectedOrder.carrier}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-500 mt-1">
                          Tracking: {selectedOrder.trackingNumber}
                        </span>
                      </div>
                    )}
                    {/* Resellers cannot update status directly */}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Last updated: {format(parseISO(selectedOrder.updatedAt), 'MMM dd, HH:mm')}
                    </p>
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
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                              : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                          </div>
                          <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${
                            isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {['Returned', 'Refused', 'Cancelled'].includes(selectedOrder.status) && (
                    <div className="mt-6 flex justify-center">
                      <Badge className="bg-rose-100 dark:bg-rose-950/20 text-rose-750 dark:text-rose-455 border-none rounded-full px-4 py-1 flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4" />
                        Order is {selectedOrder.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Customer & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                      <User className="w-4 h-4 mr-2" /> Customer Info
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-3 border border-slate-100/50 dark:border-slate-800">
                      <div className="flex items-center text-slate-900 dark:text-white">
                        <span className="font-bold mr-2">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center text-slate-600 dark:text-slate-350 text-sm">
                        <Phone className="w-3 h-3 mr-2 text-slate-400 dark:text-slate-500" />
                        {selectedOrder.customerPhone}
                      </div>
                      <div className="flex items-start text-slate-600 dark:text-slate-350 text-sm">
                        <MapPin className="w-3 h-3 mr-2 mt-1 text-slate-400 dark:text-slate-500" />
                        <span>
                          {selectedOrder.customerAddress}<br />
                          <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerCity}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                      <Calendar className="w-4 h-4 mr-2" /> Order Timeline
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-3 text-sm border border-slate-100/50 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Placed On:</span>
                        <span className="font-medium dark:text-white">{format(parseISO(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Last Update:</span>
                        <span className="font-medium dark:text-white">{format(parseISO(selectedOrder.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Tracking Visualizer (ONLY for Shipped or Delivered status) */}
                {['Shipped', 'Delivered'].includes(selectedOrder.status) && selectedOrder.trackingNumber && (
                  <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-850/80 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center">
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
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center">
                    <History className="w-4 h-4 mr-2" /> Status History
                  </h3>
                  <div className="space-y-0">
                    {[...(selectedOrder.statusHistory || [
                      { status: 'Pending', timestamp: selectedOrder.createdAt, note: 'Order placed' }
                    ])].reverse().map((history, i, arr) => (
                      <div key={i} className="flex items-start space-x-4">
                        <div className="flex flex-col items-center mt-1.5">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            i === 0 ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-950/40' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                          }`} />
                          {i < arr.length - 1 && (
                            <div className="w-0.5 h-12 bg-slate-100 dark:bg-slate-800 my-1" />
                          )}
                        </div>
                        <div className={`flex-1 pb-8`}>
                          <div className={`p-4 rounded-2xl border transition-all ${
                            i === 0 ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900 shadow-sm ring-1 ring-indigo-50 dark:ring-indigo-950/40' : 'bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800'
                          }`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-bold text-sm ${i === 0 ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {history.status}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">
                                {format(parseISO(history.timestamp), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed">{history.note}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">My Profit</p>
                      <p className="text-xl font-black text-emerald-700">{formatPrice(selectedOrder.profit)}</p>
                    </div>
                  </div>
                </div>

                {/* Cancellation Note */}
                {selectedOrder.status === 'Cancelled' && selectedOrder.cancellationNote && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-900 uppercase mb-1">Cancellation Reason</p>
                      <p className="text-sm text-rose-700">{selectedOrder.cancellationNote}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Info Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Input Tracking Info</DialogTitle>
            <DialogDescription>
              Enter the carrier and tracking number for this shipment.
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
                  <SelectItem value="Leopard Courier">Leopard Courier</SelectItem>
                  <SelectItem value="TCS">TCS</SelectItem>
                  <SelectItem value="M&P">M&P</SelectItem>
                  <SelectItem value="Trax">Trax</SelectItem>
                  <SelectItem value="PostEx">PostEx</SelectItem>
                  <SelectItem value="CallCouriers">CallCouriers</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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
