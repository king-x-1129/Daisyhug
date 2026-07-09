import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ShoppingBag, Wallet, ChevronRight, LogOut, Menu, X, TrendingUp, Settings, ShieldAlert, Clock } from 'lucide-react';
import { ResellerOverview } from './reseller/ResellerOverview';
import { PlaceOrder } from './reseller/PlaceOrder';
import { OrdersList } from './reseller/OrdersList';
import { WalletPage } from './reseller/WalletPage';
import { ProfitReport } from './reseller/ProfitReport';
import { ResellerSettings } from './reseller/ResellerSettings';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview',        path: '/reseller',             color: 'from-indigo-500 to-indigo-600' },
  { icon: PlusCircle,     label: 'Place New Order',  path: '/reseller/place-order', color: 'from-emerald-500 to-emerald-600' },
  { icon: ShoppingBag,    label: 'My Orders',        path: '/reseller/orders',      color: 'from-amber-500 to-amber-600' },
  { icon: TrendingUp,     label: 'Profit Report',    path: '/reseller/profit-report', color: 'from-purple-500 to-purple-600' },
  { icon: Wallet,         label: 'Wallet & Withdraw',path: '/reseller/wallet',      color: 'from-rose-500 to-rose-600' },
  { icon: Settings,       label: 'Settings',         path: '/reseller/settings',    color: 'from-slate-500 to-slate-600' },
];

export function ResellerDashboard() {
  const { isReseller, loading, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <p className="text-slate-400 font-medium">Loading your portal…</p>
      </div>
    </div>
  );

  if (!isReseller) return <Navigate to="/auth" />;

  // ─── VERIFICATION GATE ─────────────────────────────────────────────────────
  if (!profile?.isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Verification Pending</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Welcome, <span className="text-white font-bold">{profile?.fullName}</span>! Your reseller account has been created but is currently under review.
              <br /><br />
              An admin will verify your profile shortly. You'll get full access to your dashboard once approved.
            </p>

            <div className="space-y-3 text-left bg-white/5 rounded-2xl p-4 mb-6">
              {[
                'Profile submitted for review',
                'Admin verification in progress',
                'Dashboard access granted',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    i === 0 ? 'bg-emerald-500 text-white' :
                    i === 1 ? 'bg-amber-500/30 border border-amber-500/50 text-amber-400' :
                    'bg-white/10 text-slate-500'
                  }`}>
                    {i === 0 ? '✓' : i === 1 ? <Clock className="w-3.5 h-3.5" /> : '3'}
                  </div>
                  <span className={`text-sm font-medium ${
                    i === 0 ? 'text-emerald-400' :
                    i === 1 ? 'text-amber-400' :
                    'text-slate-600'
                  }`}>{step}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 mb-4">Usually takes less than 24 hours. Contact support if you've been waiting longer.</p>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm">Reseller Portal</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Dashboard</p>
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
      <div className="p-4 mx-4 mt-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
            {profile?.fullName?.charAt(0) || 'R'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.fullName || 'Reseller'}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Active Reseller ✓</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className="text-xs font-black text-white">Rs. {(profile?.walletBalance || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Balance</p>
          </div>
          <div className="text-center border-l border-white/10">
            <p className="text-xs font-black text-emerald-400">Rs. {(profile?.pendingProfit || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Pending</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-grow p-4 space-y-1 mt-2">
        <p className="px-3 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive ? `bg-gradient-to-br ${item.color} shadow-lg` : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm flex-grow">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-slate-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
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
        <header className="lg:hidden bg-slate-950 text-white p-4 flex items-center justify-between sticky top-0 z-30 border-b border-white/10">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm">Reseller Portal</span>
          </div>
          <div className="w-9" />
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route index element={<ResellerOverview />} />
            <Route path="place-order" element={<PlaceOrder />} />
            <Route path="orders" element={<OrdersList />} />
            <Route path="profit-report" element={<ProfitReport />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="settings" element={<ResellerSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
