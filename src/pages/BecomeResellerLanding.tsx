import { ShoppingBag, Truck, ShieldCheck, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'motion/react';

export function BecomeResellerLanding() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile && isAdmin) {
      if (profile.email === 'kingx1129@gmail.com' || user.email === 'kingx1129@gmail.com') {
        navigate('/super-admin');
      } else {
        navigate('/admin');
      }
    }
  }, [user, profile, isAdmin, navigate]);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-slate-900 pt-20 pb-32 overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="relative z-10 space-y-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                Pakistan's #1 Reseller Platform
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white leading-[0.95] tracking-tighter text-gradient">
                Empower Your <br />
                <span className="text-indigo-600">Business</span> Journey
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-300 leading-relaxed max-w-xl font-medium">
                Join thousands of successful entrepreneurs. Start your online business with 
                <span className="text-slate-900 dark:text-white font-bold"> zero investment</span> and access premium products with high margins.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 pt-4">
                <Link to="/become-reseller">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 h-16 text-lg rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/">
                  <Button size="lg" variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-black px-12 h-16 text-lg rounded-2xl transition-all hover:scale-105 active:scale-95">
                    Browse Products
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-50 dark:bg-indigo-950/10 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-50 dark:bg-purple-950/10 rounded-full blur-3xl opacity-50" />
              
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative w-full max-w-lg">
                  {/* Main Mobile Phone Mockup with continuous cascading animation inside */}
                  <motion.div 
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative z-10 bg-white dark:bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-8 border-slate-900 dark:border-slate-800 overflow-hidden aspect-[9/19] w-64 mx-auto lg:mr-0 lg:ml-auto"
                  >
                    <div className="absolute top-0 left-0 w-full h-6 bg-slate-900 flex justify-center items-center z-20">
                      <div className="w-12 h-1 bg-slate-800 rounded-full" />
                    </div>
                    
                    <div className="mt-6 flex flex-col h-[400px] relative overflow-hidden text-[11px]">
                      {/* App Header (Sticky-like at top) */}
                      <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                        <span className="font-black text-indigo-600 dark:text-indigo-400">Resellx.pk</span>
                        <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                      </div>

                      {/* Continuous vertical cascading container */}
                      <div className="relative flex-1 overflow-hidden mt-2">
                        <motion.div
                          animate={{
                            y: [0, -320]
                          }}
                          transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="space-y-4 absolute w-full"
                        >
                          {/* Set of widgets (First Set) */}
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl space-y-1 shadow-sm">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Live Profit Counter</div>
                            <div className="flex justify-between items-baseline">
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-450">Rs. 18,450</span>
                              <span className="text-[9px] font-black text-emerald-600">+15% today</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-850 flex justify-between items-center h-10 shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Stitched Kurti</p>
                              <p className="text-[8px] text-slate-400">Order #8423</p>
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">+Rs. 650</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-850 flex justify-between items-center h-10 shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Oxford Shoes</p>
                              <p className="text-[8px] text-slate-400">Order #8424</p>
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">+Rs. 1,200</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-850 space-y-2 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Order Dispatch</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="flex-1">
                                  <p className="font-bold text-slate-700 dark:text-slate-300">Delivered</p>
                                  <p className="text-[8px] text-slate-400">TCS: 140823901</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Duplicate Set for seamless looping */}
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl space-y-1 shadow-sm">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Live Profit Counter</div>
                            <div className="flex justify-between items-baseline">
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-450">Rs. 18,450</span>
                              <span className="text-[9px] font-black text-emerald-600">+15% today</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-850 flex justify-between items-center h-10 shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Stitched Kurti</p>
                              <p className="text-[8px] text-slate-400">Order #8423</p>
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">+Rs. 650</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border dark:border-slate-850 flex justify-between items-center h-10 shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Oxford Shoes</p>
                              <p className="text-[8px] text-slate-400">Order #8424</p>
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">+Rs. 1,200</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-850 space-y-2 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Order Dispatch</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="flex-1">
                                  <p className="font-bold text-slate-700 dark:text-slate-300">Delivered</p>
                                  <p className="text-[8px] text-slate-400">TCS: 140823901</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Secondary Mockup (Desktop style) with synchronized pulse animations */}
                  <motion.div 
                    animate={{
                      y: [0, 10, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                    className="absolute -bottom-10 -left-10 hidden md:block w-80 aspect-video bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-100 dark:border-slate-800 overflow-hidden z-20"
                  >
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 flex items-center px-2 gap-1">
                      <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Window title placeholder with synchronized pulse */}
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-850 rounded animate-pulse" />
                        <div className="h-3 w-1/5 bg-indigo-100 dark:bg-indigo-950/40 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                      </div>
                      
                      {/* Staggered loading grid lines simulating chart data/metrics */}
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="h-14 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-2 border border-indigo-50/50 dark:border-indigo-900/10 space-y-1 flex flex-col justify-between animate-pulse">
                          <div className="h-2 w-2/3 bg-indigo-200 dark:bg-indigo-900/50 rounded" />
                          <div className="h-4 w-full bg-indigo-600/20 dark:bg-indigo-400/20 rounded" />
                        </div>
                        
                        <div className="h-14 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-2 border border-purple-50/50 dark:border-purple-900/10 space-y-1 flex flex-col justify-between animate-pulse" style={{ animationDelay: '0.2s' }}>
                          <div className="h-2 w-2/3 bg-purple-200 dark:bg-purple-900/50 rounded" />
                          <div className="h-4 w-full bg-purple-600/20 dark:bg-purple-400/20 rounded" />
                        </div>
                        
                        <div className="h-14 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-2 border border-emerald-50/50 dark:border-emerald-900/10 space-y-1 flex flex-col justify-between animate-pulse" style={{ animationDelay: '0.4s' }}>
                          <div className="h-2 w-2/3 bg-emerald-200 dark:bg-emerald-950/50 rounded" />
                          <div className="h-4 w-full bg-emerald-600/20 dark:bg-emerald-400/20 rounded" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Why Choose Us?</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">We provide the infrastructure, products, and support you need to build a successful reselling business from scratch.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: ShoppingBag, title: "Quality Products", desc: "Handpicked items from top suppliers", color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" },
            { icon: Truck, title: "Fast Shipping", desc: "Reliable delivery via TCS & Leopards", color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" },
            { icon: Wallet, title: "Instant Profit", desc: "Set your own margins and earn big", color: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400" },
            { icon: ShieldCheck, title: "Secure Returns", desc: "Hassle-free return management", color: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400" }
          ].map((feature, i) => (
            <div key={i} className="premium-card p-8 group">
              <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Active Resellers", value: "50K+" },
              { label: "Products Delivered", value: "1M+" },
              { label: "Cities Covered", value: "200+" },
              { label: "Daily Orders", value: "5K+" }
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-5xl font-black text-white tracking-tighter">{stat.value}</p>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
