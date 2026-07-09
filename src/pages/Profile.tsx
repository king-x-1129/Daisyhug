import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Camera, Loader2, Mail, MapPin, Phone, Calendar, Edit2, Save, X, CreditCard, Shield, Package, Clock, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Order } from '@/types';

export function Profile() {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    mobile: '',
    address: '',
    fullName: '',
    city: '',
    province: '',
    cnic: '',
    paymentMethod: 'Bank' as 'Bank' | 'JazzCash' | 'Easypaisa',
    paymentDetails: '',
    cardHolder: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    tiktok: '',
    youtube: '',
    instagram: '',
    facebook: ''
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('resellerId', '==', user.uid), // Assuming resellerId is the user's ID for their own orders if they are a reseller
      orderBy('createdAt', 'desc')
    );

    // Also check for customer orders if we had a customerId field, but let's try to find orders where this user is involved
    // For now, let's just fetch orders where resellerId matches (most common in this app's context)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(fetchedOrders);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFormData({
        mobile: profile.mobile || '',
        address: profile.address || '',
        fullName: profile.fullName || '',
        city: profile.city || '',
        province: profile.province || '',
        cnic: profile.cnic || '',
        paymentMethod: profile.paymentInfo?.method || 'Bank',
        paymentDetails: profile.paymentInfo?.details || '',
        cardHolder: (profile as any).cardInfo?.cardHolder || '',
        cardNumber: (profile as any).cardInfo?.cardNumber || '',
        cardExpiry: (profile as any).cardInfo?.cardExpiry || '',
        cardCVV: (profile as any).cardInfo?.cardCVV || '',
        tiktok: profile.socialLinks?.tiktok || '',
        youtube: profile.socialLinks?.youtube || '',
        instagram: profile.socialLinks?.instagram || '',
        facebook: profile.socialLinks?.facebook || ''
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        mobile: formData.mobile,
        address: formData.address,
        fullName: formData.fullName,
        city: formData.city,
        province: formData.province,
        cnic: formData.cnic,
        paymentInfo: {
          method: formData.paymentMethod,
          details: formData.paymentDetails
        },
        cardInfo: {
          cardHolder: formData.cardHolder,
          cardNumber: formData.cardNumber,
          cardExpiry: formData.cardExpiry,
          cardCVV: formData.cardCVV
        },
        socialLinks: {
          tiktok: formData.tiktok,
          youtube: formData.youtube,
          instagram: formData.instagram,
          facebook: formData.facebook
        }
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      });

      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return <div className="flex h-screen items-center justify-center">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500">Manage your personal information and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md">
                {profile.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.fullName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>

            <h2 className="text-xl font-black text-slate-900">{profile.fullName}</h2>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mt-1">{profile.role}</p>
            
            <div className="mt-6 w-full pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center text-sm text-slate-600">
                <Mail className="w-4 h-4 mr-3 text-slate-400" />
                {profile.email}
              </div>
              {profile.mobile && (
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="w-4 h-4 mr-3 text-slate-400" />
                  {profile.mobile}
                </div>
              )}
              {profile.city && (
                <div className="flex items-center text-sm text-slate-600">
                  <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                  {profile.city}, {profile.province}
                </div>
              )}
              <div className="flex items-center text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-white border shadow-sm rounded-2xl p-1 mb-6">
              <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 font-bold">Details</TabsTrigger>
              <TabsTrigger value="financials" className="rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 font-bold">Financials</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 font-bold">My Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b p-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold">Account Details</CardTitle>
                  {!isEditing ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl"
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditing(false)}
                        className="text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                      >
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                      {isEditing ? (
                        <Input 
                          value={formData.fullName}
                          onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                          className="mt-1 rounded-xl bg-slate-50 border-none"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium">{profile.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                      <p className="text-slate-900 font-medium">{profile.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                      {isEditing ? (
                        <Input 
                          value={formData.mobile}
                          onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                          placeholder="Enter mobile number"
                          className="mt-1 rounded-xl bg-slate-50 border-none"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium">{profile.mobile || 'Not provided'}</p>
                      )}
                    </div>
                    {(profile.role === 'reseller' || profile.role === 'admin') && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">CNIC Number</p>
                        {isEditing ? (
                          <Input 
                            value={formData.cnic}
                            onChange={e => setFormData(prev => ({ ...prev, cnic: e.target.value }))}
                            placeholder="12345-1234567-1"
                            className="mt-1 rounded-xl bg-slate-50 border-none"
                          />
                        ) : (
                          <p className="text-slate-900 font-medium">{profile.cnic || 'Not provided'}</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">City</p>
                      {isEditing ? (
                        <Input 
                          value={formData.city}
                          onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                          className="mt-1 rounded-xl bg-slate-50 border-none"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium">{profile.city || 'Not provided'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Province</p>
                      {isEditing ? (
                        <Input 
                          value={formData.province}
                          onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
                          placeholder="Enter province"
                          className="mt-1 rounded-xl bg-slate-50 border-none"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium">{profile.province || 'Not provided'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${profile.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {profile.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>

                  {profile.role === 'reseller' && (
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Social Media Handles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">TikTok Handle</p>
                          {isEditing ? (
                            <Input 
                              value={formData.tiktok}
                              onChange={e => setFormData(prev => ({ ...prev, tiktok: e.target.value }))}
                              placeholder="@username"
                              className="mt-1 rounded-xl bg-slate-50 border-none"
                            />
                          ) : (
                            <p className="text-slate-900 font-medium">{profile.socialLinks?.tiktok || 'Not provided'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">YouTube Channel</p>
                          {isEditing ? (
                            <Input 
                              value={formData.youtube}
                              onChange={e => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                              placeholder="Channel name or link"
                              className="mt-1 rounded-xl bg-slate-50 border-none"
                            />
                          ) : (
                            <p className="text-slate-900 font-medium">{profile.socialLinks?.youtube || 'Not provided'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instagram Handle</p>
                          {isEditing ? (
                            <Input 
                              value={formData.instagram}
                              onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                              placeholder="@username"
                              className="mt-1 rounded-xl bg-slate-50 border-none"
                            />
                          ) : (
                            <p className="text-slate-900 font-medium">{profile.socialLinks?.instagram || 'Not provided'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Facebook Profile/Page</p>
                          {isEditing ? (
                            <Input 
                              value={formData.facebook}
                              onChange={e => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                              placeholder="Profile name or link"
                              className="mt-1 rounded-xl bg-slate-50 border-none"
                            />
                          ) : (
                            <p className="text-slate-900 font-medium">{profile.socialLinks?.facebook || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complete Address</p>
                    {isEditing ? (
                      <Textarea 
                        value={formData.address}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your full shipping address"
                        className="mt-1 rounded-xl bg-slate-50 border-none min-h-[100px]"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium leading-relaxed">
                        {profile.address || 'No address provided yet.'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financials">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b p-6">
                  <CardTitle className="text-lg font-bold">Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {profile.role !== 'customer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wallet Balance</p>
                        <p className="text-2xl font-black text-slate-900">Rs. {(profile.walletBalance || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Profit</p>
                        <p className="text-2xl font-black text-slate-900">Rs. {(profile.pendingProfit || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Withdrawn</p>
                        <p className="text-2xl font-black text-slate-900">Rs. {(profile.totalWithdrawn || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <div className={`pt-8 ${profile.role !== 'customer' ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2 text-indigo-600" />
                        Withdrawal Method
                      </h3>
                      {!isEditing && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditing(true)}
                          className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl"
                        >
                          Update Method
                        </Button>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold">Payment Method</Label>
                          <Select 
                            value={formData.paymentMethod} 
                            onValueChange={(value: any) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                          >
                            <SelectTrigger className="rounded-xl bg-slate-50 border-none">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bank">Bank Transfer</SelectItem>
                              <SelectItem value="JazzCash">JazzCash</SelectItem>
                              <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold">Account Details</Label>
                          <Input 
                            value={formData.paymentDetails}
                            onChange={e => setFormData(prev => ({ ...prev, paymentDetails: e.target.value }))}
                            placeholder="Account number / IBAN"
                            className="rounded-xl bg-slate-50 border-none"
                          />
                        </div>
                      </div>
                    ) : (
                      profile.paymentInfo ? (
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-indigo-600 uppercase">{profile.paymentInfo.method}</p>
                          </div>
                          <p className="text-slate-900 font-bold">{profile.paymentInfo.details}</p>
                        </div>
                      ) : (
                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                          <p className="text-sm text-slate-500 italic">No payment information provided yet.</p>
                          <Button 
                            variant="link" 
                            onClick={() => setIsEditing(true)}
                            className="text-indigo-600 font-bold mt-2"
                          >
                            Add Payment Method
                          </Button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Card Details Section */}
                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                        <CreditCard className="w-4 h-4 mr-2 text-indigo-600" />
                        Credit or Debit Card Details
                      </h3>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold">Cardholder Name</Label>
                          <Input 
                            value={formData.cardHolder}
                            onChange={e => setFormData(prev => ({ ...prev, cardHolder: e.target.value }))}
                            placeholder="John Doe"
                            className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label className="text-[10px] uppercase text-slate-400 font-bold">Card Number</Label>
                            <Input 
                              value={formData.cardNumber}
                              onChange={e => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                              placeholder="1234 5678 1234 5678"
                              className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-slate-400 font-bold">Expiry</Label>
                            <Input 
                              value={formData.cardExpiry}
                              onChange={e => setFormData(prev => ({ ...prev, cardExpiry: e.target.value }))}
                              placeholder="MM/YY"
                              className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-slate-400 font-bold">CVV</Label>
                            <Input 
                              value={formData.cardCVV}
                              onChange={e => setFormData(prev => ({ ...prev, cardCVV: e.target.value }))}
                              placeholder="xxx"
                              className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      (profile as any)?.cardInfo ? (
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-slate-900 dark:text-white">{(profile as any).cardInfo.cardHolder}</p>
                            <p className="text-xs font-bold text-slate-500 font-mono">{(profile as any).cardInfo.cardExpiry}</p>
                          </div>
                          <p className="text-slate-655 dark:text-slate-350 font-mono text-xs tracking-wider">
                            {(profile as any).cardInfo.cardNumber.replace(/\d(?=\d{4})/g, "*")}
                          </p>
                        </div>
                      ) : (
                        <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center">
                          <p className="text-sm text-slate-500 italic">No credit/debit card details provided yet.</p>
                          <Button 
                            variant="link" 
                            onClick={() => setIsEditing(true)}
                            className="text-indigo-600 font-bold mt-2"
                          >
                            Add Credit/Debit Card
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b p-6">
                  <CardTitle className="text-lg font-bold">Order History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingOrders ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <p className="text-sm font-medium">Loading your orders...</p>
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {orders.map((order) => (
                        <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                              <p className="text-sm font-black text-slate-900">#{order.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</p>
                              <p className="text-sm font-medium text-slate-600">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                              <div className="flex items-center">
                                {order.status === 'Delivered' ? (
                                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                                ) : order.status === 'Shipped' ? (
                                  <Truck className="w-4 h-4 mr-1.5 text-blue-500" />
                                ) : order.status === 'Cancelled' ? (
                                  <AlertCircle className="w-4 h-4 mr-1.5 text-rose-500" />
                                ) : (
                                  <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
                                )}
                                <span className={`text-xs font-bold uppercase ${
                                  order.status === 'Delivered' ? 'text-emerald-600' :
                                  order.status === 'Shipped' ? 'text-blue-600' :
                                  order.status === 'Cancelled' ? 'text-rose-600' :
                                  'text-amber-600'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</p>
                              <p className="text-sm font-black text-indigo-600">Rs. {order.sellingPrice.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-2xl p-4 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Items</p>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-slate-600 font-medium">{item.title} <span className="text-slate-400 text-xs">x{item.quantity}</span></span>
                                  <span className="text-slate-900 font-bold">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">You haven't placed any orders yet.</p>
                      <Button variant="link" className="text-indigo-600 font-bold mt-2" onClick={() => window.location.href = '/shop'}>
                        Start Shopping
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
