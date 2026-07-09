import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Withdrawal, Order } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, ArrowDownLeft, History, Hourglass, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export function WalletPage() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', user.uid));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Fetch orders to track profit releases and pending payouts
    const qOrders = query(collection(db, 'orders'), where('resellerId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
    });

    return () => {
      unsubWithdrawals();
      unsubOrders();
    };
  }, [user]);

  // Combined transaction history (Profit releases + Approved withdrawals)
  const transactionHistory = useMemo(() => {
    const transactions: any[] = [];

    // Add profit releases
    orders.forEach(order => {
      if (order.profitReleasedAt) {
        transactions.push({
          id: `profit-${order.id}`,
          type: 'profit',
          amount: order.profit,
          date: order.profitReleasedAt,
          description: `Profit from Order #${order.id.slice(0, 8)}`,
          status: 'Completed'
        });
      }
    });

    // Add withdrawals
    withdrawals.forEach(w => {
      transactions.push({
        id: `withdraw-${w.id}`,
        type: 'withdrawal',
        amount: w.amount,
        date: w.createdAt,
        description: `Withdrawal via ${w.method}`,
        status: w.status
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, withdrawals]);

  // Pending payouts (Delivered orders where profit is not yet released)
  const pendingPayouts = useMemo(() => {
    return orders
      .filter(order => order.status === 'Delivered' && !order.profitReleasedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const withdrawAmount = Number(amount);
    if (withdrawAmount < 500) {
      toast.error("Minimum withdrawal amount is Rs. 500");
      return;
    }

    if (withdrawAmount > profile.walletBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        amount: withdrawAmount,
        method: method || profile.paymentInfo?.method || 'Bank',
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Withdrawal request submitted!");
      setAmount('');
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  // Automatic 15-day profit release check
  useEffect(() => {
    if (orders.length > 0 && profile && user) {
      const checkAndRelease = async () => {
        const now = new Date();
        const pendingDelivered = orders.filter(order => order.status === 'Delivered' && !order.profitReleasedAt);
        
        for (const order of pendingDelivered) {
          const deliveredHistory = order.statusHistory?.find(h => h.status === 'Delivered');
          const deliveryTimeStr = deliveredHistory?.timestamp || order.updatedAt || order.createdAt;
          if (!deliveryTimeStr) continue;
          
          const deliveryDate = new Date(deliveryTimeStr);
          const diffTime = Math.abs(now.getTime() - deliveryDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // If 15 days or more have passed, auto-release!
          if (diffDays >= 15) {
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                profitReleasedAt: now.toISOString()
              });
              await updateDoc(doc(db, 'users', user.uid), {
                walletBalance: increment(order.profit),
                pendingProfit: increment(-order.profit)
              });
              toast.success(`Profit of ${formatPrice(order.profit)} automatically released for Order #${order.id.slice(0, 8)}!`);
            } catch (err) {
              console.error("Automatic profit release failed:", err);
            }
          }
        }
      };
      checkAndRelease();
    }
  }, [orders, profile, user]);

  const handleFastTrackRelease = async (order: Order) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        profitReleasedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(order.profit),
        pendingProfit: increment(-order.profit)
      });
      toast.success(`Fast-track success! Rs. ${order.profit.toLocaleString()} released to your available balance.`);
    } catch (err: any) {
      console.error("Fast track error:", err);
      toast.error(err.message || "Failed to fast-track release");
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Wallet & Earnings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your balance, track payouts, and request withdrawals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Request */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-900/60 dark:to-indigo-950/60 text-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
            <CardContent className="p-8 space-y-6 relative z-10">
              <div>
                <p className="text-indigo-100 dark:text-indigo-200 text-sm font-bold uppercase tracking-wider">Available Balance</p>
                <h2 className="text-5xl font-black mt-2">{formatPrice(profile?.walletBalance || 0)}</h2>
              </div>
              <div className="pt-6 border-t border-indigo-500 dark:border-indigo-800">
                <p className="text-indigo-100 dark:text-indigo-200 text-xs font-bold uppercase">Total Withdrawn</p>
                <p className="text-xl font-bold">{formatPrice(profile?.totalWithdrawn || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-800 dark:text-amber-400 font-bold">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Pending Profit</span>
                </div>
                <span className="text-2xl font-black text-amber-900 dark:text-white">{formatPrice(profile?.pendingProfit || 0)}</span>
              </div>
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-350">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  This amount is subject to a <span className="font-bold">15-day holding period</span> after delivery to account for potential returns.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center dark:text-white">
                <ArrowUpRight className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Request Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Amount (Rs.)</Label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min 500" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Payment Method</Label>
                  <Select onValueChange={setMethod} defaultValue={profile?.paymentInfo?.method}>
                    <SelectTrigger className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="JazzCash">JazzCash</SelectItem>
                      <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !amount}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 border-none"
                >
                  {loading ? "Processing..." : "Submit Request"}
                </Button>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 italic">
                  * Withdrawals are usually processed within 24-48 hours.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs for History & Payouts */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
              <TabsTrigger value="transactions" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-850 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 font-bold flex items-center text-slate-500 dark:text-slate-400">
                <History className="w-4 h-4 mr-2" /> History
              </TabsTrigger>
              <TabsTrigger value="payouts" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-850 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 font-bold flex items-center text-slate-500 dark:text-slate-400">
                <Hourglass className="w-4 h-4 mr-2" /> Pending
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-850 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 font-bold flex items-center text-slate-500 dark:text-slate-400">
                <ArrowUpRight className="w-4 h-4 mr-2" /> Withdrawals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                  <CardTitle className="text-lg font-bold dark:text-white">Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                      <TableRow className="border-b border-slate-100 dark:border-slate-800">
                        <TableHead className="font-bold pl-6 text-slate-900 dark:text-white">Date</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Description</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
                        <TableHead className="font-bold text-right pr-6 text-slate-900 dark:text-white">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">
                            No transaction history found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactionHistory.map((t) => (
                          <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <TableCell className="pl-6 text-slate-500 dark:text-slate-450">{format(parseISO(t.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white">{t.description}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{t.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border-none rounded-full px-3 py-0.5 text-[10px] font-bold ${
                                t.status === 'Approved' || t.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                                t.status === 'Rejected' ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455' :
                                'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                              }`}>
                                {t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right pr-6 font-black font-sans ${t.type === 'profit' ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-450'}`}>
                              {t.type === 'profit' ? '+' : '-'} {formatPrice(t.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="mt-6">
              <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                  <CardTitle className="text-lg font-bold dark:text-white">Pending Payouts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                      <TableRow className="border-b border-slate-100 dark:border-slate-800">
                        <TableHead className="font-bold pl-6 text-slate-900 dark:text-white">Order Date</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Order ID</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
                        <TableHead className="font-bold text-right pr-6 text-slate-900 dark:text-white">Pending Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayouts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">
                            No pending payouts at the moment.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingPayouts.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <TableCell className="pl-6 text-slate-500 dark:text-slate-450">{format(parseISO(order.createdAt), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">#{order.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-none rounded-full px-3 py-0.5">
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-black text-amber-600 dark:text-amber-400 font-sans">{formatPrice(order.profit)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleFastTrackRelease(order)}
                                  className="h-7 text-[10px] text-indigo-650 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg px-2"
                                  title="Skip 15-day holding period for testing"
                                >
                                  Fast-Track
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-350 leading-relaxed">
                    Profits from delivered orders are held for 15 days to account for potential returns or disputes. 
                    Once this period passes, the profit will be automatically added to your available balance.
                  </p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-6">
              <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                  <CardTitle className="text-lg font-bold dark:text-white">Withdrawal Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                      <TableRow className="border-b border-slate-100 dark:border-slate-800">
                        <TableHead className="font-bold pl-6 text-slate-900 dark:text-white">Date</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Method</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
                        <TableHead className="font-bold text-right pr-6 text-slate-900 dark:text-white">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">
                            No withdrawal requests found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        withdrawals.map((w) => (
                          <TableRow key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <TableCell className="pl-6 text-slate-505 dark:text-slate-450">{format(parseISO(w.createdAt), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{w.method}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                w.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                                w.status === 'Rejected' ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455' :
                                'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                              } border-none rounded-full px-3 py-0.5 text-[10px] font-bold`}>
                                {w.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 font-black text-rose-650 dark:text-rose-400 font-sans">
                              - {formatPrice(w.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
