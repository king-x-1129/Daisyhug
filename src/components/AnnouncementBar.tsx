import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { AnnouncementItem } from '@/types';

const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'default-1',
    text: '✨ Exclusive Sale is LIVE! Use code ',
    highlight: 'DAISY10',
    link: '/shop',
    order: 1,
    isActive: true,
  },
  {
    id: 'default-2',
    text: '🚚 Free Delivery Across Pakistan on Orders Over Rs. 2,500',
    link: '/shop',
    order: 2,
    isActive: true,
  },
  {
    id: 'default-3',
    text: '💳 Cash on Delivery (COD) & Online Debit/Credit Cards Accepted',
    link: '/shop',
    order: 3,
    isActive: true,
  },
];

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Subscribe dynamically to Firestore announcements
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const q = query(collection(db, 'announcements'), orderBy('order', 'asc'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: AnnouncementItem[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as Omit<AnnouncementItem, 'id'>;
              list.push({ id: doc.id, ...data });
            });
            // Filter only active items and sort by order
            const activeList = list
              .filter((item) => item.isActive !== false)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            setAnnouncements(activeList);
          } else {
            setAnnouncements([]);
          }
        },
        (error) => {
          console.warn('Announcements fetch fallback:', error);
          setAnnouncements([]);
        }
      );
    } catch (err) {
      console.warn('Announcements listener error, using fallback:', err);
    }

    return () => unsubscribe();
  }, []);

  // Use dynamic list if populated with active items, otherwise fallback to defaults
  const displayItems = useMemo(() => {
    if (announcements.length > 0) return announcements;
    return DEFAULT_ANNOUNCEMENTS;
  }, [announcements]);

  const totalItems = displayItems.length;

  useEffect(() => {
    if (isPaused || totalItems <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalItems);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, totalItems]);

  // Keep index within bounds if list shrinks
  useEffect(() => {
    if (currentIndex >= totalItems && totalItems > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, totalItems]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalItems);
  };

  if (totalItems === 0) return null;

  const current = displayItems[currentIndex] || displayItems[0];

  return (
    <div
      className="bg-slate-900 text-white text-xs py-2 px-3 sm:px-6 relative z-50 overflow-hidden border-b border-slate-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          aria-label="Previous announcement"
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Center Animated Announcement */}
        <div className="flex-1 flex items-center justify-center min-h-[22px] px-2 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id || currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center gap-1.5 flex-wrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {current.link ? (
                <Link
                  to={current.link}
                  className="hover:underline flex items-center gap-1 text-[11px] sm:text-xs font-medium tracking-wide text-slate-100"
                >
                  <span>{current.text}</span>
                  {current.highlight && (
                    <span className="font-bold underline decoration-amber-400 decoration-2 text-amber-300">
                      ({current.highlight})
                    </span>
                  )}
                  {current.highlight && <span> at checkout</span>}
                </Link>
              ) : (
                <span className="text-[11px] sm:text-xs font-medium tracking-wide text-slate-100">
                  <span>{current.text}</span>
                  {current.highlight && (
                    <span className="font-bold text-amber-300 ml-1">
                      ({current.highlight})
                    </span>
                  )}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          aria-label="Next announcement"
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
