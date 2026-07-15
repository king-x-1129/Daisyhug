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
                        <Badge className={`${r.isVerified ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'} border-none rounded-full px-2 py-0 text-[10px] font-bold`}>
                          {r.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm dark:text-white">{r.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">{r.mobile}</p>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{r.city || '-'}</TableCell>
                    <TableCell className="font-bold text-indigo-600 dark:text-indigo-400 font-sans">{formatPrice(r.walletBalance || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleVerification(r.uid, r.isVerified)}
                          className={r.isVerified ? 'text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 bg-transparent' : 'text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-transparent'}
                        >
                          {r.isVerified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedReseller(r); setIsDetailsOpen(true); }}
                          className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
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

      {/* Reseller Documentation & History Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl rounded-3xl overflow-y-auto max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck className="w-6 h-6 text-indigo-650 dark:text-indigo-400" />
              Reseller verification & History View
            </DialogTitle>
          </DialogHeader>

          {selectedReseller && (
            <div className="space-y-8 mt-4">
              {/* Top Banner Status */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedReseller.isVerified 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
              }`}>
                <div>
                  <p className="font-bold text-sm">Status: {selectedReseller.isVerified ? 'Fully Verified Reseller' : 'Pending Verification Review'}</p>
                  <p className="text-xs mt-0.5 opacity-90">Joined on {selectedReseller.createdAt ? new Date(selectedReseller.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => toggleVerification(selectedReseller.uid, selectedReseller.isVerified)}
                  className={`font-bold ${
                    selectedReseller.isVerified 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-none' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-none'
                  }`}
                >
                  {selectedReseller.isVerified ? 'Revoke Verification' : 'Approve & Verify'}
                </Button>
              </div>

              {/* highly professional metric dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Orders</span>
                  </div>
                  <p className="text-xl font-black font-sans">{totalOrders}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Award className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Profit Payouts</span>
                  </div>
                  <p className="text-xl font-black text-emerald-650 dark:text-emerald-400 font-sans">{formatPrice(totalProfit)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Net Revenue</span>
                  </div>
                  <p className="text-xl font-black text-indigo-650 dark:text-indigo-400 font-sans">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Completed</span>
                  </div>
                  <p className="text-xl font-black font-sans">{completedOrders}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <RefreshCw className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Returned</span>
                  </div>
                  <p className="text-xl font-black font-sans">{returnedOrders}</p>
                </div>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Personal & Contact Info</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Full Name:</span>
                      <span className="font-bold">{selectedReseller.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email Address:</span>
                      <span className="font-bold">{selectedReseller.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Mobile:</span>
                      <span className="font-bold flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {selectedReseller.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CNIC Number:</span>
                      <span className="font-bold">{selectedReseller.cnic || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Address & Payments</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">City / Province:</span>
                      <span className="font-bold">{selectedReseller.city}, {selectedReseller.province}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payout Method:</span>
                      <span className="font-bold flex items-center gap-1"><CreditCard className="w-3 h-3 text-slate-400" /> {selectedReseller.paymentInfo?.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Details:</span>
                      <span className="font-mono font-bold">{selectedReseller.paymentInfo?.details}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reseller's Customers Table */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Reseller's Customers</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      className="pl-9 h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-55 dark:bg-slate-950/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white">First Name</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Last Name</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Phone</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white">City</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Address</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white text-center">Orders</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 dark:text-white text-right">Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                            No customers found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((c, i) => (
                          <TableRow key={i} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-850">
                            <TableCell className="font-bold">{c.firstName}</TableCell>
                            <TableCell className="font-bold">{c.lastName}</TableCell>
                            <TableCell>{c.phone}</TableCell>
                            <TableCell>{c.city}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{c.address}</TableCell>
                            <TableCell className="text-center font-bold">{c.totalOrders}</TableCell>
                            <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400 font-sans">{formatPrice(c.totalSpent)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Verification Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-center">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CNIC Front Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicFrontUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all bg-slate-50 dark:bg-slate-800 h-32 flex items-center justify-center"
                    >
                      {selectedReseller.cnicFrontUrl ? (
                        <img src={selectedReseller.cnicFrontUrl} alt="CNIC Front" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-slate-400 text-xs">No Document Uploaded</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-center">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CNIC Back Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicBackUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all bg-slate-50 dark:bg-slate-800 h-32 flex items-center justify-center"
                    >
                      {selectedReseller.cnicBackUrl ? (
                        <img src={selectedReseller.cnicBackUrl} alt="CNIC Back" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-slate-400 text-xs">No Document Uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full size Document Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none rounded-3xl shadow-none">
          {previewImage && (
            <div className="relative flex items-center justify-center max-h-[90vh]">
              <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[90vh] object-contain rounded-2xl bg-slate-950/80 p-4" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
