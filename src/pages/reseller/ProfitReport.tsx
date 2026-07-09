import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Order, Withdrawal } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ProfitReport() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch orders for profit details
    const qOrders = query(collection(db, 'orders'), where('resellerId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
    });

    // Fetch withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', user.uid));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(data);
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubWithdrawals();
    };
  }, [user]);

  const profitOrders = useMemo(() => {
    return orders
      .filter(order => order.profit > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const sortedWithdrawals = useMemo(() => {
    return [...withdrawals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [withdrawals]);

  if (loading) return <div className="flex h-64 items-center justify-center">Loading profit reports...</div>;

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Profit Report</h1>
        <p className="text-slate-505 dark:text-slate-400 mt-1">Detailed breakdown of your earnings and payouts</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-450" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Available Balance</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{formatPrice(profile?.walletBalance || 0)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-450" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Profit</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{formatPrice(profile?.pendingProfit || 0)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-450" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Withdrawn</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{formatPrice(profile?.totalWithdrawn || 0)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-bold">Order Profits</TabsTrigger>
          <TabsTrigger value="withdrawals" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-bold">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center dark:text-white">
                <ArrowUpCircle className="w-5 h-5 mr-2 text-emerald-500" />
                Individual Order Profits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                  <TableRow className="border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="font-bold pl-6 text-slate-900 dark:text-white">Order ID</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white">Date</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white text-right">Selling Price</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white text-right">Company Cost</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white text-right">Shipping</TableHead>
                    <TableHead className="font-bold text-slate-900 dark:text-white text-right pr-6">Profit Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500">
                        No profit-earning orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitOrders.map((order) => {
                      const companyCost = order.companyPrice || (order.sellingPrice - order.shippingCost - order.profit);
                      return (
                        <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                          <TableCell className="pl-6 font-mono text-xs text-slate-550 dark:text-slate-400 font-sans">#{order.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-slate-505 dark:text-slate-450">{format(parseISO(order.createdAt), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-right font-medium dark:text-white font-sans">{formatPrice(order.sellingPrice)}</TableCell>
                          <TableCell className="text-right text-rose-600 dark:text-rose-450 font-sans">-{formatPrice(companyCost)}</TableCell>
                          <TableCell className="text-right text-rose-600 dark:text-rose-455 font-sans">-{formatPrice(order.shippingCost)}</TableCell>
                          <TableCell className="text-right pr-6 font-black text-emerald-600 dark:text-emerald-450 font-sans">
                            + {formatPrice(order.profit)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center dark:text-white">
                <ArrowDownCircle className="w-5 h-5 mr-2 text-rose-500" />
                Withdrawal History
              </CardTitle>
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
                  {sortedWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">
                        No withdrawal history found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedWithdrawals.map((w) => (
                      <TableRow key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                        <TableCell className="pl-6 text-slate-505 dark:text-slate-450">{format(parseISO(w.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="dark:text-slate-300">{w.method}</TableCell>
                        <TableCell>
                          <Badge className={`${
                            w.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                            w.status === 'Rejected' ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455' :
                            'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                          } border-none rounded-full px-3 py-0.5 text-[10px] font-bold`}>
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-black text-rose-600 dark:text-rose-450 font-sans">
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
  );
}
