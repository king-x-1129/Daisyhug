import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Product } from '@/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { 
  ShoppingBag, Search, ChevronRight, 
  Sparkles, Heart, Package, User, Users, Baby
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useShop } from '@/context/ShopContext';
import { motion } from 'motion/react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'women', label: 'Women Corner', icon: User },
  { id: 'men', label: 'Men\'s Fashion', icon: Users },
  { id: 'kids', label: 'Kids & Mother', icon: Baby },
];

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const { settings } = useShop();

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.LIST, 'products');
        } else {
          console.error("Error fetching products:", error);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || 
                            product.category.toLowerCase() === activeCategory.toLowerCase() ||
                            (activeCategory === 'women' && product.category.toLowerCase().includes('women')) ||
                            (activeCategory === 'men' && product.category.toLowerCase().includes('men')) ||
                            (activeCategory === 'kids' && (product.category.toLowerCase().includes('kids') || product.category.toLowerCase().includes('mother')));
      
      const matchesMinPrice = !minPrice || product.price >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || product.price <= Number(maxPrice);

      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'in-stock' && product.stock > (product.lowStockThreshold || 5)) ||
        (stockFilter === 'out-of-stock' && product.stock === 0) ||
        (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= (product.lowStockThreshold || 5));

      const matchesTag = tagFilter === 'all' || (product.tags && product.tags.includes(tagFilter));

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesStock && matchesTag;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'company-price-asc':
          return a.companyPrice - b.companyPrice;
        case 'company-price-desc':
          return b.companyPrice - a.companyPrice;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [searchQuery, products, activeCategory, minPrice, maxPrice, stockFilter, tagFilter, sortBy]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Top Search Bar Area */}
      <div className="bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border-b dark:border-slate-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search products, codes, or suppliers..." 
                className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-base focus-visible:ring-2 focus-visible:ring-indigo-600 shadow-inner dark:text-white focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border dark:border-slate-700 flex-1 md:flex-none">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  className="w-full md:w-20 h-10 border-none bg-transparent text-xs font-black focus-visible:ring-0 dark:text-white"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                <Input 
                  type="number" 
                  placeholder="Max" 
                  className="w-full md:w-20 h-10 border-none bg-transparent text-xs font-black focus-visible:ring-0 dark:text-white"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <select 
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-black text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer flex-1 md:flex-none shadow-sm"
              >
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              <select 
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer flex-1 md:flex-none"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer flex-1 md:flex-none"
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="company-price-asc">Company Price: Low to High</option>
                <option value="company-price-desc">Company Price: High to Low</option>
              </select>

              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  setMinPrice('');
                  setMaxPrice('');
                  setStockFilter('all');
                  setTagFilter('all');
                  setSortBy('newest');
                }}
                variant="ghost" 
                className="h-12 px-4 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-8 overflow-x-auto no-scrollbar py-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'border-indigo-600 text-indigo-600 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Products Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" style={{ color: settings.primaryColor }} />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeCategory === 'all' 
                  ? settings.heroTitle 
                  : `${CATEGORIES.find(c => c.id === activeCategory)?.label || 'Category'} Collection`}
              </h2>
            </div>
            <Button variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">No products found in this category.</p>
              <Button 
                variant="link" 
                className="text-indigo-600 font-bold mt-2"
                onClick={() => setActiveCategory('all')}
              >
                Back to All Products
              </Button>
            </div>
          )}
        </section>

        {/* Second Section - Best Sellers (Only on 'all' category) */}
        {activeCategory === 'all' && products.length > 5 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-600" />
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Best Sellers</h2>
              </div>
              <Button variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {products.slice().reverse().slice(0, 5).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
