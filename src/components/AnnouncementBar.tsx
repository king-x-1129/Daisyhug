import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { AnnouncementItem } from '@/types';

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          setLoading(false);
        },
        (error) => {
          console.warn('Announcements fetch error:', error);
          setAnnouncements([]);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('Announcements listener error:', err);
      setAnnouncements([]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const totalItems = announcements.length;

  useEffect(() => {
    if (isPaused || totalItems <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (totalItems || 1));
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

  // While loading or if there are no announcements configured, do not render or flash anything
  if (loading || totalItems === 0) {
    return null;
  }

  const current = announcements[currentIndex] || announcements[0];

  return (
    <div
      className="bg-slate-900 text-white text-xs py-2 px-3 sm:px-6 relative z-50 overflow-hidden border-b border-slate-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Arrow (only if multiple items exist) */}
        {totalItems > 1 ? (
          <button
            onClick={handlePrev}
            aria-label="Previous announcement"
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-6" />
        )}

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

        {/* Right Arrow (only if multiple items exist) */}
        {totalItems > 1 ? (
          <button
            onClick={handleNext}
            aria-label="Next announcement"
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>
    </div>
  );
}
