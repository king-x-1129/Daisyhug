import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Review, ProductVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RotateCcw, Star, Share2, Copy, Download, Sparkles, Heart, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProductReviews } from '@/components/ProductReviews';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, isReseller } = useAuth();
  const { formatPrice } = useCurrency();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this amazing product: ${product.title}\n\n${product.description}`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const shareToFacebook = () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToTwitter = () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;
    const text = `Check out this amazing product: ${product.title}`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;
    const text = `Check out this amazing product: ${product.title}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  };

  const copyDetails = () => {
    if (!product) return;
    const details = `Product: ${product.title}\nCategory: ${product.category}\nPrice: ${formatPrice(product.price)}\n\nDescription:\n${product.description}\n\nOrder now!`;
    navigator.clipboard.writeText(details);
    toast.success("Product details copied!");
  };

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'reviews'), where('productId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(data);
    });
    return () => unsubscribe();
  }, [id]);




  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() } as Product;
        setProduct(productData);
        // Select first variant by default if available
        if (productData.variants && productData.variants.length > 0) {
          setSelectedVariant(productData.variants[0]);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const currentImage = selectedVariant?.image ?? product?.images[0] ?? '';

  if (loading) return <div className="flex h-screen items-center justify-center">Loading product...</div>;
  if (!product) return <div className="text-center py-20">Product not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-900 dark:text-white">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
            <img 
              src={currentImage} 
              alt={product.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((img, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedVariant(null)} // Reset variant if clicking main gallery
                className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${!selectedVariant && product.images[0] === img ? 'border-indigo-600' : 'border-transparent hover:border-indigo-600 dark:hover:border-indigo-500'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <p className="text-indigo-600 dark:text-indigo-450 font-bold uppercase tracking-widest text-sm mb-2">{product.category}</p>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">{product.title}</h1>
            
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag, i) => (
                  <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full font-bold">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => {
                  const avg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
                  return (
                    <Star 
                      key={s} 
                      className={`w-4 h-4 ${s <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                    />
                  );
                })}
              </div>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {reviews.length > 0 
                  ? `${(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} (${reviews.length} reviews)` 
                  : 'No reviews yet'}
              </span>
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatPrice(currentPrice)}</span>
              {currentStock > 0 ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-none rounded-full px-3">
                  In Stock
                </Badge>
              ) : (
                <Badge className="bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 border-none rounded-full px-3">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <Button 
                size="lg" 
                onClick={() => {
                  if (product.variants && product.variants.length > 0 && !selectedVariant) {
                    toast.error("Please select a variant first");
                    return;
                  }
                  addItem(product, 1, selectedVariant || undefined);
                  toast.success(`${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart`);
                }}
                disabled={currentStock <= 0}
                className="flex-grow h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product.id)}
                className={`h-14 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 font-bold px-8 ${isInWishlist(product.id) ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/50' : 'dark:text-white'}`}
              >
                <Heart className={`w-5 h-5 mr-2 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                {isInWishlist(product.id) ? 'Saved' : 'Save for Later'}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => {
                  if (product.variants && product.variants.length > 0 && !selectedVariant) {
                    toast.error("Please select a variant first");
                    return;
                  }
                  addItem(product, 1, selectedVariant || undefined);
                  toast.success(`${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart`);
                  navigate('/checkout');
                }}
                disabled={currentStock <= 0}
                className="h-14 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-bold px-8"
              >
                Buy Now
              </Button>
            </div>

            {/* Variants Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Select Variant</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                        selectedVariant?.id === variant.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-indigo-200'
                      }`}
                    >
                      {variant.name}
                      {variant.price && (
                        <span className="ml-2 text-[10px] opacity-70">
                          ({formatPrice(variant.price)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reseller Tools */}
            {isReseller && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-450">Reseller Tools</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-450 bg-white dark:bg-slate-900 px-2 py-1 rounded-full shadow-sm uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Profit Potential: {formatPrice(Math.round(product.price * 0.2))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={copyDetails}
                    className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-650 hover:text-white rounded-xl font-bold h-12"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copy Details
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                    className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-650 hover:text-white rounded-xl font-bold h-12"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share & Earn
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button 
                    onClick={shareToFacebook}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all shadow-sm"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={shareToTwitter}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all shadow-sm"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={shareToWhatsApp}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-[10px] text-indigo-400 dark:text-indigo-300 text-center font-medium">
                  Share this product with your profit margin and earn on every sale!
                </p>
              </div>
            )}
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{product.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-y border-slate-200 dark:border-slate-800">
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <Truck className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-450" />
              Fast Delivery
            </div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <RotateCcw className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-450" />
              7-Day Returns
            </div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-450" />
              Quality Assured
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />
    </div>
  );
}
