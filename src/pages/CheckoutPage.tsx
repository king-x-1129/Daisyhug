import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Plus,
  Lock,
  ChevronRight,
  ArrowLeft,
  Truck,
  User,
  MapPin,
  Check,
} from 'lucide-react';
import { Coupon } from '@/types';
import { CheckoutSummarySidebar } from '@/components/checkout/CheckoutSummarySidebar';

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
];

const POPULAR_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Mardan',
  'Gujrat',
  'Sahiwal',
  'Jhelum',
  'Wah Cantt',
];

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Payment method states: 'cod' | 'card' | 'wallet'
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [newCard, setNewCard] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [saveCardCheckbox, setSaveCardCheckbox] = useState(true);
  const [saveInfoCheckbox, setSaveInfoCheckbox] = useState(true);
  const [marketingCheckbox, setMarketingCheckbox] = useState(false);

  // Form states matching Shopify / Apricot Pakistan checkout
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    province: 'Punjab',
    postalCode: '',
    country: 'Pakistan',
    phone: '',
  });

  // Fetch saved cards for logged-in user
  useEffect(() => {
    if (!user) return;
    const qCards = query(collection(db, 'users', user.uid, 'paymentMethods'));
    const unsubscribe = onSnapshot(qCards, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSavedCards(data);
      if (data.length > 0) {
        setSelectedCardId(data[0].id);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Pre-fill details from user profile
  useEffect(() => {
    if (profile) {
      setCustomerInfo((prev) => ({
        ...prev,
        email: prev.email || profile.email || '',
        firstName: prev.firstName || profile.fullName?.split(' ')[0] || '',
        lastName: prev.lastName || profile.fullName?.split(' ').slice(1).join(' ') || '',
        phone: prev.phone || profile.mobile || '',
        city: prev.city || profile.city || '',
        address: prev.address || profile.address || '',
        province: prev.province || profile.province || 'Punjab',
      }));
    } else if (user) {
      setCustomerInfo((prev) => ({
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
        toast.error('Invalid or expired coupon code');
        return;
      }

      const couponData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;

      // Check expiry
      if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) {
        toast.error('This coupon has expired');
        return;
      }

      // Check min order amount
      if (couponData.minOrderAmount && total < couponData.minOrderAmount) {
        toast.error(
          `Minimum order amount for this coupon is ${formatPrice(couponData.minOrderAmount)}`
        );
        return;
      }

      setAppliedCoupon(couponData);
      toast.success('Coupon applied successfully!');
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? total * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;

  const finalTotal = Math.max(0, total - discountAmount);
  const shippingCost = 250;
  const orderTotal = finalTotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Validation for phone
    const cleanPhone = customerInfo.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid mobile phone number (e.g. 03001234567)');
      return;
    }

    // Balance check for wallet payment
    if (paymentMethod === 'wallet' && user) {
      const walletBalance = profile?.walletBalance || 0;
      if (walletBalance < orderTotal) {
        toast.error(
          'Insufficient wallet balance. Please top up your wallet or choose another payment method.'
        );
        return;
      }
    }

    setLoading(true);
    try {
      const affiliateRef = localStorage.getItem('affiliate_ref');

      // Background Registration & Account matching
      let customerId = user?.uid || null;
      if (!customerId) {
        const emailQuery = query(
          collection(db, 'users'),
          where('email', '==', customerInfo.email.trim().toLowerCase())
        );
        const phoneQuery = query(
          collection(db, 'users'),
          where('mobile', '==', customerInfo.phone.trim())
        );
        const [emailSnap, phoneSnap] = await Promise.all([
          getDocs(emailQuery),
          getDocs(phoneQuery),
        ]);

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
            email: customerInfo.email.trim().toLowerCase(),
            mobile: customerInfo.phone.trim(),
            city: customerInfo.city,
            province: customerInfo.province,
            address: customerInfo.address,
            postalCode: customerInfo.postalCode || '',
            country: customerInfo.country || 'Pakistan',
            role: 'customer',
            isVerified: false,
            walletBalance: 0,
            pendingProfit: 0,
            totalWithdrawn: 0,
            createdAt: new Date().toISOString(),
          });
          customerId = guestUid;
        }
      }

      const orderData: any = {
        customerId: customerId,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
        customerEmail: customerInfo.email.trim().toLowerCase(),
        customerPhone: customerInfo.phone.trim(),
        customerCity: customerInfo.city,
        customerProvince: customerInfo.province,
        customerAddress: customerInfo.address,
        postalCode: customerInfo.postalCode || '',
        items: items.map((item) => ({
          productId: item.id,
          title: item.selectedVariant
            ? `${item.title} (${item.selectedVariant.name})`
            : item.title,
          quantity: item.quantity,
          price: item.price,
          variantId: item.selectedVariant?.id || null,
          variantName: item.selectedVariant?.name || null,
        })),
        sellingPrice: finalTotal,
        companyPrice: items.reduce(
          (acc, item) => acc + (item.companyPrice || item.price) * item.quantity,
          0
        ),
        shippingCost,
        profit: 0,
        status: 'Pending',
        paymentMethod:
          paymentMethod === 'cod' ? 'COD' : paymentMethod === 'card' ? 'Card' : 'Wallet',
        paymentStatus: paymentMethod === 'cod' ? 'Unpaid' : 'Paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (affiliateRef) {
        orderData.affiliateRef = affiliateRef;
      }

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code;
        orderData.discount = discountAmount;
      }

      // Online card authorization / storage
      if (paymentMethod === 'card') {
        if (!selectedCardId) {
          const trimmedCard = newCard.cardNumber.replace(/\s+/g, '');
          if (trimmedCard.length < 16) {
            toast.error('Please enter a valid 16-digit card number');
            setLoading(false);
            return;
          }
          if (!/^\d{2}\/\d{2}$/.test(newCard.expiryDate)) {
            toast.error('Please enter expiry in MM/YY format');
            setLoading(false);
            return;
          }
          if (newCard.cvv.length < 3) {
            toast.error('Please enter a valid CVV');
            setLoading(false);
            return;
          }

          toast.info('Authorizing online card payment...');
          await new Promise((resolve) => setTimeout(resolve, 1500));

          if (saveCardCheckbox && customerId) {
            const cardType = trimmedCard.startsWith('4')
              ? 'Visa'
              : trimmedCard.startsWith('5')
              ? 'Mastercard'
              : 'Card';
            const maskedNumber = `•••• •••• •••• ${trimmedCard.slice(-4)}`;
            await addDoc(collection(db, 'users', customerId, 'paymentMethods'), {
              cardholderName: newCard.cardholderName,
              cardNumber: maskedNumber,
              expiryDate: newCard.expiryDate,
              cardType,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          toast.info('Processing transaction with saved card...');
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      // Wallet payment deduction
      if (paymentMethod === 'wallet' && customerId) {
        await updateDoc(doc(db, 'users', customerId), {
          walletBalance: increment(-orderTotal),
        });

        await addDoc(collection(db, 'users', customerId, 'walletTransactions'), {
          amount: orderTotal,
          type: 'payment',
          description: 'Order Payment (Online checkout)',
          status: 'Completed',
          createdAt: new Date().toISOString(),
        });
      }

      // Save order to Firestore
      await addDoc(collection(db, 'orders'), orderData);

      setOrderComplete(true);
      clearCart();
      localStorage.removeItem('affiliate_ref');
      toast.success('Order placed successfully!');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ─── ORDER COMPLETE SCREEN ──────────────────────────────────────────────────
  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 mb-3">
          Order Confirmed
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
          Thank you for your order!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
          We have received your order and are preparing it for shipment. You will receive an SMS &
          call confirmation before delivery.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl font-bold px-8 h-12 text-sm shadow-md transition-all cursor-pointer"
          >
            Continue Shopping
          </Button>

          {user && (
            <Link to="/customer">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl font-bold px-6 h-12 text-sm border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Track My Orders
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ─── EMPTY CART SCREEN ───────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Your cart is empty
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl px-8 h-12 text-sm shadow-md cursor-pointer"
        >
          Start Shopping
        </Button>
      </div>
    );
  }

  // ─── MAIN SHOPIFY / APRICOT 2-COLUMN CHECKOUT ──────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link to="/cart" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cart</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-900 dark:text-white font-bold">Information</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span>Shipping</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span>Payment</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure 256-Bit SSL Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ════════════════════════════════════════════════════════════════════
              LEFT COLUMN: Customer & Order Details (7 cols)
             ════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* STEP 1: CONTACT INFORMATION */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Contact Information</span>
                </h2>
                {!user ? (
                  <Link
                    to="/auth?redirect=/checkout"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    Already have an account? Log in
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Logged in as {user.email}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="contact_email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="contact_email"
                    required
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="name@example.com"
                    className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Order confirmation & dispatch tracking will be sent to this email.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="marketing_opt_in"
                    type="checkbox"
                    checked={marketingCheckbox}
                    onChange={(e) => setMarketingCheckbox(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="marketing_opt_in" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    Email me with news and exclusive discounts
                  </label>
                </div>
              </div>
            </div>

            {/* STEP 2: DELIVERY & SHIPPING ADDRESS */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Delivery Address</span>
              </h2>

              <div className="space-y-4">
                {/* Country / Region */}
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Country / Region
                  </Label>
                  <div className="mt-1.5 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-not-allowed">
                    <span>🇵🇰 Pakistan</span>
                  </div>
                </div>

                {/* First Name & Last Name (2 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      First Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      required
                      type="text"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                      placeholder="e.g. Muhammad"
                      className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Last Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      required
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                      placeholder="e.g. Ali"
                      className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Address (Street / House / Area) */}
                <div>
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Complete Street Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    required
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="House/Apartment #, Street name, Sector / Phase / Mohallah"
                    className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                  />
                </div>

                {/* City, Province, Postal Code (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      City <span className="text-rose-500">*</span>
                    </Label>
                    <input
                      id="city"
                      required
                      list="pakistan-cities"
                      type="text"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                      placeholder="e.g. Lahore"
                      className="mt-1.5 w-full h-12 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <datalist id="pakistan-cities">
                      {POPULAR_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <Label htmlFor="province" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Province <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="province"
                      required
                      value={customerInfo.province}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, province: e.target.value })}
                      className="mt-1.5 w-full h-12 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                    >
                      {PAKISTAN_PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="postal_code" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Postal Code <span className="text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="postal_code"
                      type="text"
                      value={customerInfo.postalCode}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, postalCode: e.target.value })}
                      placeholder="e.g. 54000"
                      className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="03001234567"
                    className="mt-1.5 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Courier rider will call and SMS this number for parcel delivery.
                  </p>
                </div>

                {/* Save info checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="save_shipping_info"
                    type="checkbox"
                    checked={saveInfoCheckbox}
                    onChange={(e) => setSaveInfoCheckbox(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="save_shipping_info" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    Save this shipping address for next time
                  </label>
                </div>
              </div>
            </div>

            {/* STEP 3: SHIPPING METHOD */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Shipping Method</span>
              </h2>

              <div className="p-4 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center bg-indigo-600">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Standard Nationwide Courier
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Safe delivery within 2 to 4 business days
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatPrice(shippingCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 4: PAYMENT METHOD (Shopify / Apricot Card Accordion) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Payment Method</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All transactions are secure, encrypted, and monitored.
                </p>
              </div>

              <div className="space-y-3">
                {/* Option 1: Cash on Delivery (COD) */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'cod'
                      ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'cod'
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          Cash on Delivery (COD)
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Pay with cash directly to the courier on delivery
                        </span>
                      </div>
                    </div>
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  </div>

                  {paymentMethod === 'cod' && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/60 dark:bg-slate-800/40 border-t border-indigo-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      💡 Please keep the exact payable amount <span className="font-bold text-slate-900 dark:text-white">({formatPrice(orderTotal)})</span> ready when the rider arrives.
                    </div>
                  )}
                </div>

                {/* Option 2: Debit / Credit Card (Pay Online) */}
                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'card'
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          Debit or Credit Card
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Visa, Mastercard, PayPak & UnionPay
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border">VISA</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border">MC</span>
                    </div>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                      {savedCards.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Saved Cards</Label>
                          {savedCards.map((card) => (
                            <div
                              key={card.id}
                              onClick={() => setSelectedCardId(card.id)}
                              className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer ${
                                selectedCardId === card.id
                                  ? 'border-indigo-600 bg-white dark:bg-slate-800'
                                  : 'border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {card.cardType} {card.cardNumber}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">Exp: {card.expiryDate}</span>
                            </div>
                          ))}
                          <div
                            onClick={() => setSelectedCardId('')}
                            className={`p-2.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer text-xs font-bold ${
                              selectedCardId === ''
                                ? 'border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Use a new card</span>
                          </div>
                        </div>
                      )}

                      {(!savedCards.length || selectedCardId === '') && (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Name on Card</Label>
                            <Input
                              required={paymentMethod === 'card' && selectedCardId === ''}
                              type="text"
                              placeholder="e.g. Muhammad Ali"
                              value={newCard.cardholderName}
                              onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })}
                              className="mt-1 h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Card Number</Label>
                            <Input
                              required={paymentMethod === 'card' && selectedCardId === ''}
                              type="text"
                              placeholder="4000 1234 5678 9010"
                              maxLength={19}
                              value={newCard.cardNumber}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                const matches = v.match(/\d{4,16}/g);
                                const match = (matches && matches[0]) || '';
                                const parts = [];
                                for (let i = 0, len = match.length; i < len; i += 4) {
                                  parts.push(match.substring(i, i + 4));
                                }
                                setNewCard({ ...newCard, cardNumber: parts.length > 0 ? parts.join(' ') : v });
                              }}
                              className="mt-1 h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry (MM/YY)</Label>
                              <Input
                                required={paymentMethod === 'card' && selectedCardId === ''}
                                type="text"
                                placeholder="12/28"
                                maxLength={5}
                                value={newCard.expiryDate}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/[^0-9]/g, '');
                                  if (v.length >= 2) {
                                    setNewCard({ ...newCard, expiryDate: `${v.slice(0, 2)}/${v.slice(2, 4)}` });
                                  } else {
                                    setNewCard({ ...newCard, expiryDate: v });
                                  }
                                }}
                                className="mt-1 h-11 text-center rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">CVV / CVC</Label>
                              <Input
                                required={paymentMethod === 'card' && selectedCardId === ''}
                                type="password"
                                placeholder="123"
                                maxLength={4}
                                value={newCard.cvv}
                                onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                                className="mt-1 h-11 text-center rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              id="save_checkout_card_pref"
                              type="checkbox"
                              checked={saveCardCheckbox}
                              onChange={(e) => setSaveCardCheckbox(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <label htmlFor="save_checkout_card_pref" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                              Save card details safely for faster checkout
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Option 3: Reseller / Customer Wallet */}
                <div
                  onClick={() => setPaymentMethod('wallet')}
                  className={`rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'wallet'
                      ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'wallet'
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          Account Wallet Balance
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Instant debit from your stored earnings or wallet
                        </span>
                      </div>
                    </div>
                    <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  {paymentMethod === 'wallet' && (
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Available Wallet Balance:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPrice(profile?.walletBalance || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Required Order Total:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPrice(orderTotal)}
                        </span>
                      </div>
                      {(profile?.walletBalance || 0) < orderTotal ? (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[11px] font-bold border border-rose-200 dark:border-rose-900">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Insufficient balance. Please top up or choose Cash on Delivery.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-900">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Sufficient balance. Amount will be deducted instantly.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 5: PLACE ORDER / PAY NOW CALL TO ACTION BUTTON */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white font-black text-base rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <span>Processing Your Order...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    <span>
                      {paymentMethod === 'cod' ? 'Complete Order' : 'Pay Now'} • {formatPrice(orderTotal)}
                    </span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
                <Link to="/cart" className="hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to cart
                </Link>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Satisfaction Guarantee
                </span>
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Sticky Order Summary Sidebar (5 cols)
             ════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5">
            <CheckoutSummarySidebar
              items={items}
              total={total}
              shippingCost={shippingCost}
              discountAmount={discountAmount}
              appliedCoupon={appliedCoupon}
              couponCode={couponCode}
              isApplyingCoupon={isApplyingCoupon}
              onCouponChange={setCouponCode}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={removeCoupon}
              formatPrice={formatPrice}
            />
          </div>

        </form>
      </div>
    </div>
  );
}
