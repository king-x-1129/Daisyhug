import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, OrderStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function PlaceOrder() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('TCS');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: '',
    address: ''
  });

  useEffect(() => {
    async function fetchProducts() {
      const querySnapshot = await getDocs(collection(db, 'products'));
      setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }
    fetchProducts();
  }, []);

  const carriers = [
    { name: 'TCS', cost: 250 },
    { name: 'Leopards', cost: 200 },
    { name: 'M&P', cost: 180 },
    { name: 'Post Office', cost: 150 }
  ];

  const shippingCost = carriers.find(c => c.name === selectedCarrier)?.cost || 250;
  const profit = selectedProduct ? sellingPrice - selectedProduct.companyPrice - shippingCost : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    if (sellingPrice < selectedProduct.companyPrice + shippingCost) {
      toast.error("Selling price must cover company cost and shipping!");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        resellerId: user.uid,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerCity: customerInfo.city,
        customerAddress: customerInfo.address,
        items: [{
          productId: selectedProduct.id,
          title: selectedProduct.title,
          quantity: 1,
          price: selectedProduct.price
        }],
        sellingPrice,
        companyPrice: selectedProduct.companyPrice,
        shippingCost,
        profit,
        carrier: selectedCarrier,
        status: 'Pending' as OrderStatus,
        statusHistory: [{
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: 'Order placed by reseller'
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success("Order placed successfully!");
      navigate('/reseller/orders');
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Place New Order</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Enter customer details and set your profit</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold dark:text-white">Product Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">Select Product</Label>
                <Select onValueChange={(id) => {
                  const p = products.find(x => x.id === id);
                  setSelectedProduct(p || null);
                  if (p) setSellingPrice(p.price);
                }}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-750">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title} (Cost: {formatPrice(p.companyPrice)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Your Selling Price (Rs.)</Label>
                  <Input 
                    type="number" 
                    value={sellingPrice} 
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">Suggested: {formatPrice(selectedProduct.price)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold dark:text-white">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Customer Name</Label>
                  <Input 
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="Full Name" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Phone Number</Label>
                  <Input 
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="03001234567" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">City</Label>
                  <Input 
                    required
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                    placeholder="City Name" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Full Address</Label>
                  <Input 
                    required
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    placeholder="House #, Street, Area" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold dark:text-white">Shipping Carrier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">Select Carrier</Label>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                    <SelectValue placeholder="Choose a carrier" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-750">
                    {carriers.map(c => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({formatPrice(c.cost)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/40">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-indigo-900 dark:text-indigo-400">Profit Calculation</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-655 dark:text-slate-350">Selling Price:</span>
                <span className="font-bold dark:text-white font-sans">{formatPrice(sellingPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-655 dark:text-slate-350">Company Cost:</span>
                <span className="font-bold text-rose-600 dark:text-rose-450 font-sans">- {formatPrice(selectedProduct?.companyPrice || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-655 dark:text-slate-350">Shipping:</span>
                <span className="font-bold text-rose-600 dark:text-rose-455 font-sans">- {formatPrice(shippingCost)}</span>
              </div>
              <div className="pt-4 border-t border-indigo-200 dark:border-indigo-900/40 flex justify-between items-center">
                <span className="font-bold text-indigo-900 dark:text-indigo-400">Your Profit:</span>
                <span className={`text-2xl font-black font-sans ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-455'}`}>
                  {formatPrice(profit)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-450 italic mt-2">
                * Profit will be available 15 days after delivery.
              </p>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            disabled={loading || !selectedProduct}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none border-none"
          >
            {loading ? "Placing Order..." : "Confirm & Place Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
