import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NavCategory {
  label: string;
  to: string;
  children: { label: string; to: string }[];
}

/** Header category tree. `category` maps to Shop's category tabs; `q` drives the Shop search filter. */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Women Corner',
    to: '/shop?category=women',
    children: [
      { label: 'Dresses', to: '/shop?category=women&q=dress' },
      { label: 'Bags & Clutches', to: '/shop?category=women&q=bag' },
      { label: 'Jewellery', to: '/shop?category=women&q=jewel' },
      { label: 'Beauty & Makeup', to: '/shop?category=women&q=beauty' },
    ],
  },
  {
    label: "Men's Fashion",
    to: '/shop?category=men',
    children: [
      { label: 'Shirts', to: '/shop?category=men&q=shirt' },
      { label: 'Watches', to: '/shop?category=men&q=watch' },
      { label: 'Wallets', to: '/shop?category=men&q=wallet' },
      { label: 'Grooming', to: '/shop?category=men&q=groom' },
    ],
  },
  {
    label: 'Kids & Mother',
    to: '/shop?category=kids',
    children: [
      { label: 'Toys', to: '/shop?category=kids&q=toy' },
      { label: 'Baby Care', to: '/shop?category=kids&q=baby' },
      { label: 'Kids Clothing', to: '/shop?category=kids&q=cloth' },
    ],
  },
  {
    label: 'Electronics',
    to: '/shop?q=electronic',
    children: [
      { label: 'Gadgets', to: '/shop?q=gadget' },
      { label: 'Mobile Accessories', to: '/shop?q=mobile' },
      { label: 'Audio & Earbuds', to: '/shop?q=earbuds' },
    ],
  },
  {
    label: 'Home & Kitchen',
    to: '/shop?q=kitchen',
    children: [
      { label: 'Kitchen Tools', to: '/shop?q=kitchen' },
      { label: 'Home Decor', to: '/shop?q=decor' },
      { label: 'Storage & Organizers', to: '/shop?q=organizer' },
    ],
  },
];

/** Desktop: hover (or click/keyboard) to open a two-column mega dropdown. */
export function CategoriesDropdown() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const location = useLocation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const current = NAV_CATEGORIES[active];

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all"
      >
        Categories
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full pt-2 z-50"
          >
            <div className="flex w-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <ul className="w-1/2 p-2 bg-slate-50/70 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-700">
                {NAV_CATEGORIES.map((cat, i) => (
                  <li key={cat.label}>
                    <Link
                      to={cat.to}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        active === i
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                      }`}
                    >
                      {cat.label}
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </Link>
                  </li>
                ))}
                <li className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <Link to="/shop" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-600 hover:bg-white dark:hover:bg-slate-900">
                    <LayoutGrid className="w-4 h-4" /> View All Products
                  </Link>
                </li>
              </ul>
              <div className="w-1/2 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{current.label}</p>
                <ul className="space-y-1">
                  {current.children.map(sub => (
                    <li key={sub.label}>
                      <Link
                        to={sub.to}
                        className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                      >
                        {sub.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={current.to} className="inline-flex items-center gap-1 mt-4 px-3 text-xs font-black text-indigo-600 hover:underline">
                  Shop all {current.label} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Mobile: accordion list inside the hamburger drawer. */
export function MobileCategories({ onNavigate }: { onNavigate: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Categories</p>
      {NAV_CATEGORIES.map(cat => {
        const isOpen = expanded === cat.label;
        return (
          <div key={cat.label} className="rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : cat.label)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between p-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              {cat.label}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900 py-1 space-y-0.5">
                    <Link to={cat.to} onClick={onNavigate} className="block px-3 py-2 rounded-lg text-sm font-black text-indigo-600">
                      All {cat.label}
                    </Link>
                    {cat.children.map(sub => (
                      <Link
                        key={sub.label}
                        to={sub.to}
                        onClick={onNavigate}
                        className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
