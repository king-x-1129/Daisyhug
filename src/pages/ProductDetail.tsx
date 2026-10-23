import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, ProductVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { ProductReviews } from '@/components/ProductReviews';
import {
  ShoppingCart,
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  Copy,
  Sparkles,
  Heart,
  Facebook,
  Twitter,
  MessageCircle,
  Lock,
  ChevronRight,
  ChevronLeft,
  Home,
  CheckCircle2,
  Box,
  FileText,
  Star,
  Info,
  Clock,
  PackageCheck,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, profile, isReseller, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);

  // Gallery active image index
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Quantity selection
  const [quantity, setQuantity] = useState(1);

  // Dynamic color/size states
  const [selectedSize, setSelectedSize] = useState('Default');
  const [selectedColor, setSelectedColor] = useState('Default');

  // Below the fold tabs
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'shipping' | 'reviews'>('details');

  // Copied indicator state for sharing
  const [hasCopiedDetails, setHasCopiedDetails] = useState(false);

  // Role check: ONLY authenticated users with reseller or admin privileges see reseller tools
  const isResellerOrAdmin = Boolean(
    user && (
      isReseller ||
      isAdmin ||
      profile?.role === 'reseller' ||
      profile?.role === 'admin' ||
      profile?.role === 'super-admin'
    )
  );

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'products', id));
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(productData);
          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // Gallery image list (including variant images if distinct)
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs = [...(product.images || [])];
    if (selectedVariant?.image && !imgs.includes(selectedVariant.image)) {
      imgs.unshift(selectedVariant.image);
    }
    return imgs.length > 0 ? imgs : ['/placeholder.png'];
  }, [product, selectedVariant]);

  // Ensure active index is within bounds
  useEffect(() => {
    if (activeImageIndex >= galleryImages.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, galleryImages.length]);

  // When variant changes and has image, switch gallery to that image
  useEffect(() => {
    if (selectedVariant?.image) {
      const idx = galleryImages.indexOf(selectedVariant.image);
      if (idx !== -1) {
        setActiveImageIndex(idx);
      }
    }
  }, [selectedVariant, galleryImages]);

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const currentImage = galleryImages[activeImageIndex] || galleryImages[0] || '';

  // Calculate profit margin for resellers (20% or selling - companyPrice)
  const estimatedProfit = useMemo(() => {
    if (!product) return 0;
    if (product.companyPrice && product.price > product.companyPrice) {
      return product.price - product.companyPrice;
    }
    return Math.round(currentPrice * 0.2);
  }, [product, currentPrice]);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out ${product.title} on DaisyHug!\n\n${product.description}`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Referral link copied to clipboard!');
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
    const text = `Check out ${product.title} on DaisyHug!`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.id}?ref=${user?.uid || ''}`;
    const text = `Check out ${product.title} on DaisyHug! Price: ${formatPrice(currentPrice)}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyDetails = () => {
    if (!product) return;
    const details = `Product: ${product.title}\nCategory: ${product.category}\nPrice: ${formatPrice(currentPrice)}\n\nDescription:\n${product.description}\n\nOrder now on DaisyHug!`;
    navigator.clipboard.writeText(details);
    setHasCopiedDetails(true);
    toast.success('Product details copied to clipboard!');
    setTimeout(() => setHasCopiedDetails(false), 3000);
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast.error('Please select a variant option first');
      return;
    }
    addItem(product, quantity, selectedVariant || undefined);
    toast.success(`${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast.error('Please select a variant option first');
      return;
    }
    addItem(product, quantity, selectedVariant || undefined);
    navigate('/checkout');
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-10 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
          <Box className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Product Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          The product you are looking for may have been removed or is temporarily unavailable.
        </p>
        <Button onClick={() => navigate('/shop')} className="rounded-xl font-bold bg-indigo-600 text-white">
          Return to Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900 dark:text-white transition-colors">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. TOP BREADCRUMB NAVIGATION & BACK LINK
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <nav aria-label="Breadcrumbs" className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <Link to="/shop" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Shop
          </Link>
          {product.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              <Link
                to={`/shop?category=${encodeURIComponent(product.category)}`}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 capitalize transition-colors"
              >
                {product.category}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
            {product.title}
          </span>
        </nav>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-transparent h-8 px-2.5 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
        </Button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. TWO-COLUMN SPLIT LAYOUT (Gallery Left, Buying Box Right)
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ── LEFT COLUMN: HIGH-RES PRODUCT IMAGE GALLERY ── */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          {/* Main Image Stage */}
          <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square w-full rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group">
            <img
              src={currentImage}
              alt={product.title}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            {/* Overlays: Stock Badge */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {currentStock > 0 ? (
                currentStock <= 5 ? (
                  <Badge className="bg-amber-500/90 text-white border-none font-bold text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
                    Only {currentStock} left!
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600/90 text-white border-none font-bold text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
                    In Stock
                  </Badge>
                )
              ) : (
                <Badge className="bg-rose-600/90 text-white border-none font-bold text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Floating Wishlist Button */}
            <button
              type="button"
              onClick={() => (isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product.id))}
              aria-label={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : 'hover:text-rose-500'
                }`}
              />
            </button>

            {/* Image Counter */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 right-4 z-10 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-bold tracking-wider">
                {activeImageIndex + 1} / {galleryImages.length}
              </div>
            )}

            {/* Previous / Next Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Selector Strip */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImageIndex === i
                      ? 'border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: BUYING BOX (Product Information & Actions) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Title & Metadata Section */}
          <div className="space-y-3">
            {/* Category Badge & Review Rating Summary */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                {product.category || 'Lifestyle'}
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <div className="flex items-center text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <span className="underline decoration-slate-300">Reviews</span>
              </button>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {product.title}
            </h1>

            {/* Product Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {product.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Price & In-Stock Status */}
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                {formatPrice(currentPrice)}
              </span>
              {/* Show strikethrough only when the product has an explicit compareAtPrice field */}
              {(product as any).compareAtPrice && (product as any).compareAtPrice > currentPrice && (
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 line-through">
                  {formatPrice((product as any).compareAtPrice)}
                </span>
              )}
            </div>

            <div>
              {currentStock > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Sizing & Colors Selectors (if product has sizes or colors configured) */}
          {((product as any).sizes && (product as any).sizes.length > 0) ||
          ((product as any).colors && (product as any).colors.length > 0) ? (
            <div className="space-y-4 pt-1">
              {(product as any).sizes && (product as any).sizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="uppercase tracking-wider">Select Size</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{selectedSize}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(product as any).sizes.map((sz: string) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          selectedSize === sz
                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 bg-transparent'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(product as any).colors && (product as any).colors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="uppercase tracking-wider">Select Color</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(product as any).colors.map((col: string) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          selectedColor === col
                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 bg-transparent'
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

          {/* Variants Selection (if product has explicit variants) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span>Select Variant</span>
                {selectedVariant && (
                  <span className="text-indigo-600 dark:text-indigo-400 normal-case">{selectedVariant.name}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      selectedVariant?.id === variant.id
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>{variant.name}</span>
                    {variant.price && (
                      <span className="ml-1.5 opacity-75">({formatPrice(variant.price)})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quantity:
            </span>
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="w-10 h-10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                -
              </button>
              <span className="w-12 text-center font-black text-sm text-slate-900 dark:text-white font-sans select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(currentStock > 0 ? Math.min(currentStock, quantity + 1) : quantity + 1)}
                aria-label="Increase quantity"
                className="w-10 h-10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            {quantity > 1 && (
              <span className="text-xs text-slate-500 font-medium">
                Total: <strong className="text-slate-900 dark:text-white">{formatPrice(currentPrice * quantity)}</strong>
              </span>
            )}
          </div>

          {/* Primary Action Buttons (Add to Cart & Buy Now) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className="flex-1 h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </Button>

              <Button
                type="button"
                onClick={handleBuyNow}
                disabled={currentStock <= 0}
                className="flex-1 h-13 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-md transition-all text-sm cursor-pointer"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* ── TRUST REASSURANCE BADGES (Directly Below CTA) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <div className="flex flex-col items-center text-center gap-1.5 p-2">
              <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold leading-tight">Fast Delivery</span>
              <span className="text-[10px] text-slate-400">2-4 Days COD</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 p-2">
              <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold leading-tight">14-Day Returns</span>
              <span className="text-[10px] text-slate-400">Hassle-Free</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 p-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold leading-tight">100% Genuine</span>
              <span className="text-[10px] text-slate-400">Quality Checked</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 p-2">
              <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold leading-tight">Secure COD</span>
              <span className="text-[10px] text-slate-400">Pay on Delivery</span>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────
              CONDITIONAL RESELLER SECTION
              STRICT CHECK: Only rendered if user is logged in as Reseller or Admin
             ──────────────────────────────────────────────────────────────────────── */}
          {isResellerOrAdmin && (
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-indigo-950 dark:text-indigo-300">
                      Reseller Partner Tools
                    </h3>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                      Exclusive tools for registered resellers
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                    Estimated Profit
                  </span>
                  <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                    +{formatPrice(estimatedProfit)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyDetails}
                  className="bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl font-bold h-11 text-xs transition-colors cursor-pointer"
                >
                  {hasCopiedDetails ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Details
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  className="bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl font-bold h-11 text-xs transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share Link
                </Button>
              </div>

              {/* Social Channels Share */}
              <div className="flex items-center justify-between pt-2 border-t border-indigo-100/60 dark:border-indigo-900/30 text-xs">
                <span className="text-[11px] font-bold text-indigo-900/70 dark:text-indigo-300/70">
                  Quick Share:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={shareToWhatsApp}
                    title="Share via WhatsApp"
                    className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={shareToFacebook}
                    title="Share to Facebook"
                    className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 dark:border-blue-800 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Facebook className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={shareToTwitter}
                    title="Share to Twitter"
                    className="w-8 h-8 rounded-full bg-sky-50 hover:bg-sky-500 text-sky-600 hover:text-white border border-sky-200 dark:border-sky-800 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Twitter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. BELOW THE FOLD: TABBED PRODUCT INFORMATION & REVIEWS
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="mt-16 sm:mt-24 pt-8 border-t border-slate-100 dark:border-slate-800">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Product Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Specifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'shipping'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Shipping & Returns</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Customer Reviews</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="py-8">
          {/* Tab 1: Product Details */}
          {activeTab === 'details' && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                  About This Product
                </h3>
                <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                  {product.description
                    ? product.description
                        .split('\n')
                        .filter((line) => line.trim() !== '')
                        .map((line, i) => (
                          <p key={i} className="flex items-start gap-2">
                            <span className="text-indigo-600 dark:text-indigo-400 mt-1 font-bold">•</span>
                            <span>{line.trim()}</span>
                          </p>
                        ))
                    : 'No description provided.'}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Authenticity</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">100% Brand Certified</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Stock Availability</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {currentStock > 0 ? `${currentStock} items in warehouse` : 'Out of stock'}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Method</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Cash on Delivery & Online</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Specifications */}
          {activeTab === 'specs' && (
            <div className="max-w-4xl">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                Technical Specifications
              </h3>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-slate-500 font-medium">Product Category</span>
                      <span className="font-bold text-slate-900 dark:text-white capitalize">{product.category}</span>
                    </div>
                    <div className="flex justify-between p-3.5">
                      <span className="text-slate-500 font-medium">SKU / Item ID</span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{product.id}</span>
                    </div>
                    <div className="flex justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-slate-500 font-medium">Available Variants</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {product.variants ? product.variants.length : 1}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-slate-500 font-medium">Delivery Mode</span>
                      <span className="font-bold text-slate-900 dark:text-white">Nationwide Courier COD</span>
                    </div>
                    <div className="flex justify-between p-3.5">
                      <span className="text-slate-500 font-medium">Packaging</span>
                      <span className="font-bold text-slate-900 dark:text-white">Secure DaisyHug Box</span>
                    </div>
                    <div className="flex justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-slate-500 font-medium">Returns Window</span>
                      <span className="font-bold text-slate-900 dark:text-white">14 Calendar Days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Shipping & Returns */}
          {activeTab === 'shipping' && (
            <div className="max-w-4xl space-y-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                Shipping & Return Policy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">Standard Delivery</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Orders are processed within 24 hours. Nationwide delivery takes 2 to 4 business days to your doorstep via Leopards, Trax, or TCS.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">14-Day Return Guarantee</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    If you are not satisfied with your purchase, you can return or exchange the product within 14 days in its original condition and packaging.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div className="max-w-5xl">
              <ProductReviews productId={product.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
