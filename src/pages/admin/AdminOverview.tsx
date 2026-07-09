import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Product, UserProfile, Withdrawal } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, Users, CreditCard, TrendingUp, AlertCircle, Database, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { seedProducts } from '@/lib/seed';
import { toast } from 'sonner';

export function AdminOverview() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    resellers: 0,
    products: 0,
    pendingWithdrawals: 0,
    lowStockProducts: 0
  });
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const count = await seedProducts();
      toast.success(`Successfully added ${count} demo products!`);
    } catch (error) {
      console.error("Seeding error:", error);
      toast.error("Failed to seed demo data");
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const orders = snap.docs.map(doc => doc.data() as Order);
      const revenue = orders.reduce((sum, o) => sum + o.sellingPrice, 0);
      setStats(prev => ({ ...prev, orders: orders.length, revenue }));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const resellers = snap.docs.filter(doc => doc.data().role === 'reseller').length;
      setStats(prev => ({ ...prev, resellers }));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const lowStock = products.filter(p => p.stock <= (p.lowStockThreshold || 5));
      setLowStockItems(lowStock);
      setStats(prev => ({ ...prev, products: snap.docs.length, lowStockProducts: lowStock.length }));
    });

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      const pending = snap.docs.filter(doc => doc.data().status === 'Pending').length;
      setStats(prev => ({ ...prev, pendingWithdrawals: pending }));
    });

    setLoading(false);
    return () => {
      unsubOrders();
      unsubUsers();
      unsubProducts();
      unsubWithdrawals();
    };
  }, []);

  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Resellers', value: stats.resellers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  if (loading) return <div>Loading admin stats...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Admin Overview</h1>
          <p className="text-slate-500">Real-time business performance monitoring</p>
        </div>
        <Button 
          onClick={handleSeed} 
          disabled={isSeeding}
          variant="outline"
          className="rounded-xl border-slate-200 font-bold"
        >
          <Database className="w-4 h-4 mr-2" />
          {isSeeding ? "Seeding..." : "Seed Demo Data"}
        </Button>
      </div>

      {stats.lowStockProducts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-amber-900">Low Stock Warning</h3>
            <p className="text-amber-700 text-sm mb-4">
              {stats.lowStockProducts} products are running low on stock and need attention.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.slice(0, 3).map(product => (
                <div key={product.id} className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                  <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{product.title}</p>
                    <p className="text-[10px] font-black text-rose-600 uppercase">Stock: {product.stock}</p>
                  </div>
                </div>
              ))}
              {stats.lowStockProducts > 3 && (
                <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-amber-200 text-amber-600 text-xs font-bold">
                  +{stats.lowStockProducts - 3} more products
                </div>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="text-amber-700 hover:bg-amber-100 font-bold rounded-xl"
            onClick={() => window.location.href = '/admin/products?filter=low-stock'}
          >
            Manage Stock
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className={`w-10 h-10 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-4`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{card.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sales Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Mon', sales: 4000 },
                { name: 'Tue', sales: 3000 },
                { name: 'Wed', sales: 2000 },
                { name: 'Thu', sales: 2780 },
                { name: 'Fri', sales: 1890 },
                { name: 'Sat', sales: 2390 },
                { name: 'Sun', sales: 3490 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {stats.pendingWithdrawals > 0 && (
              <div className="flex items-start p-4 bg-rose-50 rounded-xl border border-rose-100">
                <AlertCircle className="w-5 h-5 text-rose-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-900">Pending Withdrawals</p>
                  <p className="text-xs text-rose-700">You have {stats.pendingWithdrawals} withdrawal requests waiting for approval.</p>
                </div>
              </div>
            )}
            {stats.lowStockProducts > 0 && (
              <div className="flex items-start p-4 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Low Stock Alert</p>
                  <p className="text-xs text-amber-700">{stats.lowStockProducts} products are currently below their stock threshold.</p>
                </div>
              </div>
            )}
            <div className="flex items-start p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <TrendingUp className="w-5 h-5 text-indigo-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-indigo-900">Revenue Growth</p>
                <p className="text-xs text-indigo-700">Sales are up 12% compared to last week.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
