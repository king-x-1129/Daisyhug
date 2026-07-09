import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Order } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, RotateCcw, XCircle, TrendingUp, Wallet, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function ResellerOverview() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('resellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    { label: 'Pending', value: orders.filter(o => o.status === 'Pending').length, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' },
    { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { label: 'Returned', value: orders.filter(o => o.status === 'Returned').length, icon: RotateCcw, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    { label: 'Refused', value: orders.filter(o => o.status === 'Refused').length, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20' },
    { label: 'Total Profit', value: formatPrice((profile?.walletBalance || 0) + (profile?.pendingProfit || 0) + (profile?.totalWithdrawn || 0)), icon: Wallet, color: 'text-indigo-650 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
  ];

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400 font-medium">
      Loading stats...
    </div>
  );

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {profile?.fullName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold dark:text-white">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-center py-8">No orders yet. Start selling!</p>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{order.customerName}</p>
                      <p className="text-xs text-slate-505 dark:text-slate-450 mt-0.5">{order.customerCity} • {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600 dark:text-indigo-400">{formatPrice(order.sellingPrice)}</p>
                      <p className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                        order.status === 'Delivered' ? 'bg-emerald-105 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        order.status === 'Returned' || order.status === 'Refused' ? 'bg-rose-105 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455' :
                        'bg-amber-105 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-indigo-600 dark:bg-indigo-900/40 text-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-indigo-100 dark:text-indigo-200 text-sm">Available Balance</p>
                <h2 className="text-4xl font-black">{formatPrice(profile?.walletBalance || 0)}</h2>
              </div>
              <Link to="/reseller/wallet">
                <Button variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 font-bold rounded-xl border-none">
                  Withdraw
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-500 dark:border-indigo-800">
              <div>
                <p className="text-indigo-100 dark:text-indigo-200 text-xs uppercase font-bold">Pending Profit</p>
                <p className="text-xl font-bold">{formatPrice(profile?.pendingProfit || 0)}</p>
              </div>
              <div>
                <p className="text-indigo-100 dark:text-indigo-200 text-xs uppercase font-bold">Total Withdrawn</p>
                <p className="text-xl font-bold">{formatPrice(profile?.totalWithdrawn || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div>
            <CardTitle className="text-xl font-black text-slate-900 dark:text-white">Order History</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your complete sales record</p>
          </div>
          <Link to="/reseller/orders">
            <Button variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
              View All Orders
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Order ID</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Date</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Customer</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">City</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Selling Price</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Profit</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4">Status</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-450">
                        {format(parseISO(order.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{order.customerName}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-350">{order.customerCity}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white font-sans">{formatPrice(order.sellingPrice)}</TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-450 font-sans">{formatPrice(order.profit)}</TableCell>
                      <TableCell>
                        <Badge className={`border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'Delivered' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                          order.status === 'Shipped' ? 'bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400' :
                          order.status === 'Cancelled' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' :
                          order.status === 'Returned' || order.status === 'Refused' ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455' :
                          'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                        }`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to="/reseller/orders">
                          <Button variant="ghost" size="icon" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
