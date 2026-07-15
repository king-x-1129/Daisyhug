import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
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
import { Search, ChevronDown, Check } from 'lucide-react';

export function PlaceOrder() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Searchable combobox state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Upgrade Product Selection states
  const [selectedSize, setSelectedSize] = useState<string>('Default');
  const [selectedColor, setSelectedColor] = useState<string>('Default');
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  // Branding Preference states
  const [brandingPreference, setBrandingPreference] = useState<'company' | 'local'>('company');
  const [customBrandName, setCustomBrandName] = useState<string>('');

  // Payment Method states
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet' | 'card'>('cod');
  const [cardDetails, setCardDetails] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: '',
    address: ''
  });

  // Handle click outside to close product dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      const querySnapshot = await getDocs(collection(db, 'products'));
      setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }
    fetchProducts();
  }, []);

  const shippingCost = 250; // Flat Shipping Cost
  const profit = selectedProduct ? sellingPrice - selectedProduct.companyPrice - shippingCost : 0;
  
  // Wallet payment calculation
  const walletBalance = profile?.walletBalance || 0;
  const requiredAmount = selectedProduct ? (selectedProduct.companyPrice + shippingCost) : 0;
  const hasSufficientWalletBalance = walletBalance >= requiredAmount;

  // Variations from DB
  const availableSizes = (selectedProduct as any)?.sizes || [];
  const availableColors = (selectedProduct as any)?.colors || [];

  // Reset variation state on product change
  useEffect(() => {
    if (selectedProduct) {
      setSelectedSize('Default');
      setSelectedColor('Default');
      setSelectedVariant('');
    }
  }, [selectedProduct]);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    if (sellingPrice < selectedProduct.companyPrice + shippingCost) {
      toast.error("Selling price must cover company cost and shipping!");
      return;
    }

    if (brandingPreference === 'local' && !customBrandName.trim()) {
      toast.error("Please enter a custom brand name for local branding.");
      return;
    }

    if (paymentMethod === 'wallet' && !hasSufficientWalletBalance) {
      toast.error("Insufficient wallet balance for this order.");
      return;
    }

    if (paymentMethod === 'card') {
      const cleanCard = cardDetails.cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 16 || !cardDetails.expiryDate || !cardDetails.cvv) {
        toast.error("Please enter valid card payment details.");
        return;
      }
    }

    setLoading(true);
    try {
      const orderPayload: any = {
        resellerId: user.uid,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerCity: customerInfo.city,
        customerAddress: customerInfo.address,
        items: [{
          productId: selectedProduct.id,
          title: selectedProduct.title,
          quantity: 1,
          price: selectedProduct.price,
          size: selectedSize,
          color: selectedColor,
          variantId: selectedVariant || null
        }],
        sellingPrice,
        companyPrice: selectedProduct.companyPrice,
        shippingCost,
        profit,
        status: 'Pending' as OrderStatus,
        brandingPreference,
        customBrandName: brandingPreference === 'local' ? customBrandName : null,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : paymentMethod === 'wallet' ? 'Wallet' : 'Card',
        paymentStatus: paymentMethod === 'cod' ? 'Unpaid' : 'Paid',
        statusHistory: [{
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: 'Order placed by reseller via Portal'
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderPayload);
      toast.success("Order placed successfully!");
      navigate('/reseller/orders');
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-slate-900 dark:text-white transition-colors duration-350">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Place New Order</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Enter customer details and set your profit</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selection */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Product Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label className="text-slate-700 dark:text-slate-300 font-bold">Select Product</Label>
                
                {/* Custom Searchable Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 flex items-center justify-between shadow-sm hover:border-slate-300 dark:hover:border-slate-750 transition-colors"
                >
                  {selectedProduct ? (
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedProduct.images[0] || 'https://via.placeholder.com/40'} 
                        alt="" 
                        className="w-8 h-8 rounded-lg object-cover bg-slate-50"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-bold text-sm truncate">{selectedProduct.title}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">Choose a product</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Combobox Dropdown List */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 flex flex-col">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-900">
                      <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      <input
                        type="text"
                        placeholder="Search product name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 py-1.5"
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProduct(p);
                              setSellingPrice(p.price);
                              setIsDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images[0] || 'https://via.placeholder.com/40'}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-[300px]">{p.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cost: {formatPrice(p.companyPrice)}</p>
                              </div>
                            </div>
                            {selectedProduct?.id === p.id && (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-sm">No products found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Customer Retail Price display */}
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      Customer Retail Price: {formatPrice(selectedProduct.price)}
                    </span>
                  </div>

                  {/* Size and Color selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Size selector */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-bold">Size</Label>
                      {availableSizes.length > 0 ? (
                        <Select value={selectedSize} onValueChange={setSelectedSize}>
                          <SelectTrigger className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Select Size" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectItem value="Default" className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40">Default</SelectItem>
                            {availableSizes.map((sz: string) => (
                              <SelectItem key={sz} value={sz} className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40">{sz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value="Default" disabled>
                          <SelectTrigger className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 cursor-not-allowed">
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectItem value="Default">Default</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Color selection */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-bold">Color</Label>
                      {availableColors.length > 0 ? (
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Select Color" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectItem value="Default" className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40">Default</SelectItem>
                            {availableColors.map((col: string) => (
                              <SelectItem key={col} value={col} className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value="Default" disabled>
                          <SelectTrigger className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 cursor-not-allowed">
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectItem value="Default">Default</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Variation selection */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-bold">Variation</Label>
                      <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                        <SelectTrigger className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select Variant" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          {selectedProduct.variants.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40">{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Your Selling Price (Rs.)</Label>
                    <Input 
                      type="number" 
                      value={sellingPrice} 
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Suggested: {formatPrice(selectedProduct.price)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Customer Details</CardTitle>
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
                    className="rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Phone Number</Label>
                  <Input 
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="03001234567" 
                    className="rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">City</Label>
                  <Input 
                    required
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                    placeholder="City Name" 
                    className="rounded-xl h-12 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Full Address</Label>
                  <Input 
                    required
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    placeholder="House #, Street, Area" 
                    className="rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding Preference Card */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Branding Preference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setBrandingPreference('company')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                    brandingPreference === 'company'
                      ? 'border-indigo-650 bg-indigo-50/10 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  Company Branding
                </button>
                <button
                  type="button"
                  onClick={() => setBrandingPreference('local')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                    brandingPreference === 'local'
                      ? 'border-indigo-650 bg-indigo-50/10 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  Local Branding
                </button>
              </div>

              {brandingPreference === 'local' && (
                <div className="space-y-2 pt-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold">Enter Custom Brand Name</Label>
                  <Input 
                    required
                    value={customBrandName}
                    onChange={(e) => setCustomBrandName(e.target.value)}
                    placeholder="My Store Name"
                    className="rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Card */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm text-left flex justify-between items-center ${
                    paymentMethod === 'cod'
                      ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <span>Cash on Delivery (COD)</span>
                  <span className="text-xs text-slate-400 font-normal">Customer pays at delivery</span>
                </button>

                {/* Deduct From Wallet */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!hasSufficientWalletBalance}
                    onClick={() => setPaymentMethod('wallet')}
                    className={`w-full py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm text-left flex justify-between items-center ${
                      !hasSufficientWalletBalance
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-600'
                        : paymentMethod === 'wallet'
                        ? 'border-indigo-605 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                    title={!hasSufficientWalletBalance ? "Insufficient wallet balance" : ""}
                  >
                    <span>Deduct From Wallet</span>
                    <span className="text-xs font-normal">
                      {!hasSufficientWalletBalance ? "Insufficient wallet balance" : `Balance: ${formatPrice(walletBalance)}`}
                    </span>
                  </button>
                </div>

                {/* Pay via Credit/Debit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm text-left flex justify-between items-center ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <span>Pay via Credit/Debit Card</span>
                  <span className="text-xs text-slate-400 font-normal">Instant checkout</span>
                </button>
              </div>

              {/* Card Inputs Placeholder */}
              {paymentMethod === 'card' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-250 dark:border-slate-800 space-y-3 mt-4">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Card details</p>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Cardholder Name" 
                      value={cardDetails.cardholderName}
                      onChange={e => setCardDetails({...cardDetails, cardholderName: e.target.value})}
                      className="h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <Input 
                      placeholder="Card Number" 
                      value={cardDetails.cardNumber}
                      onChange={e => setCardDetails({...cardDetails, cardNumber: e.target.value})}
                      className="h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="MM/YY" 
                        value={cardDetails.expiryDate}
                        onChange={e => setCardDetails({...cardDetails, expiryDate: e.target.value})}
                        className="h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-center"
                      />
                      <Input 
                        placeholder="CVV" 
                        value={cardDetails.cvv}
                        onChange={e => setCardDetails({...cardDetails, cvv: e.target.value})}
                        className="h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profit Summary */}
        <div className="space-y-6">
          <Card className="border border-indigo-150 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-indigo-900 dark:text-indigo-400">Profit Calculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Selling Price:</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">{formatPrice(sellingPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Company Cost:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-sans">- {formatPrice(selectedProduct?.companyPrice || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Shipping:</span>
                <span className="font-bold text-rose-600 dark:text-rose-450 font-sans">- {formatPrice(shippingCost)}</span>
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
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg border-none"
          >
            {loading ? "Placing Order..." : "Confirm & Place Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
