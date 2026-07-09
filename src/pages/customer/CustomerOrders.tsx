import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { Package, Truck, CheckCircle, Clock, XCircle, RotateCcw, ChevronDown, ChevronUp, MapPin, Phone, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'All' | OrderStatus;

const STATUS_STEPS: OrderStatus[] = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  Pending:   { color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/20',   border: 'border-amber-300 dark:border-amber-900/50',   icon: Clock,       label: 'Pending' },
  Confirmed: { color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/20',    border: 'border-blue-300 dark:border-blue-900/50',    icon: Package,     label: 'Confirmed' },
  Packed:    { color: 'text-indigo-700 dark:text-indigo-400',  bg: 'bg-indigo-100 dark:bg-indigo-950/20',  border: 'border-indigo-300 dark:border-indigo-900/50',  icon: Package,     label: 'Packed' },
  Shipped:   { color: 'text-purple-700 dark:text-purple-400',  bg: 'bg-purple-100 dark:bg-purple-950/20',  border: 'border-purple-300 dark:border-purple-900/50',  icon: Truck,       label: 'Shipped' },
  Delivered: { color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-100 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-900/50', icon: CheckCircle, label: 'Delivered' },
  Returned:  { color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/20',    border: 'border-rose-300 dark:border-rose-900/50',    icon: RotateCcw,   label: 'Returned' },
  Refused:   { color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/20',    border: 'border-rose-300 dark:border-rose-900/50',    icon: XCircle,     label: 'Refused' },
  Cancelled: { color: 'text-slate-550 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800/50',   border: 'border-slate-300 dark:border-slate-700/50',   icon: XCircle,     label: 'Cancelled' },
};

const filters: FilterType[] = ['All', 'Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'];

function OrderTimeline({ order }: { order: Order }) {
  const currentIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = ['Cancelled', 'Returned', 'Refused'].includes(order.status);

  if (isCancelled) {
    const cfg = statusConfig[order.status];
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
        <div>
          <p className={`font-bold text-sm ${cfg.color}`}>Order {order.status}</p>
          {order.cancellationNote && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.cancellationNote}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress Bar */}
      <div className="flex items-center mb-2 overflow-x-auto py-2 no-scrollbar">
        {STATUS_STEPS.map((step, i) => {
          const isCompleted = currentIdx >= i;
          const isCurrent = currentIdx === i;
          const cfg = statusConfig[step];
          const Icon = cfg.icon;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                } ${isCurrent ? 'ring-4 ring-indigo-100 dark:ring-indigo-950/50' : ''}`}>
                  <Icon className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-slate-350 dark:text-slate-500'}`} />
                </div>
                <p className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${
                  isCompleted ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                }`}>{step}</p>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 min-w-[2.5rem] h-0.5 mx-1 mb-5 rounded-full transition-all ${
                  currentIdx > i ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status History */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="mt-4 space-y-2 pl-2 border-l-2 border-indigo-100 dark:border-indigo-950">
          {[...order.statusHistory].reverse().map((update, i) => {
            const cfg = statusConfig[update.status] || statusConfig['Pending'];
            return (
              <div key={i} className="flex items-start gap-3 pl-4 relative">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-400" />
                <div>
                  <p className={`text-xs font-bold ${cfg.color}`}>{update.status}</p>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500">
                    {format(parseISO(update.timestamp), 'MMM dd, yyyy • hh:mm a')}
                  </p>
                  {update.note && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">{update.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking Number */}
      {order.trackingNumber && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-800/80">
          <Truck className="w-4 h-4 text-indigo-500" />
          <span className="font-medium">Tracking:</span>
          <span className="font-black text-indigo-600 dark:text-indigo-400">{order.trackingNumber}</span>
          {order.carrier && <span className="text-slate-400 dark:text-slate-500">via {order.carrier}</span>}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[order.status] || statusConfig['Pending'];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {/* Card Header */}
      <div
        className="p-5 cursor-pointer flex items-start justify-between gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-slate-900 dark:text-white text-sm">#{order.id.slice(-10).toUpperCase()}</p>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(order.createdAt), 'MMM dd, yyyy')}
              </span>
              <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {order.customerCity}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="font-black text-indigo-650 dark:text-indigo-400 font-sans">Rs. {order.sellingPrice.toLocaleString()}</p>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-slate-50 dark:border-slate-800 pt-4">
              {/* Tracking Timeline */}
              <div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Order Tracking</p>
                <OrderTimeline order={order} />
              </div>

              {/* Items */}
              <div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Items Ordered</p>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.title} <span className="text-slate-400 dark:text-slate-500">×{item.quantity}</span></span>
                      <span className="font-black text-slate-900 dark:text-white font-sans">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                    <span className="font-bold text-slate-650 dark:text-slate-400">Total Paid</span>
                    <span className="font-black text-indigo-650 dark:text-indigo-400 text-base font-sans">Rs. {order.sellingPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Delivery Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1">Name</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{order.customerName}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1">Phone</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {order.customerPhone}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 sm:col-span-2">
                    <p className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase mb-1">Address</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-sm flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                      {order.customerAddress}, {order.customerCity}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');

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

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Orders</h1>
        <p className="text-slate-505 dark:text-slate-400 mt-1 font-medium">Track the status of all your purchases.</p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filter === f
                ? 'bg-indigo-600 text-white shadow-lg dark:shadow-none'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-650 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {f} {f !== 'All' && orders.filter(o => o.status === f).length > 0 && (
              <span className={`ml-1 ${filter === f ? 'text-indigo-200' : 'text-slate-400'}`}>
                ({orders.filter(o => o.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Package className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold text-slate-500 dark:text-slate-400">No {filter !== 'All' ? filter.toLowerCase() : ''} orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
