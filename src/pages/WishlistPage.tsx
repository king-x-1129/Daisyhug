import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function WishlistPage() {
  const { wishlistItems, loading: wishlistLoading } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishlistProducts() {
      if (wishlistItems.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const productPromises = wishlistItems.map(item => getDoc(doc(db, 'products', item.productId)));
        const productSnaps = await Promise.all(productPromises);
        const productData = productSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() } as Product));
        
        setProducts(productData);
      } catch (error) {
        console.error("Error fetching wishlist products:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!wishlistLoading) {
      fetchWishlistProducts();
    }
  }, [wishlistItems, wishlistLoading]);

  if (loading || wishlistLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-4 w-32 bg-slate-200 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">My Wishlist</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">You have {products.length} items saved for later</p>
        </div>
        <Link to="/shop">
          <Button variant="ghost" className="text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl">
            Continue Shopping <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-rose-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your wishlist is empty</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">Save items you love to your wishlist and they'll appear here.</p>
          <Link to="/shop">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl px-8 h-12 shadow-lg shadow-indigo-100 dark:shadow-none">
              Explore Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-16 p-8 bg-indigo-600 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Ready to checkout?</h3>
              <p className="text-indigo-100 dark:text-indigo-200 font-medium">Move your favorite items to cart and complete your order.</p>
            </div>
          </div>
          <Link to="/cart">
            <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-2xl px-10 h-14 text-lg shadow-xl dark:shadow-none">
              Go to Cart
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
