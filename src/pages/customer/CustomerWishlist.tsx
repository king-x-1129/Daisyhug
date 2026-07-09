import { useState, useEffect } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { Heart, ShoppingCart, Trash2, Package, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Product } from '@/types';

export function CustomerWishlist() {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch products for all wishlist items
  useEffect(() => {
    if (wishlistItems.length === 0) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }
    const productIds = wishlistItems.map(w => w.productId);
    // Firestore 'in' query supports up to 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 30) {
      chunks.push(productIds.slice(i, i + 30));
    }
    Promise.all(
      chunks.map(chunk =>
        getDocs(query(collection(db, 'products'), where('__name__', 'in', chunk)))
      )
    ).then(snapshots => {
      const fetched: Product[] = [];
      snapshots.forEach(snap => {
        snap.docs.forEach(d => fetched.push({ id: d.id, ...d.data() } as Product));
      });
      setProducts(fetched);
      setLoadingProducts(false);
    }).catch(() => setLoadingProducts(false));
  }, [wishlistItems]);

  const wishlistWithProducts = wishlistItems
    .map(item => ({ item, product: products.find(p => p.id === item.productId) }))
    .filter(x => x.product) as { item: typeof wishlistItems[0]; product: Product }[];

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    toast.success(`${product.title} added to cart!`);
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
  };

  if (loadingProducts) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Wishlist</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {wishlistWithProducts.length > 0
            ? `${wishlistWithProducts.length} saved item${wishlistWithProducts.length > 1 ? 's' : ''}`
            : 'Items you save for later will appear here.'}
        </p>
      </div>

      {wishlistWithProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-rose-300 dark:text-rose-450" />
          </div>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">Your wishlist is empty</p>
          <p className="text-sm text-slate-455 dark:text-slate-500 mb-6">Save products you love to buy later.</p>
          <Link
            to="/shop"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {wishlistWithProducts.map(({ item, product }) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-slate-50 dark:bg-slate-950 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                       src={product.images[0]}
                       alt={product.title}
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-850/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white font-black text-sm bg-black/50 px-3 py-1 rounded-full">Out of Stock</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm mb-1">{product.title}</h3>
                  </Link>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-sans">Rs. {product.price.toLocaleString()}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-650 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                    <Link
                      to={`/product/${product.id}`}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
