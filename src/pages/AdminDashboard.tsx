import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, CreditCard, ChevronRight, Sparkles, ShieldCheck, Palette, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AdminOverview } from './admin/AdminOverview';
import { ProductManagement } from './admin/ProductManagement';
import { OrderManagement } from './admin/OrderManagement';
import { ResellerManagement } from './admin/ResellerManagement';
import { WithdrawalManagement } from './admin/WithdrawalManagement';
import { ShopCustomization } from './admin/ShopCustomization';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function AdminDashboard() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/auth/admini');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAdmin) return <Navigate to="/admin-login" replace />;

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
    { icon: Users, label: 'Resellers', path: '/admin/resellers' },
    { icon: CreditCard, label: 'Withdrawals', path: '/admin/withdrawals' },
    { icon: Palette, label: 'Customize Shop', path: '/admin/customize' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between min-h-screen">
        <div className="space-y-8">
          <div className="hidden md:block">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Admin Panel</h2>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full flex items-center justify-start gap-3 text-rose-450 hover:text-rose-300 hover:bg-slate-800 rounded-xl py-3 px-4 h-auto font-bold border-none"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8">
        <PageHeader 
          title="Admin Dashboard" 
          subtitle="Manage your platform operations" 
          icon={ShieldCheck} 
          accentColor="bg-rose-600"
        />
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="resellers" element={<ResellerManagement />} />
          <Route path="withdrawals" element={<WithdrawalManagement />} />
          <Route path="customize" element={<ShopCustomization />} />
        </Routes>
      </main>
    </div>
  );
}
