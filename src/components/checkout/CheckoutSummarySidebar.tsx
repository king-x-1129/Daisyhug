import React from 'react';
import { Ticket, X, ShieldCheck, Lock, Truck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Coupon, CartItem } from '@/types';

interface CheckoutSummarySidebarProps {
  items: CartItem[];
  total: number;
  shippingCost: number;
  discountAmount: number;
  appliedCoupon: Coupon | null;
  couponCode: string;
  isApplyingCoupon: boolean;
  onCouponChange: (code: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  formatPrice: (amount: number) => string;
}

export function CheckoutSummarySidebar({
  items,
  total,
  shippingCost,
  discountAmount,
  appliedCoupon,
  couponCode,
  isApplyingCoupon,
  onCouponChange,
  onApplyCoupon,
  onRemoveCoupon,
  formatPrice,
}: CheckoutSummarySidebarProps) {
  const finalTotal = total - discountAmount;
  const orderTotal = Math.max(0, finalTotal + shippingCost);

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-7 sticky top-24 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Order Summary</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {items.reduce((acc, it) => acc + it.quantity, 0)} items
          </span>
        </h2>
      </div>

      {/* Itemized Cart Items (Shopify Thumbnail + Badge Style) */}
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
        {items.map((item) => {
          const cartItemId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
          const displayImage = item.selectedVariant?.image || (item.images && item.images[0]) || '';

          return (
            <div key={cartItemId} className="flex items-center gap-3.5">
              {/* Thumbnail with Quantity Badge */}
              <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shrink-0 flex items-center justify-center">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ShoppingBag className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                )}
                {/* Quantity Badge on Top-Right */}
                <span className="absolute -top-2 -right-2 bg-slate-600 dark:bg-slate-500 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {item.quantity}
                </span>
              </div>

              {/* Title & Variant Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {item.title}
                </p>
                {item.selectedVariant && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                    {item.selectedVariant.name}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Qty: {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>

              {/* Item Total */}
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo / Discount Code Block (Shopify Style) */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {!appliedCoupon ? (
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Discount code (e.g. DAISY10)"
                value={couponCode}
                onChange={(e) => onCouponChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onApplyCoupon();
                  }
                }}
                className="pl-9 h-11 text-xs rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white uppercase placeholder:normal-case font-medium focus-visible:ring-indigo-500"
              />
            </div>
            <Button
              type="button"
              onClick={onApplyCoupon}
              disabled={isApplyingCoupon || !couponCode.trim()}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-white rounded-xl px-4 h-11 text-xs font-bold transition-all disabled:opacity-50"
            >
              {isApplyingCoupon ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                  {appliedCoupon.code}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {appliedCoupon.type === 'percentage'
                    ? `${appliedCoupon.value}% discount applied`
                    : `${formatPrice(appliedCoupon.value)} discount applied`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveCoupon}
              title="Remove discount code"
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-full transition-colors text-emerald-700 dark:text-emerald-300 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-sm">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(total)}</span>
        </div>

        {appliedCoupon && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Discount</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span>Shipping</span>
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
          </span>
        </div>

        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Estimated Taxes</span>
          <span>Included in price</span>
        </div>

        {/* Prominent Total Line */}
        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white block">Total</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
              Including nationwide taxes
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 mr-1.5 font-bold">PKR</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatPrice(orderTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Badges (Shopify / Apricot style) */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium leading-tight">Cash on Delivery Verified</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
          <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-medium leading-tight">256-Bit SSL Encrypted</span>
        </div>
      </div>
    </div>
  );
}
