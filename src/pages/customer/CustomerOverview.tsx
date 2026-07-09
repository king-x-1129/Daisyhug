import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/types';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, Clock, TrendingUp, Heart, ArrowRight, Package, Truck } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Pending:   { color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30',   icon: Clock },
  Confirmed: { color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30',    icon: Package },
  Packed:    { color: 'text-indigo-700 dark:text-indigo-400',  bg: 'bg-indigo-100 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30',  icon: Package },
  Shipped:   { color: 'text-purple-700 dark:text-purple-400',  bg: 'bg-purple-100 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30',  icon: Truck },
  Delivered: { color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30', icon: CheckCircle },
  Returned:  { color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30',    icon: ShoppingBag },
  Refused:   { color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30',    icon: ShoppingBag },
  Cancelled: { color: 'text-slate-550 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/30',   icon: ShoppingBag },
};

export function CustomerOverview() {
  const { user, profile } = useAuth();
  const { wishlistItems } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [user]);

  const totalSpent = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + o.sellingPrice, 0);
  const delivered = orders.filter(o => o.status === 'Delivered').length;
  const pending = orders.filter(o => ['Pending','Confirmed','Packed','Shipped'].includes(o.status)).length;

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-indigo-600 dark:text-indigo-400', bg: 'from-indigo-500 to-indigo-600' },
    { label: 'Delivered', value: delivered, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500 to-emerald-600' },
    { label: 'In Progress', value: pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-400 to-amber-500' },
    { label: 'Total Spent', value: `Rs. ${totalSpent.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'from-purple-500 to-purple-600' },
  ];

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{profile?.fullName?.split(' ')[0]}!</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Here's a summary of your shopping activity.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center mb-4 shadow-lg`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-black text-slate-900 dark:text-white">Recent Orders</h2>
            <Link to="/customer/orders" className="text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {orders.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-slate-400 dark:text-slate-500">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No orders yet.</p>
                <Link to="/shop" className="mt-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">Browse Products →</Link>
              </div>
            ) : (
              orders.slice(0, 5).map((order) => {
                const cfg = statusConfig[order.status] || statusConfig['Pending'];
                const Icon = cfg.icon;
                return (
                  <div key={order.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''} •{' '}
                            {format(parseISO(order.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white text-sm font-sans">Rs. {order.sellingPrice.toLocaleString()}</p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
            <Heart className="w-8 h-8 mb-4 text-white/70" />
            <p className="text-white/70 text-sm font-medium">Wishlist Items</p>
            <p className="text-4xl font-black mt-1">{wishlistItems.length}</p>
            <Link to="/customer/wishlist">
              <button className="mt-4 bg-white/20 hover:bg-white/30 transition-all text-white text-sm font-bold px-4 py-2 rounded-xl w-full">
                View Wishlist →
              </button>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <Package className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-1">Quick Actions</p>
            <div className="space-y-2 mt-3">
              <Link to="/shop" className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm text-slate-700 dark:text-slate-300 transition-all">
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/customer/orders" className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm text-slate-700 dark:text-slate-300 transition-all">
                Track Orders <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/customer/profile" className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm text-slate-700 dark:text-slate-300 transition-all">
                Edit Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
