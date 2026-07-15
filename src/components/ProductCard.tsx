import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, X, Maximize2, Heart, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Skeleton } from '@/components/ui/skeleton';

interface ProductCardProps {
  product: Product;
}

export const ProductCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 h-full flex flex-col relative">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/20 to-transparent">
          <Skeleton className="h-6 w-20 bg-white/30" />
        </div>
      </div>
      <CardContent className="p-4 flex-grow space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isOpen, setIsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Update image index when variant changes
  useEffect(() => {
    if (selectedVariant?.image) {
      const idx = product.images.indexOf(selectedVariant.image);
      if (idx !== -1) {
        setCurrentImageIndex(idx);
        setQuickViewImageIndex(idx);
      }
    }
  }, [selectedVariant, product.images]);

  const displayPrice = selectedVariant?.price ?? product.price;
  const displayImage = product.images?.[currentImageIndex] || 'https://picsum.photos/seed/product/400/400';

  useEffect(() => {
    let interval: any;
    if (isHovering && product.images && product.images.length > 1 && !selectedVariant) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
      }, 1500);
    } else if (!isHovering && !selectedVariant) {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovering, product.images, selectedVariant]);

  const nextQuickViewImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevQuickViewImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      setIsOpen(true);
      toast.info("Please select a variant");
      return;
    }

    addItem(product, 1, selectedVariant || undefined);
    toast.success(`${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart`);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  return (
    <div 
      className="group h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Card className="premium-card overflow-hidden h-full flex flex-col relative dark:bg-slate-900 border dark:border-slate-800">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Link to={`/product/${product.id}`} className="block h-full">
            <img 
              src={displayImage} 
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <span className="text-lg font-black text-white">{formatPrice(displayPrice)}</span>
            </div>
            
            {/* Image Indicators for hover carousel */}
            {product.images && product.images.length > 1 && isHovering && !selectedVariant && (
              <div className="absolute top-3 left-3 flex gap-1 z-10">
                {product.images.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? 'w-4 bg-white' : 'w-1 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </Link>

          {/* Wishlist Button */}
          <button 
            onClick={handleWishlist}
            className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isInWishlist(product.id) 
                ? 'bg-rose-500 text-white' 
                : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-400 dark:text-slate-350 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
          </button>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger 
                render={
                  <Button 
                    variant="secondary" 
                    className="rounded-full shadow-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold px-6 h-10 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Quick View
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-4xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 border dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="aspect-square md:aspect-auto bg-slate-50 dark:bg-slate-950 relative group/modal">
                    <img 
                      src={product.images?.[quickViewImageIndex] || 'https://picsum.photos/seed/product/400/400'} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Modal Carousel Controls */}
                    {product.images && product.images.length > 1 && !selectedVariant && (
                      <>
                        <button 
                          onClick={prevQuickViewImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-lg opacity-0 group-hover/modal:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={nextQuickViewImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-lg opacity-0 group-hover/modal:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                          {product.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setQuickViewImageIndex(idx);
                              }}
                              className={`w-2 h-2 rounded-full transition-all ${
                                idx === quickViewImageIndex ? 'w-6 bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-indigo-600 dark:text-indigo-400 border-none font-bold px-3 py-1 rounded-full shadow-sm">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-8 md:p-10 flex flex-col bg-white dark:bg-slate-900">
                    <DialogHeader className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">New Arrival</span>
                      </div>
                      <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                        {product.title}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 flex-grow">
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{formatPrice(displayPrice)}</span>
                        <span className="text-slate-400 dark:text-slate-500 line-through text-sm font-medium">{formatPrice(displayPrice * 1.2)}</span>
                      </div>

                      {/* Variant Selection in Quick View */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Variant</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                                  selectedVariant?.id === variant.id
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {variant.name}
                                {selectedVariant?.id === variant.id && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {(selectedVariant ? selectedVariant.stock : product.stock) > 0 ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {selectedVariant ? selectedVariant.stock : product.stock} Units in Stock
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 rounded-full text-xs font-bold border border-rose-100 dark:border-rose-900/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Out of Stock
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description</h4>
                        <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                          <p className="text-slate-600 dark:text-slate-350 leading-relaxed text-sm font-medium">
                            {product.description || "Experience premium quality with our latest collection. This product is designed for those who value both style and functionality."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 space-y-4">
                      <Button 
                        onClick={(e) => {
                          handleAddToCart(e);
                          setIsOpen(false);
                        }}
                        disabled={product.stock <= 0}
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]"
                      >
                        <ShoppingCart className="w-5 h-5 mr-3" />
                        Add to Cart
                      </Button>
                      <Link to={`/product/${product.id}`} className="block" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 h-12 rounded-xl">
                          View Full Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-grow flex flex-col bg-white dark:bg-slate-900">
          <Link to={`/product/${product.id}`} className="block">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm leading-snug">
                {product.title}
              </h3>

              {/* Variant Selection in Main Card */}
              {product.variants && product.variants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {product.variants.slice(0, 3).map((variant) => (
                    <button
                      key={variant.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVariant(variant);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                  {product.variants.length > 3 && (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center">+{product.variants.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{product.category}</span>
                {(selectedVariant ? selectedVariant.stock : product.stock) > 0 ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    In Stock
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-450 px-2 py-0.5 rounded-full">
                    Sold Out
                  </span>
                )}
              </div>
            </CardContent>
          </Link>
          <CardFooter className="p-4 pt-0">
            <Link to={`/product/${product.id}`} className="w-full">
              <Button 
                disabled={(selectedVariant ? selectedVariant.stock : product.stock) <= 0}
                className="w-full bg-slate-900 dark:bg-slate-800 dark:hover:bg-indigo-600 hover:bg-indigo-600 text-white font-bold rounded-xl h-10 transition-all active:scale-95 group/btn"
              >
                <ShoppingCart className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                {selectedVariant ? 'Add to Cart' : 'Select Option'}
              </Button>
            </Link>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
};
