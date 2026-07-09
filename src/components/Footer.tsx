import { useLocation } from 'react-router-dom';

export function Footer() {
  const location = useLocation();
  const isAdminPath = 
    location.pathname === '/auth/admini' || 
    location.pathname === '/admin-login' || 
    location.pathname.startsWith('/admin/') || 
    location.pathname === '/admin' || 
    location.pathname.startsWith('/super-admin');

  if (isAdminPath) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">
              Resellx<span className="text-indigo-500">pk</span>
            </h3>
            <p className="text-slate-400 max-w-sm">
              Pakistan's leading platform for resellers to start their business with zero investment. 
              Earn profit from home with our reliable shipping and return management.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-indigo-400 transition-colors">Home</a></li>
              <li><a href="/become-reseller" className="hover:text-indigo-400 transition-colors">Become a Reseller</a></li>
              <li><a href="/auth" className="hover:text-indigo-400 transition-colors">Login / Register</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: support@resellxpk.com</li>
              <li>Phone: +92 300 1234567</li>
              <li>Address: Karachi, Pakistan</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Resellxpk. All rights reserved.</p>
          <p className="text-slate-500">
            Developed by <a href="https://hightouchlabs.ai" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">HighTouchLabs.ai</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
