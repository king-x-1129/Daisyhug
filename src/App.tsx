import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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


export default function App() {
  return (
    <ThemeProvider>
    <ShopProvider>
      <AuthProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <CartProvider>
              <Router>
                <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
                  <Navbar />
                  <main className="flex-grow">
                    <Routes>
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
                      <Route path="/reseller/*" element={<ResellerDashboard />} />
                      <Route path="/customer/*" element={<CustomerDashboard />} />
                      <Route path="/admin/*" element={<AdminDashboard />} />
                      <Route path="/super-admin" element={<SuperAdminPanel />} />
                    </Routes>
                  </main>
                  <Footer />
                  <Toaster position="top-center" />
                </div>
              </Router>
            </CartProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ShopProvider>
    </ThemeProvider>
  );
}
