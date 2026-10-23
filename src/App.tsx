import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Home } from '@/pages/Home';
import { ProductDetail } from '@/pages/ProductDetail';
import { ResellerDashboard } from '@/pages/ResellerDashboard';
import { CustomerDashboard } from '@/pages/CustomerDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { SuperAdminPanel } from '@/pages/admin/SuperAdminPanel';
import { AuthPage } from '@/pages/AuthPage';
import { BecomeReseller } from '@/pages/BecomeReseller';
import { BecomeResellerLanding } from '@/pages/BecomeResellerLanding';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { Contact } from '@/pages/Contact';
import { Profile } from '@/pages/Profile';
import { Shop } from '@/pages/Shop';
import { WishlistPage } from '@/pages/WishlistPage';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ShopProvider } from '@/context/ShopContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

// ─── Route Guard Components ────────────────────────────────────────────────────

/** Blocks access to /admin/* — redirects non-admins to admin login */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const hasToasted = useRef(false);

  useEffect(() => {
    if (!loading && !isAdmin && !hasToasted.current) {
      hasToasted.current = true;
      toast.error('Access denied. Admin privileges required.');
    }
  }, [loading, isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}

/** Blocks access to /reseller/* — redirects non-resellers to auth */
function ResellerRoute({ children }: { children: React.ReactNode }) {
  const { isReseller, isAdmin, loading } = useAuth();
  const hasToasted = useRef(false);

  useEffect(() => {
    if (!loading && !isReseller && !isAdmin && !hasToasted.current) {
      hasToasted.current = true;
      toast.error('Access denied. Reseller account required.');
    }
  }, [loading, isReseller, isAdmin]);

  if (loading) return null;
  // Allow admins to view reseller portal for support purposes
  if (!isReseller && !isAdmin) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Blocks access to /customer/* — redirects non-customers to auth */
function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { isCustomer, isAdmin, loading } = useAuth();

  if (loading) return null;
  // Allow admins to view customer portal for support purposes
  if (!isCustomer && !isAdmin) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Blocks access to /super-admin — only super-admin email accounts */
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const hasToasted = useRef(false);

  const isSuperAdmin =
    profile?.role === 'super-admin' ||
    user?.email === 'kingx1129@gmail.com' ||
    user?.email === 'storeilia08@gmail.com';

  useEffect(() => {
    if (!loading && !isSuperAdmin && !hasToasted.current) {
      hasToasted.current = true;
      toast.error('Access denied. Super-admin privileges required.');
    }
  }, [loading, isSuperAdmin]);

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}

// ─── App Shell (needs AuthContext in scope for guards) ────────────────────────

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/admini" element={<AuthPage />} />
          <Route path="/admin-login" element={<AuthPage />} />
          <Route path="/become-reseller" element={<BecomeReseller />} />
          <Route path="/become-a-reseller" element={<BecomeResellerLanding />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={<Shop />} />

          {/* Protected: Reseller Portal */}
          <Route
            path="/reseller/*"
            element={
              <ResellerRoute>
                <ResellerDashboard />
              </ResellerRoute>
            }
          />

          {/* Protected: Customer Portal */}
          <Route
            path="/customer/*"
            element={
              <CustomerRoute>
                <CustomerDashboard />
              </CustomerRoute>
            }
          />

          {/* Protected: Admin Dashboard */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Protected: Super Admin Panel */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminPanel />
              </SuperAdminRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ShopProvider>
        <AuthProvider>
          <CurrencyProvider>
            <WishlistProvider>
              <CartProvider>
                <Router>
                  <AppShell />
                </Router>
              </CartProvider>
            </WishlistProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ShopProvider>
    </ThemeProvider>
  );
}
