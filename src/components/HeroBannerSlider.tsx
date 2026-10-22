import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { BannerSlide } from '@/types';

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'default-slide-1',
    image: 'https://apricot.com.pk/cdn/shop/files/Apricot_Winter_Collection.png?v=1791809609&width=2000',
    badge: 'NEW WINTER ARRIVALS',
    title: 'Luxury Home & Lifestyle Collection',
    subtitle: 'From cozy bed linen and comforters to contemporary home essentials, experience unmatched elegance.',
    primaryCtaText: 'Shop New Arrivals',
    primaryCtaLink: '/shop',
    secondaryCtaText: 'Become a Reseller',
    secondaryCtaLink: '/become-a-reseller',
    order: 1,
    isActive: true,
  },
  {
    id: 'default-slide-2',
    image: 'https://apricot.com.pk/cdn/shop/files/ChatGPT_Image_Sep_10_2026_11_50_24_PM.png?v=1789066260&width=2000',
    badge: 'WHOLESALE & DROPSHIPPING',
    title: "Pakistan's Leading Reseller Network",
    subtitle: 'Start your zero-investment online store today. Set custom profit margins, with automated nationwide COD delivery.',
    primaryCtaText: 'Start Selling Today',
    primaryCtaLink: '/become-a-reseller',
    secondaryCtaText: 'Browse Catalog',
    secondaryCtaLink: '/shop',
    order: 2,
    isActive: true,
  },
  {
    id: 'default-slide-3',
    image: 'https://apricot.com.pk/cdn/shop/files/ChatGPT_Image_Aug_20_2026_04_01_09_PM.png?v=1787224815&width=2000',
    badge: 'FLAT 20% OFF — CODE: DAISY20',
    title: 'Curated Trends For Every Room',
    subtitle: 'Premium craftsmanship delivered to your doorstep across 100+ cities in Pakistan with Cash on Delivery.',
    primaryCtaText: 'Explore Best Sellers',
    primaryCtaLink: '/shop',
    secondaryCtaText: 'View All Deals',
    secondaryCtaLink: '/shop',
    order: 3,
    isActive: true,
  },
];

export function HeroBannerSlider({ slides: propSlides }: { slides?: BannerSlide[] }) {
  const [dbSlides, setDbSlides] = useState<BannerSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<number>(1);

  // Subscribe to Firestore banners if slides not passed via props
  useEffect(() => {
    if (propSlides && propSlides.length > 0) return;

    let unsubscribe: () => void = () => {};

    try {
      const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: BannerSlide[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as Omit<BannerSlide, 'id'>;
              list.push({ id: doc.id, ...data });
            });
            // Filter only active slides and sort by order
            const activeList = list
              .filter((item) => item.isActive !== false)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            setDbSlides(activeList);
          } else {
            setDbSlides([]);
          }
        },
        (error) => {
          console.warn('Banner slides fetch fallback:', error);
          setDbSlides([]);
        }
      );
    } catch (err) {
      console.warn('Banner slides listener error, using fallback:', err);
    }

    return () => unsubscribe();
  }, [propSlides]);

  const slides = useMemo(() => {
    if (propSlides && propSlides.length > 0) return propSlides;
    if (dbSlides.length > 0) return dbSlides;
    return DEFAULT_SLIDES;
  }, [propSlides, dbSlides]);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, totalSlides]);

  // Handle bounds
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, totalSlides]);

  if (totalSlides === 0) return null;

  const current = slides[currentIndex] || slides[0];

  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      scale: 1.05,
      x: dir > 0 ? 80 : -80,
    }),
    center: {
      zIndex: 1,
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: (dir: number) => ({
      zIndex: 0,
      opacity: 0,
      scale: 0.98,
      x: dir > 0 ? -80 : 80,
      transition: {
        duration: 0.4,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-slate-900 h-[360px] sm:h-[440px] md:h-[500px] lg:h-[560px] select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current.id || currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          {/* Background Image with Fallback gradient */}
          <div className="absolute inset-0 bg-slate-950">
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover object-center filter brightness-[0.88]"
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {/* Apricot-inspired dark gradient overlays for maximum legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />
          </div>

          {/* Banner Content Container */}
          <div className="relative z-10 max-w-7xl mx-auto h-full px-6 sm:px-10 lg:px-12 flex flex-col justify-center">
            <div className="max-w-xl sm:max-w-2xl space-y-4 sm:space-y-5 text-white">
              {current.badge && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {current.badge}
                </motion.div>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white drop-shadow-sm"
              >
                {current.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm sm:text-base md:text-lg text-slate-200/90 font-medium line-clamp-3 leading-relaxed max-w-lg"
              >
                {current.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-wrap items-center gap-3 pt-2"
              >
                {current.primaryCtaText && current.primaryCtaLink && (
                  <Link to={current.primaryCtaLink}>
                    <Button
                      size="lg"
                      className="h-11 sm:h-12 px-6 sm:px-8 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl hover:shadow-white/20 transition-all flex items-center gap-2 group/btn cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{current.primaryCtaText}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                )}

                {current.secondaryCtaText && current.secondaryCtaLink && (
                  <Link to={current.secondaryCtaLink}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md text-white border-white/30 hover:border-white font-bold text-sm transition-all cursor-pointer"
                    >
                      {current.secondaryCtaText}
                    </Button>
                  </Link>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Apricot-style Counter Badge */}
      <div className="absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold tracking-wider">
        <span className="text-white">{currentIndex + 1}</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-400">{totalSlides}</span>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((slide, idx) => (
          <button
            key={slide.id || idx}
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all rounded-full cursor-pointer ${
              currentIndex === idx
                ? 'w-8 h-2.5 bg-white shadow-md'
                : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
