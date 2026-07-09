import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, LayoutDashboard, ShieldCheck, Sparkles, ShoppingBag, Zap, Heart, ChevronDown, Settings, Package, MessageCircle, Users, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useShop } from '@/context/ShopContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, profile, isAdmin, isReseller, isCustomer } = useAuth();
  const { settings } = useShop();
  const { items } = useCart();
  const { wishlistItems } = useWishlist();
  const { currency, setCurrency } = useCurrency();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
  }, [navigate]);

  const isAdminPath = 
    location.pathname === '/auth/admini' || 
    location.pathname === '/admin-login' || 
    location.pathname.startsWith('/admin/') || 
    location.pathname === '/admin' || 
    location.pathname.startsWith('/super-admin');

  if (isAdminPath) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  const dashboardPath = isReseller ? '/reseller' : isCustomer ? '/customer' : '/admin';

  const ThemeToggle = ({ className = '' }: { className?: string }) => (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
        isDark
          ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      } ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

  const LogoBlock = () => (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link to="/" className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(to bottom right, ${settings.primaryColor}, ${settings.primaryColor}dd)`,
            boxShadow: `0 10px 15px -3px ${settings.primaryColor}33`,
          }}
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
          ) : (
            <Zap className="w-6 h-6 text-white fill-white/20" />
          )}
        </div>
        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
          {settings.shopName.split('pk')[0]}
          <span style={{ color: settings.primaryColor }}>
            {settings.shopName.includes('pk') ? 'pk' : ''}
          </span>
        </span>
      </Link>
    </motion.div>
  );

  // ─── PORTAL NAV (reseller / customer) ────────────────────────────────────────
  if ((isReseller || isCustomer) && !isAdmin) {
    return (
      <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <LogoBlock />

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <ThemeToggle />

              {/* Cart for customers */}
              {isCustomer && (
                <Link to="/cart" className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
                  <ShoppingCart className="w-5 h-5" />
                  {items.length > 0 && (
                    <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {items.length}
                    </span>
                  )}
                </Link>
              )}

              <Link to={dashboardPath}>
                <Button
                  className="font-bold rounded-full px-5 h-10 flex items-center gap-2 shadow-lg shadow-indigo-100 text-white"
                  style={{ background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.primaryColor}cc)` }}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ─── FULL PUBLIC NAV (guests, admin) ─────────────────────────────────────────
  return (
    <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-10">
            <div className="flex items-center">
              <LogoBlock />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {([
                { to: '/', label: 'Home' },
                { to: '/shop', label: 'Shop' },
                { to: '/become-reseller', label: 'Become a Reseller' },
              ] as { to: string; label: string; icon?: any; color?: string }[]).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm transition-all group"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {link.icon && <link.icon className={`w-4 h-4 ${link.color}`} />}
                    {link.label}
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl opacity-0 group-hover:opacity-100 -z-0"
                    initial={false}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
              <button onClick={() => setCurrency('PKR')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${currency === 'PKR' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>PKR</button>
              <button onClick={() => setCurrency('USD')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${currency === 'USD' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>USD</button>
            </div>

            <Link to="/wishlist" className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors">
              <Heart className="w-5 h-5" />
              {wishlistItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            <Link to="/cart" className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {items.length}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 group p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-transparent group-hover:border-indigo-600 transition-all">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                              {profile?.photoURL ? (
                                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                                  <User className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-900 dark:text-white truncate">{profile?.fullName || 'User'}</p>
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{profile?.role || 'Member'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 space-y-1">
                          <p className="px-3 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account</p>
                          <Link to="/profile" className="flex items-center px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-all group" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 flex items-center justify-center mr-3 transition-colors">
                              <Settings className="w-4 h-4" />
                            </div>
                            My Profile
                          </Link>

                          {isAdmin && (
                            <>
                              <p className="px-3 pt-4 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</p>
                              <Link to="/admin" className="flex items-center px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all group" onClick={() => setIsUserMenuOpen(false)}>
                                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 group-hover:bg-white flex items-center justify-center mr-3 transition-colors">
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                Admin Panel
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="p-2 border-t border-slate-50 dark:border-slate-800 mt-2">
                          <button
                            onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                            className="flex items-center w-full px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 group-hover:bg-white dark:group-hover:bg-slate-800 flex items-center justify-center mr-3 transition-colors">
                              <LogOut className="w-4 h-4" />
                            </div>
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full px-6 h-10 shadow-lg shadow-indigo-100">
                  Download the App
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Buttons */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Link to="/cart" className="relative p-2 text-slate-600 dark:text-slate-300">
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 dark:text-slate-300">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-slate-900 z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: `linear-gradient(to bottom right, ${settings.primaryColor}, ${settings.primaryColor}dd)` }}>
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-slate-900 dark:text-white tracking-tighter">Menu</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Navigation</p>
                  {([
                    { to: '/', label: 'Home', icon: ShoppingBag },
                    { to: '/shop', label: 'Shop', icon: Package },
                    { to: '/wishlist', label: 'My Wishlist', icon: Heart },
                    { to: '/become-reseller', label: 'Become a Reseller', icon: Users },
                    { to: '/contact', label: 'Contact Us', icon: MessageCircle },
                  ] as { to: string; label: string; icon: any; color?: string }[]).map((link) => (
                    <Link
                      key={link.to} to={link.to}
                      className={`flex items-center gap-4 p-3 rounded-2xl font-bold transition-all ${
                        link.color
                          ? link.color + ' bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Account</p>
                  {user ? (
                    <div className="space-y-1">
                      <Link to="/profile" className="flex items-center gap-4 p-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setIsOpen(false)}>
                        <User className="w-5 h-5" /> My Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-4 p-3 rounded-2xl font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30" onClick={() => setIsOpen(false)}>
                          <ShieldCheck className="w-5 h-5" /> Admin Panel
                        </Link>
                      )}
                    </div>
                  ) : (
                    <Link to="/auth" className="flex items-center gap-4 p-4 rounded-2xl font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setIsOpen(false)}>
                      <User className="w-5 h-5" /> Login / Register
                    </Link>
                  )}
                </div>

                {/* Dark mode toggle row */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Appearance</span>
                    <button
                      onClick={toggleTheme}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${
                        isDark
                          ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Currency</span>
                    <div className="flex bg-white dark:bg-slate-700 rounded-full p-1 shadow-sm border border-slate-100 dark:border-slate-600">
                      <button onClick={() => setCurrency('PKR')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${currency === 'PKR' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>PKR</button>
                      <button onClick={() => setCurrency('USD')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${currency === 'USD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>USD</button>
                    </div>
                  </div>
                </div>
              </div>

              {user && (
                <div className="p-6 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <button
                    onClick={() => { setIsOpen(false); handleLogout(); }}
                    className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-all"
                  >
                    <LogOut className="w-5 h-5" /> Logout Account
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
