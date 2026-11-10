import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AboutUsContent } from '@/types';
import { DEFAULT_ABOUT_US, mergeAboutUs } from '@/lib/aboutUsDefaults';
import { useShop } from '@/context/ShopContext';
import { motion } from 'motion/react';
import {
  Sparkles,
  Target,
  Compass,
  ShieldCheck,
  Users,
  ShoppingBag,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AboutPage() {
  const { settings } = useShop();
  const [content, setContent] = useState<AboutUsContent>(DEFAULT_ABOUT_US);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'aboutUs'),
      (snap) => {
        if (snap.exists()) {
          setContent(mergeAboutUs(snap.data() as Partial<AboutUsContent>));
        } else {
          setContent(DEFAULT_ABOUT_US);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Failed to load About Us from Firestore, using defaults:', err);
        setContent(DEFAULT_ABOUT_US);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const primaryColor = settings?.primaryColor || '#4f46e5';
  const shopName = settings?.shopName || 'DaisyHug';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-200/60 dark:border-slate-800/80 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900/40 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Story & Mission</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
          >
            {content.title || `About ${shopName}`}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            {content.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Key Stats Counter Section */}
      {content.stats && content.stats.length > 0 && (
        <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {content.stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center"
                >
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Story & Background Section */}
      <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {content.storyHeading || 'Our Story'}
            </h2>
          </div>

          <div className="space-y-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {content.storyParagraphs?.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mission Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Our Mission</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base sm:text-lg">
              {content.mission}
            </p>
          </motion.div>

          {/* Vision Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/50 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Our Vision</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base sm:text-lg">
              {content.vision}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values Section */}
      {content.values && content.values.length > 0 && (
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Values That Drive Us
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
              Our guiding principles in every product we pack and every customer we serve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.values.map((val, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{val.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Call to Action Section */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[2.5rem] p-8 sm:p-12 text-white text-center relative overflow-hidden shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, #1e1b4b)` }}
        >
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Join the DaisyHug Family Today
            </h2>
            <p className="text-white/80 text-base sm:text-lg">
              Explore thousands of top-quality retail products or start your own risk-free reselling journey with zero investment.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link to="/shop">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-full px-6 h-12 shadow-lg gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span>Start Shopping</span>
                </Button>
              </Link>
              <Link to="/become-a-reseller">
                <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold rounded-full px-6 h-12 gap-2">
                  <Users className="w-4 h-4" />
                  <span>Become a Reseller</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Quick Details Banner */}
      {(content.contactEmail || content.contactPhone || content.contactAddress) && (
        <section className="py-10 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-around gap-6 text-sm text-slate-600 dark:text-slate-300">
              {content.contactEmail && (
                <a
                  href={`mailto:${content.contactEmail}`}
                  className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>{content.contactEmail}</span>
                </a>
              )}
              {content.contactPhone && (
                <a
                  href={`tel:${content.contactPhone}`}
                  className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{content.contactPhone}</span>
                </a>
              )}
              {content.contactAddress && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{content.contactAddress}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
