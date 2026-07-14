import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, query, where, getDocs, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CheckCircle2, Ticket, X, CreditCard, Wallet, ShieldCheck, AlertCircle, Plus } from 'lucide-react';
import { Coupon } from '@/types';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Payment method states
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [newCard, setNewCard] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [saveCardCheckbox, setSaveCardCheckbox] = useState(true);

  // Form states matching high conversion Pakistani ecommerce fields
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    province: '',
    phone: '',
  });

  // Fetch saved cards
  React.useEffect(() => {
    if (!user) return;
    const qCards = query(collection(db, 'users', user.uid, 'paymentMethods'));
    const unsubscribe = onSnapshot(qCards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedCards(data);
      if (data.length > 0) {
        setSelectedCardId(data[0].id);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Pre-fill name and details from user profile if logged in
  React.useEffect(() => {
    if (profile) {
      setCustomerInfo(prev => ({
        ...prev,
        email: prev.email || profile.email || '',
        firstName: prev.firstName || profile.fullName?.split(' ')[0] || '',
        lastName: prev.lastName || profile.fullName?.split(' ').slice(1).join(' ') || '',
        phone: prev.phone || profile.mobile || '',
        city: prev.city || profile.city || '',
        address: prev.address || profile.address || '',
        province: prev.province || profile.province || '',
      }));
    } else if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        firstName: prev.firstName || user.displayName?.split(' ')[0] || '',
        lastName: prev.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
      }));
    }
  }, [profile, user]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    try {
      const q = query(
        collection(db, 'coupons'), 
        where('code', '==', couponCode.trim().toUpperCase()),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error("Invalid or expired coupon code");
        return;
      }

      const couponData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
      
      // Check expiry
      if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) {
        toast.error("This coupon has expired");
        return;
      }

      // Check min order amount
      if (couponData.minOrderAmount && total < couponData.minOrderAmount) {
        toast.error(`Minimum order amount for this coupon is ${formatPrice(couponData.minOrderAmount)}`);
        return;
      }

      setAppliedCoupon(couponData);
      toast.success("Coupon applied successfully!");
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.type === 'percentage' ? (total * (appliedCoupon.value / 100)) : appliedCoupon.value)
    : 0;

  const finalTotal = total - discountAmount;
  const shippingCost = 250;
  const orderTotal = finalTotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Balance check for wallet payment
    if (paymentMethod === 'wallet' && user) {
      const walletBalance = profile?.walletBalance || 0;
      if (walletBalance < orderTotal) {
        toast.error("Insufficient wallet balance. Please top up your wallet or choose another payment method.");
        return;
      }
    }

    setLoading(true);
    try {
      const affiliateRef = localStorage.getItem('affiliate_ref');

      // Background Registration & Account matching
      let customerId = user?.uid || null;
      if (!customerId) {
        // Query users by email or phone to check existence
        const emailQuery = query(collection(db, 'users'), where('email', '==', customerInfo.email));
        const phoneQuery = query(collection(db, 'users'), where('mobile', '==', customerInfo.phone));
        const [emailSnap, phoneSnap] = await Promise.all([getDocs(emailQuery), getDocs(phoneQuery)]);
        
        let existingUserDoc = null;
        if (!emailSnap.empty) {
          existingUserDoc = emailSnap.docs[0];
        } else if (!phoneSnap.empty) {
          existingUserDoc = phoneSnap.docs[0];
        }

        if (existingUserDoc) {
          customerId = existingUserDoc.id;
        } else {
          // Generate a custom ID for the guest/background account
          const guestUid = 'guest-' + Math.random().toString(36).substring(2, 11);
          await setDoc(doc(db, 'users', guestUid), {
            uid: guestUid,
            fullName: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
            email: customerInfo.email,
            mobile: customerInfo.phone,
            city: customerInfo.city,
            province: customerInfo.province,
            address: customerInfo.address,
            role: 'customer',
            isVerified: false,
            walletBalance: 0,
            pendingProfit: 0,
            totalWithdrawn: 0,
            createdAt: new Date().toISOString()
          });
          customerId = guestUid;
        }
      }
      
      const orderData: any = {
        customerId: customerId,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
        customerPhone: customerInfo.phone,
        customerCity: customerInfo.city,
        customerAddress: customerInfo.address,
        items: items.map(item => ({
          productId: item.id,
          title: item.selectedVariant ? `${item.title} (${item.selectedVariant.name})` : item.title,
          quantity: item.quantity,
          price: item.price,
          variantId: item.selectedVariant?.id || null,
          variantName: item.selectedVariant?.name || null
        })),
        sellingPrice: finalTotal,
        companyPrice: items.reduce((acc, item) => acc + (item.companyPrice * item.quantity), 0),
        shippingCost,
        profit: 0, 
        status: 'Pending',
        paymentMethod: paymentMethod === 'cod' ? 'COD' : paymentMethod === 'card' ? 'Card' : 'Wallet',
        paymentStatus: paymentMethod === 'cod' ? 'Unpaid' : 'Paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (affiliateRef) {
        orderData.affiliateRef = affiliateRef;
      }

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code;
        orderData.discount = discountAmount;
      }

      if (paymentMethod === 'card') {
        if (!selectedCardId) {
          const trimmedCard = newCard.cardNumber.replace(/\s+/g, '');
          if (trimmedCard.length < 16) {
            toast.error("Please enter a valid 16-digit card number");
            setLoading(false);
            return;
          }
          if (!/^\d{2}\/\d{2}$/.test(newCard.expiryDate)) {
            toast.error("Please enter expiry in MM/YY format");
            setLoading(false);
            return;
          }
          if (newCard.cvv.length < 3) {
            toast.error("Please enter a valid CVV");
            setLoading(false);
            return;
          }
          
          toast.info("Authorizing online card payment...");
          await new Promise(resolve => setTimeout(resolve, 1500));

          if (saveCardCheckbox && customerId) {
            const cardType = trimmedCard.startsWith('4') ? 'Visa' : trimmedCard.startsWith('5') ? 'Mastercard' : 'Card';
            const maskedNumber = `•••• •••• •••• ${trimmedCard.slice(-4)}`;
            await addDoc(collection(db, 'users', customerId, 'paymentMethods'), {
              cardholderName: newCard.cardholderName,
              cardNumber: maskedNumber,
              expiryDate: newCard.expiryDate,
              cardType,
              createdAt: new Date().toISOString()
            });
          }
        } else {
          toast.info("Processing transaction with saved card...");
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (paymentMethod === 'wallet' && customerId) {
        await updateDoc(doc(db, 'users', customerId), {
          walletBalance: increment(-orderTotal)
        });

        await addDoc(collection(db, 'users', customerId, 'walletTransactions'), {
          amount: orderTotal,
          type: 'payment',
          description: `Order Payment (COD-free online checkout)`,
          status: 'Completed',
          createdAt: new Date().toISOString()
        });
      }

      await addDoc(collection(db, 'orders'), orderData);
      
      setOrderComplete(true);
      clearCart();
      localStorage.removeItem('affiliate_ref');
      toast.success("Order placed successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Order Confirmed!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Thank you for your purchase. We'll notify you when your order ships.</p>
        <Button 
          onClick={() => {
            if (profile?.email === 'kingx1129@gmail.com' || user?.email === 'kingx1129@gmail.com') {
              navigate('/super-admin');
            } else if (profile?.role === 'admin') {
              navigate('/admin');
            } else if (profile?.role === 'reseller') {
              navigate('/reseller');
            } else if (profile?.role === 'customer') {
              navigate('/customer');
            } else {
              navigate('/');
            }
          }} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8 h-12"
        >
          Go Home
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Your cart is empty</h2>
        <Button onClick={() => navigate('/')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6">Go Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-900 dark:text-white">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Checkout details (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-slate-850 p-6 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Contact & Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">Email Address</Label>
                  <Input 
                    required
                    type="email"
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="john@example.com"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">First Name</Label>
                  <Input 
                    required
                    value={customerInfo.firstName}
                    onChange={e => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                    placeholder="John"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">Last Name</Label>
                  <Input 
                    required
                    value={customerInfo.lastName}
                    onChange={e => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                    placeholder="Doe"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">Shipping Address</Label>
                  <Input 
                    required
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                    placeholder="House #, Street name, Block / Area"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">City</Label>
                  <Input 
                    required
                    value={customerInfo.city}
                    onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})}
                    placeholder="Karachi"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">Province</Label>
                  <Input 
                    required
                    value={customerInfo.province}
                    onChange={e => setCustomerInfo({...customerInfo, province: e.target.value})}
                    placeholder="Sindh"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="font-bold text-xs text-slate-600 dark:text-slate-400">Mobile Phone Number</Label>
                  <Input 
                    required
                    type="tel"
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="03001234567"
                    className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Payment Method</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cod' as const, label: 'Cash on Delivery', icon: ShoppingBag },
                  { id: 'card' as const, label: 'Pay Online', icon: CreditCard },
                  { id: 'wallet' as const, label: 'Wallet', icon: Wallet }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id
                        ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                        : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <method.icon className="w-5 h-5 mb-2" />
                    <span className="text-xs font-bold text-center leading-tight">{method.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'cod' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">Cash on Delivery (COD)</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Pay with cash upon delivery.</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  {savedCards.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400 uppercase font-black">Select Saved Card</Label>
                      <div className="space-y-2">
                        {savedCards.map(card => (
                          <div
                            key={card.id}
                            onClick={() => setSelectedCardId(card.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedCardId === card.id
                                ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-500'
                                : 'border-slate-150 dark:border-slate-800 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <CreditCard className="w-4 h-4 text-indigo-550" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {card.cardType} {card.cardNumber}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">
                              Exp: {card.expiryDate}
                            </span>
                          </div>
                        ))}
                        <div
                          onClick={() => setSelectedCardId('')}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedCardId === ''
                              ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-500'
                              : 'border-slate-150 dark:border-slate-800 hover:border-slate-350'
                          }`}
                        >
                          <Plus className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Pay with a New Card
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!savedCards.length || selectedCardId === '') && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">New Card Details</p>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Cardholder Name</Label>
                        <Input 
                          required={paymentMethod === 'card' && selectedCardId === ''}
                          type="text"
                          placeholder="John Doe"
                          value={newCard.cardholderName}
                          onChange={(e) => setNewCard({...newCard, cardholderName: e.target.value})}
                          className="rounded-xl h-11 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Card Number</Label>
                        <Input 
                          required={paymentMethod === 'card' && selectedCardId === ''}
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          maxLength={19}
                          value={newCard.cardNumber}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                            const matches = v.match(/\d{4,16}/g);
                            const match = matches && matches[0] || '';
                            const parts = [];
                            for (let i=0, len=match.length; i<len; i+=4) {
                              parts.push(match.substring(i, i+4));
                            }
                            if (parts.length > 0) {
                              setNewCard({...newCard, cardNumber: parts.join(' ')});
                            } else {
                              setNewCard({...newCard, cardNumber: v});
                            }
                          }}
                          className="rounded-xl h-11 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Expiry (MM/YY)</Label>
                          <Input 
                            required={paymentMethod === 'card' && selectedCardId === ''}
                            type="text"
                            placeholder="12/28"
                            maxLength={5}
                            value={newCard.expiryDate}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v.length >= 2) {
                                setNewCard({...newCard, expiryDate: `${v.slice(0, 2)}/${v.slice(2, 4)}`});
                              } else {
                                setNewCard({...newCard, expiryDate: v});
                              }
                            }}
                            className="rounded-xl h-11 text-center border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">CVV</Label>
                          <Input 
                            required={paymentMethod === 'card' && selectedCardId === ''}
                            type="password"
                            placeholder="123"
                            maxLength={3}
                            value={newCard.cvv}
                            onChange={(e) => setNewCard({...newCard, cvv: e.target.value.replace(/[^0-9]/g, '')})}
                            className="rounded-xl h-11 text-center border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <input
                          id="save_checkout_card"
                          type="checkbox"
                          checked={saveCardCheckbox}
                          onChange={(e) => setSaveCardCheckbox(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <label htmlFor="save_checkout_card" className="text-xs font-medium text-slate-650 dark:text-slate-400 cursor-pointer">
                          Save this card details for future payments
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">Pay via Wallet</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Secure payment from your balance.</span>
                    </div>
                    <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200/50 flex justify-between text-xs">
                    <span className="text-slate-500">Available Balance:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPrice(profile?.walletBalance || 0)}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Order Total:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPrice(orderTotal)}</span>
                  </div>

                  {(profile?.walletBalance || 0) < orderTotal ? (
                    <div className="flex items-start gap-1.5 p-2 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg text-[10px] text-rose-700 dark:text-rose-450 leading-relaxed font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>Insufficient wallet balance. Please top up your wallet or choose another payment method.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-455 leading-relaxed font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Sufficient balance. Payment will be deducted on placing order.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Order Summary</h3>
            <div className="space-y-4">
              {items.map(item => {
                const cartItemId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
                return (
                  <div key={cartItemId} className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-600 dark:text-slate-350 font-bold">{item.title} x {item.quantity}</span>
                      {item.selectedVariant && (
                        <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-black">Variant: {item.selectedVariant.name}</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {/* Coupon Input */}
                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Coupon Code" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="pl-10 rounded-xl h-11 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <Button 
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 h-11 font-bold"
                    >
                      Apply
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-750">{appliedCoupon.code}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={removeCoupon}
                      className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPrice(total)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-650 font-bold">Discount</span>
                      <span className="font-bold text-emerald-650">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Shipping (Flat Rate)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPrice(shippingCost)}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-950 dark:text-white">Total</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400">{formatPrice(orderTotal)}</span>
                </div>
              </div>
            </div>
            <Button 
              type="submit"
              disabled={loading}
              className="w-full mt-6 h-14 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg border-none"
            >
              {loading ? "Processing..." : "Place Order"}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
