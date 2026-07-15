import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, ProductVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RotateCcw, Share2, Copy, Sparkles, Heart, Facebook, Twitter, MessageCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, isReseller, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);

  // Quantity selection
  const [quantity, setQuantity] = useState(1);

  // Dynamic color/size states
  const [selectedSize, setSelectedSize] = useState('Default');
  const [selectedColor, setSelectedColor] = useState('Default');

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-900 dark:text-white transition-colors duration-350">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 font-bold bg-transparent">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 shadow-sm">
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
                className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${!selectedVariant && product.images[0] === img ? 'border-indigo-650' : 'border-transparent hover:border-indigo-500'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Details Layout */}
        <div className="space-y-6">
          {/* 1. Category/Tag */}
          <div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs mb-1.5">{product.category}</p>
            
            {/* 2. Product Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2 leading-tight">
              {product.title}
            </h1>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {product.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-705 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-850" />

          {/* 3. Price Display */}
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-sans">{formatPrice(currentPrice)}</span>
            {currentStock > 0 ? (
              <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-full px-3 py-0.5 text-xs font-bold">
                In Stock
              </Badge>
            ) : (
              <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-full px-3 py-0.5 text-xs font-bold">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Sizing & Colors Selectors if arrays exist */}
          {((product as any).sizes && (product as any).sizes.length > 0) || ((product as any).colors && (product as any).colors.length > 0) ? (
            <div className="space-y-4 pt-2">
              {/* Sizes Selection */}
              {(product as any).sizes && (product as any).sizes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Size: {selectedSize}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(product as any).sizes.map((sz: string) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                          selectedSize === sz
                            ? 'border-indigo-600 bg-indigo-50/10 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-400 bg-transparent'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors Selection */}
              {(product as any).colors && (product as any).colors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Color: {selectedColor}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(product as any).colors.map((col: string) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                          selectedColor === col
                            ? 'border-indigo-600 bg-indigo-50/10 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-400 bg-transparent'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Variant</h3>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                      selectedVariant?.id === variant.id
                        ? 'border-indigo-600 bg-indigo-50/10 text-indigo-655 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {variant.name}
                    {variant.price && (
                      <span className="ml-1.5 text-[10px] opacity-75">({formatPrice(variant.price)})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Call-to-Actions (Quantity + aligned Buttons) */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:bg-transparent dark:border-slate-850">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-350">Quantity:</span>
              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <button 
                  type="button" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center font-bold text-slate-650 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-805"
                >
                  -
                </button>
                <span className="w-10 text-center font-black text-sm text-slate-900 dark:text-white font-sans">{quantity}</span>
                <button 
                  type="button" 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center font-bold text-slate-655 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-805"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => {
                  if (product.variants && product.variants.length > 0 && !selectedVariant) {
                    toast.error("Please select a variant first");
                    return;
                  }
                  addItem(product, quantity, selectedVariant || undefined);
                  toast.success(`${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart`);
                }}
                disabled={currentStock <= 0}
                className="flex-1 h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg border-none"
              >
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
              <Button 
                onClick={() => {
                  if (product.variants && product.variants.length > 0 && !selectedVariant) {
                    toast.error("Please select a variant first");
                    return;
                  }
                  addItem(product, quantity, selectedVariant || undefined);
                  navigate('/checkout');
                }}
                disabled={currentStock <= 0}
                className="flex-1 h-13 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold rounded-2xl shadow-md border-none"
              >
                Buy Now
              </Button>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product.id)}
              className={`w-full h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-transparent font-bold ${isInWishlist(product.id) ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
              {isInWishlist(product.id) ? 'Saved to Wishlist' : 'Add to Wishlist'}
            </Button>
          </div>

          {/* Reseller Tools */}
          {(isReseller || isAdmin) && (
            <div className="bg-indigo-50/30 dark:bg-indigo-950/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-400">Reseller Tools</h3>
                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-650 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-full shadow-sm uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Profit: {formatPrice(Math.round(product.price * 0.2))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={copyDetails}
                  className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-bold h-11"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy Details
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleShare}
                  className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-bold h-11"
                >
                  <Share2 className="w-3.5 h-3.5 mr-2" /> Share Link
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-4 pt-1">
                <button 
                  onClick={shareToFacebook}
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all shadow-sm"
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button 
                  onClick={shareToTwitter}
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all shadow-sm"
                  title="Share on Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button 
                  onClick={shareToWhatsApp}
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 5. Structured "Product Details" Section */}
          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-850">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Product Details</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-350">
              {product.description.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                <li key={i} className="leading-relaxed">{line.trim()}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 dark:border-slate-850">
            <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
              <Truck className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Fast Delivery
            </div>
            <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
              <RotateCcw className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              14-Day Returns
            </div>
            <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Quality Assured
            </div>
            <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Secure Payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
