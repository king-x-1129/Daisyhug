import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/shop">
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold px-8 h-12">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const cartItemId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
            const itemImage = item.selectedVariant?.image || item.images[0];
            
            return (
              <Card key={cartItemId} className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <img src={itemImage} alt={item.title} className="w-24 h-24 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-grow">
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    {item.selectedVariant && (
                      <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
                        Variant: {item.selectedVariant.name}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">{item.category}</p>
                    <p className="text-indigo-600 font-bold mt-1">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(cartItemId, item.quantity - 1)} className="h-8 w-8 rounded-lg">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(cartItemId, item.quantity + 1)} className="h-8 w-8 rounded-lg">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(cartItemId)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span className="font-bold">{formatPrice(250)}</span>
              </div>
              <div className="pt-4 mt-4 border-t flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-black text-indigo-600">{formatPrice(total + 250)}</span>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/checkout')}
              className="w-full mt-6 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100"
            >
              Proceed to Checkout <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
