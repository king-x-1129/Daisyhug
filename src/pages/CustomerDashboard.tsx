import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Heart, User, LogOut, Menu, X, ChevronRight, Package, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CustomerOverview } from './customer/CustomerOverview';
import { CustomerOrders } from './customer/CustomerOrders';
import { CustomerWishlist } from './customer/CustomerWishlist';
import { CustomerProfile } from './customer/CustomerProfile';
import { CustomerWallet } from './customer/CustomerWallet';
import { useWishlist } from '@/context/WishlistContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/customer', color: 'from-violet-500 to-indigo-600' },
  { icon: ShoppingBag, label: 'My Orders', path: '/customer/orders', color: 'from-amber-400 to-orange-500' },
  { icon: Heart, label: 'Wishlist', path: '/customer/wishlist', color: 'from-rose-500 to-pink-600' },
  { icon: User, label: 'Profile & Tracking', path: '/customer/profile', color: 'from-emerald-500 to-teal-600' },
  { icon: Wallet, label: 'My Wallet', path: '/customer/wallet', color: 'from-indigo-500 to-purple-600' },
];

export function CustomerDashboard() {
  const { isCustomer, loading, profile } = useAuth();
  const { wishlistItems } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-2xl shadow-indigo-500/40">
          <Package className="w-7 h-7 text-white" />
        </div>
        <p className="text-indigo-300 font-medium">Loading your dashboard…</p>
      </div>
    </div>
  );

  if (!isCustomer) return <Navigate to="/auth" />;

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)' }}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm">My Dashboard</p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Customer Portal</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* User Card */}
      <div className="p-4 mx-4 mt-4 rounded-2xl border border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg flex-shrink-0">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile?.fullName?.charAt(0) || 'C'
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.fullName || 'Customer'}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
              {profile?.isVerified ? '✓ Verified Member' : 'Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-grow p-4 space-y-1 mt-2">
        <p className="px-3 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/customer' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? `bg-gradient-to-br ${item.color} shadow-md`
                  : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm flex-grow">{item.label}</span>
              {item.path === '/customer/wishlist' && wishlistItems.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistItems.length}
                </span>
              )}
              {isActive && <ChevronRight className="w-4 h-4 text-slate-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          to="/shop"
          onClick={onClose}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg"
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Shopping
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 sticky top-0 h-screen flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden"
            >
              <Sidebar onClose={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden text-white p-4 flex items-center justify-between sticky top-0 z-30 border-b border-white/10"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm">My Dashboard</span>
          </div>
          <div className="w-9" />
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <Routes>
            <Route index element={<CustomerOverview />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="wishlist" element={<CustomerWishlist />} />
            <Route path="profile" element={<CustomerProfile />} />
            <Route path="wallet" element={<CustomerWallet />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
