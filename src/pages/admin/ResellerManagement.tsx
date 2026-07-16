import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Order } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, Phone, MapPin, CreditCard, ShieldCheck, ShoppingBag, DollarSign, Award, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CustomerSummary {
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
}

export function ResellerManagement() {
  const { formatPrice } = useCurrency();
  const [resellers, setResellers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification & History Details Modal
  const [selectedReseller, setSelectedReseller] = useState<UserProfile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Stats & Customer History States for selected reseller
  const [resellerOrders, setResellerOrders] = useState<Order[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'reseller'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setResellers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading resellers:", error);
      toast.error("Failed to load resellers list: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch orders for metrics & history when a reseller is selected
  useEffect(() => {
    if (!selectedReseller) {
      setResellerOrders([]);
      return;
    }

    async function fetchResellerOrders() {
      try {
        const q = query(collection(db, 'orders'), where('resellerId', '==', selectedReseller.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setResellerOrders(data);
      } catch (err: any) {
        console.error("Error loading reseller orders:", err);
      }
    }

    fetchResellerOrders();
  }, [selectedReseller]);

  const toggleVerification = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isVerified: !current });
      toast.success(`Reseller ${!current ? 'verified' : 'unverified'}`);
      if (selectedReseller && selectedReseller.uid === uid) {
        setSelectedReseller(prev => prev ? { ...prev, isVerified: !current } : null);
      }
    } catch (error) {
      toast.error("Failed to update verification");
    }
  };

  // Compute stats metrics
  const totalOrders = resellerOrders.length;
  const totalProfit = resellerOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
  const totalRevenue = resellerOrders.reduce((sum, o) => sum + ((o.sellingPrice || 0) - (o.profit || 0)), 0);
  const completedOrders = resellerOrders.filter(o => o.status === 'Delivered').length;
  const returnedOrders = resellerOrders.filter(o => o.status === 'Returned' || o.status === 'Refused').length;

  // Process unique customers
  const customersMap = new Map<string, CustomerSummary>();
  resellerOrders.forEach(o => {
    const phone = o.customerPhone || 'N/A';
    const fullName = o.customerName || 'Guest Customer';
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || 'Guest';
    const lastName = parts.slice(1).join(' ') || 'Customer';

    const existing = customersMap.get(phone);
    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += (o.sellingPrice || 0);
    } else {
      customersMap.set(phone, {
        phone,
        firstName,
        lastName,
        address: o.customerAddress || 'N/A',
        city: o.customerCity || 'N/A',
        totalOrders: 1,
        totalSpent: o.sellingPrice || 0
      });
    }
  });

  const uniqueCustomers = Array.from(customersMap.values());
  const filteredCustomers = uniqueCustomers.filter(c => {
    const q = customerSearchQuery.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 text-slate-900 dark:text-white transition-colors duration-350">
      {selectedReseller ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top Bar with Back Navigation & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => { setSelectedReseller(null); setCustomerSearchQuery(''); }}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-350 dark:hover:text-amber-400 transition-colors bg-transparent border-none pl-0 hover:bg-transparent"
            >
              <span className="text-lg">←</span> Back to Resellers
            </Button>
            <div className="flex items-center gap-3">
              <Badge className={`${
                selectedReseller.isVerified 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' 
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
              } rounded-full px-3 py-1 text-xs font-bold`}>
                {selectedReseller.isVerified ? 'Fully Verified' : 'Pending Verification'}
              </Badge>
              <Button 
                onClick={() => toggleVerification(selectedReseller.uid, selectedReseller.isVerified)}
                className={`font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${
                  selectedReseller.isVerified 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {selectedReseller.isVerified ? 'Revoke Verification' : 'Approve & Verify'}
              </Button>
            </div>
          </div>

          {/* Premium Header Card */}
          <div className="bg-gradient-to-br from-amber-50/50 via-orange-50/20 to-white dark:from-slate-900/50 dark:via-slate-900/30 dark:to-slate-950 p-6 sm:p-8 rounded-3xl border border-amber-100/70 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl">
                  <ShieldCheck className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {selectedReseller.fullName}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                    Reseller Account Details
                  </p>
                </div>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs flex flex-wrap items-center gap-2">
                <span>UID: <span className="font-mono font-semibold">{selectedReseller.uid}</span></span>
                <span>•</span>
                <span>Joined {selectedReseller.createdAt ? new Date(selectedReseller.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 min-w-[200px]">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Wallet Balance</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-450 font-sans">{formatPrice(selectedReseller.walletBalance || 0)}</span>
            </div>
          </div>

          {/* Dashboard Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] uppercase font-black tracking-wider">Total Orders</span>
              </div>
              <p className="text-2xl font-black text-slate-850 dark:text-white font-sans">{totalOrders}</p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] uppercase font-black tracking-wider font-sans">Profit Payouts</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-sans">{formatPrice(totalProfit)}</p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                <span className="text-[10px] uppercase font-black tracking-wider">Net Revenue</span>
              </div>
              <p className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-sans">{formatPrice(totalRevenue)}</p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                <CheckCircle className="w-5 h-5 text-teal-500" />
                <span className="text-[10px] uppercase font-black tracking-wider">Completed</span>
              </div>
              <p className="text-2xl font-black text-slate-850 dark:text-white font-sans">{completedOrders}</p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                <RefreshCw className="w-5 h-5 text-rose-500" />
                <span className="text-[10px] uppercase font-black tracking-wider">Returned</span>
              </div>
              <p className="text-2xl font-black text-slate-850 dark:text-white font-sans">{returnedOrders}</p>
            </div>
          </div>

          {/* Two-Column Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Personal & Payment Information */}
            <div className="space-y-6">
              {/* Personal & Contact Info Card */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">Personal & Contact Info</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Full Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm break-all">{selectedReseller.fullName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Email Address</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm break-all">{selectedReseller.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Primary Mobile</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedReseller.mobile}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">CNIC Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">{selectedReseller.cnic || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Address & Payments Card */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">Address & Payments</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">City / Province</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReseller.city || 'N/A'}{selectedReseller.province ? `, ${selectedReseller.province}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Payout Method</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 uppercase">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" /> {selectedReseller.paymentInfo?.method || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 gap-1 sm:gap-4">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Details / Account #</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm break-all text-right">
                      {selectedReseller.paymentInfo?.details || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Verification Documentation */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">Verification Documentation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">CNIC Front Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicFrontUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 transition-all bg-slate-50 dark:bg-slate-950 aspect-[1.6] flex items-center justify-center group relative shadow-inner"
                    >
                      {selectedReseller.cnicFrontUrl ? (
                        <img 
                          src={selectedReseller.cnicFrontUrl} 
                          alt="CNIC Front" 
                          className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-650 text-xs font-medium">No Document Uploaded</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">CNIC Back Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicBackUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 transition-all bg-slate-50 dark:bg-slate-950 aspect-[1.6] flex items-center justify-center group relative shadow-inner"
                    >
                      {selectedReseller.cnicBackUrl ? (
                        <img 
                          src={selectedReseller.cnicBackUrl} 
                          alt="CNIC Back" 
                          className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-650 text-xs font-medium">No Document Uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50/50 dark:bg-slate-950 border border-amber-100/50 dark:border-slate-800 p-4 rounded-2xl text-xs text-slate-650 dark:text-slate-400 mt-6 leading-relaxed">
                <span className="font-bold text-amber-800 dark:text-amber-450 block mb-1">Verification Instructions:</span>
                Please cross-reference the uploaded document images with the CNIC number and full name provided on the left. Ensure credentials are valid and legible before approving.
              </div>
            </div>
          </div>

          {/* Reseller's Customers Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">Reseller's Customers</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Direct customers served by this reseller</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or city..."
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-amber-500 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4">First Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4">Last Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4">Phone</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4">City</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4">Address</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4 text-center">Orders</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider py-4 text-right">Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs font-medium">
                          No customer history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((c, i) => (
                        <TableRow key={i} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 last:border-0 transition-colors">
                          <TableCell className="font-bold py-4 text-slate-850 dark:text-slate-200">{c.firstName}</TableCell>
                          <TableCell className="font-bold py-4 text-slate-850 dark:text-slate-200">{c.lastName}</TableCell>
                          <TableCell className="py-4 text-slate-700 dark:text-slate-350">{c.phone}</TableCell>
                          <TableCell className="py-4 text-slate-700 dark:text-slate-350">{c.city}</TableCell>
                          <TableCell className="max-w-[200px] truncate py-4 text-slate-750 dark:text-slate-350">{c.address}</TableCell>
                          <TableCell className="text-center font-bold py-4 text-slate-850 dark:text-white">{c.totalOrders}</TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-450 font-sans py-4">{formatPrice(c.totalSpent)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Full size Document Preview Dialog */}
          <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none rounded-3xl shadow-none">
              {previewImage && (
                <div className="relative flex items-center justify-center max-h-[90vh]">
                  <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[90vh] object-contain rounded-2xl bg-slate-950/90 p-4 border border-slate-800" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Platform Resellers</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage registered reseller accounts and verification status</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold bg-white dark:bg-slate-900">Loading resellers...</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                  <TableRow>
                    <TableHead className="font-bold text-slate-900 dark:text-white">Name</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white">Contact</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white">City</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white">Wallet</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                        No resellers registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resellers.map((r) => (
                      <TableRow key={r.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                        <TableCell className="font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {r.fullName}
                            <Badge className={`${r.isVerified ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' : 'bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400'} border-none rounded-full px-2 py-0 text-[10px] font-bold`}>
                              {r.isVerified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm dark:text-white">{r.email}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">{r.mobile}</p>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{r.city || '-'}</TableCell>
                        <TableCell className="font-bold text-indigo-650 dark:text-indigo-400 font-sans">{formatPrice(r.walletBalance || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleVerification(r.uid, r.isVerified)}
                              className={r.isVerified ? 'text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 bg-transparent' : 'text-emerald-600 dark:text-emerald-455 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-transparent'}
                            >
                              {r.isVerified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setSelectedReseller(r)}
                              className="text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
