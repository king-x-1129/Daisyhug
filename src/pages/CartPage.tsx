import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-900 dark:text-white">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/shop">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8 h-12 shadow-md">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  const shippingCost = 250;
  const orderTotal = total + shippingCost;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-900 dark:text-white transition-colors">
      <h1 className="text-3xl font-black mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const cartItemId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
            const itemImage = item.selectedVariant?.image || item.images[0];
            
            return (
              <Card key={cartItemId} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <img 
                    src={itemImage} 
                    alt={item.title} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{item.title}</h3>
                    {item.selectedVariant && (
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md inline-block mt-1">
                        Variant: {item.selectedVariant.name}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">{item.category}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1 text-sm">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQuantity(cartItemId, item.quantity - 1)} 
                      className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="font-bold w-5 text-center text-sm">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQuantity(cartItemId, item.quantity + 1)} 
                      className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(cartItemId)} 
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex-shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 sticky top-24">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(shippingCost)}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-base font-bold">Total</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatPrice(orderTotal)}</span>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/checkout')}
              className="w-full mt-6 h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 text-sm flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
