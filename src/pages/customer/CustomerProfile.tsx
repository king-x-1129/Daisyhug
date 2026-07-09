import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '@/lib/firebase';
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Camera, Loader2, Mail, MapPin, Phone, Calendar, Edit2, Save, X, Package, CheckCircle, Truck, Clock, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Order } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'profile' | 'tracking' | 'security';

const STATUS_STEPS = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
const statusIcons: Record<string, any> = {
  Pending: Clock, Confirmed: Package, Packed: Package, Shipped: Truck, Delivered: CheckCircle,
  Returned: AlertCircle, Refused: AlertCircle, Cancelled: X,
};
const statusColors: Record<string, string> = {
  Pending: 'text-amber-600 dark:text-amber-450', Confirmed: 'text-blue-600 dark:text-blue-450', Packed: 'text-indigo-600 dark:text-indigo-455',
  Shipped: 'text-purple-600 dark:text-purple-450', Delivered: 'text-emerald-600 dark:text-emerald-450',
  Returned: 'text-rose-600 dark:text-rose-455', Refused: 'text-rose-600 dark:text-rose-455', Cancelled: 'text-slate-400 dark:text-slate-500',
};
const statusBgs: Record<string, string> = {
  Pending: 'bg-amber-100 dark:bg-amber-950/20 border border-amber-200/20 dark:border-amber-900/30', Confirmed: 'bg-blue-100 dark:bg-blue-950/20 border border-blue-200/20 dark:border-blue-900/30', Packed: 'bg-indigo-100 dark:bg-indigo-950/20 border border-indigo-200/20 dark:border-indigo-900/30',
  Shipped: 'bg-purple-100 dark:bg-purple-950/20 border border-purple-200/20 dark:border-purple-900/30', Delivered: 'bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-200/20 dark:border-emerald-900/30',
  Returned: 'bg-rose-100 dark:bg-rose-950/20 border border-rose-200/20 dark:border-rose-900/30', Refused: 'bg-rose-100 dark:bg-rose-950/20 border border-rose-200/20 dark:border-rose-900/30', Cancelled: 'bg-slate-100 dark:bg-slate-800 border border-slate-200/20 dark:border-slate-700/30',
};

function TrackingCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isFinal = ['Delivered', 'Returned', 'Refused', 'Cancelled'].includes(order.status);

  const StatusIcon = statusIcons[order.status] || Clock;
  const statusColor = statusColors[order.status] || 'text-slate-550 dark:text-slate-400';
  const statusBg = statusBgs[order.status] || 'bg-slate-100 dark:bg-slate-800';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${statusBg} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          </div>
          <div>
            <p className="font-black text-slate-900 dark:text-white text-sm">#{order.id.slice(-10).toUpperCase()}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{format(parseISO(order.createdAt), 'MMM dd, yyyy')} · {order.items.length} item(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusBg} ${statusColor}`}>{order.status}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-50 dark:border-slate-800"
          >
            <div className="p-5 space-y-5">
              {/* Step Tracker */}
              {!['Returned', 'Refused', 'Cancelled'].includes(order.status) && (
                <div className="overflow-x-auto pb-2">
                  <div className="flex items-center min-w-max">
                    {STATUS_STEPS.map((step, i) => {
                      const done = currentStep >= i;
                      const active = currentStep === i;
                      const Icon = statusIcons[step] || Clock;
                      return (
                        <div key={step} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                              done ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            } ${active ? 'ring-4 ring-indigo-100 dark:ring-indigo-950/50' : ''}`}>
                              <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-slate-350 dark:text-slate-500'}`} />
                            </div>
                            <p className={`text-[9px] font-bold mt-1.5 whitespace-nowrap ${done ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>{step}</p>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`w-12 h-0.5 mx-1 mb-4 rounded-full ${currentStep > i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tracking Number */}
              {order.trackingNumber && (
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl px-4 py-2.5 border border-indigo-100 dark:border-indigo-900/40 text-sm text-slate-600 dark:text-slate-300">
                  <Truck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-medium">Tracking ID:</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-400">{order.trackingNumber}</span>
                  {order.carrier && <span className="text-slate-400 dark:text-slate-500 text-xs">via {order.carrier}</span>}
                </div>
              )}

              {/* Status History */}
              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="space-y-2 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Status History</p>
                  {[...order.statusHistory].reverse().map((upd, i) => {
                    const Icon = statusIcons[upd.status] || Clock;
                    const color = statusColors[upd.status] || 'text-slate-500 dark:text-slate-450';
                    return (
                      <div key={i} className="flex items-start gap-3 pl-3 relative">
                        <div className="absolute -left-[9px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-400 dark:border-indigo-500" />
                        <div>
                          <p className={`text-xs font-bold ${color} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {upd.status}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{format(parseISO(upd.timestamp), 'MMM dd, yyyy · hh:mm a')}</p>
                          {upd.note && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{upd.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Items */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1">Items</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-350">{item.title} <span className="text-slate-400 dark:text-slate-500">×{item.quantity}</span></span>
                    <span className="font-black text-slate-900 dark:text-white font-sans">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-800 mt-1">
                  <span className="font-bold text-slate-650 dark:text-slate-400">Total</span>
                  <span className="font-black text-indigo-650 dark:text-indigo-400 font-sans">Rs. {order.sellingPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CustomerProfile() {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', mobile: '', city: '', province: '', address: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        mobile: profile.mobile || '',
        city: profile.city || '',
        province: profile.province || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoadingOrders(false);
    }, () => setLoadingOrders(false));
    return () => unsub();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { ...formData });
      toast.success('Profile updated!');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (newPwd.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      toast.success('Password changed successfully!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally { setPwdLoading(false); }
  };

  if (!profile) return (
    <div className="flex h-64 items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'profile' as Tab, label: 'My Profile' },
    { id: 'tracking' as Tab, label: `Order Tracking (${orders.length})` },
    { id: 'security' as Tab, label: 'Security' },
  ];

  return (
    <div className="space-y-6 max-w-3xl text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Account</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile and track your orders.</p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-750 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl bg-white/20">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-lg flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white">{profile.fullName}</h2>
                  <p className="text-indigo-200 text-sm font-medium capitalize mt-1">{profile.role}</p>
                  <div className="flex items-center gap-4 mt-3 text-indigo-200 text-xs flex-wrap justify-center sm:justify-start">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>
                    {profile.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.city}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {format(new Date(profile.createdAt), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 dark:text-white">Personal Information</h3>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-3 py-1.5 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold text-sm px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-indigo-600 text-white font-bold text-sm px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-70">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'fullName', icon: User },
                    { label: 'Phone Number', key: 'mobile', icon: Phone, placeholder: '+92 300 0000000' },
                    { label: 'City', key: 'city', icon: MapPin, placeholder: 'Your city' },
                    { label: 'Province', key: 'province', icon: MapPin, placeholder: 'Province' },
                  ].map(({ label, key, icon: Icon, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Icon className="w-3 h-3" /> {label}
                      </label>
                      {isEditing ? (
                        <Input
                          value={(formData as any)[key]}
                          onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium text-sm py-2">{(profile as any)[key] || <span className="text-slate-400 dark:text-slate-500 italic font-sans">Not provided</span>}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Delivery Address</label>
                  {isEditing ? (
                    <Textarea
                      value={formData.address}
                      onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                      placeholder="Your full shipping address"
                      className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 min-h-[100px] dark:text-white"
                    />
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm py-2 leading-relaxed">
                      {profile.address || <span className="text-slate-400 dark:text-slate-550 italic">No address on file</span>}
                    </p>
                  )}
                </div>

                {/* Verification Status */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profile.isVerified ? 'bg-emerald-100 dark:bg-emerald-950/20' : 'bg-amber-100 dark:bg-amber-950/20'}`}>
                    {profile.isVerified
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                      : <Clock className="w-4 h-4 text-amber-600 dark:text-amber-450" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{profile.isVerified ? 'Verified Account' : 'Pending Verification'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{profile.isVerified ? 'Your account is fully verified.' : 'Verification may take up to 24 hours.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tracking' && (
          <motion.div key="tracking" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Click any order to expand full tracking details and delivery timeline.</p>
            {loadingOrders ? (
              <div className="flex h-48 items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-slate-500 dark:text-slate-450">No orders to track yet.</p>
              </div>
            ) : (
              orders.map(order => <TrackingCard key={order.id} order={order} />)
            )}
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 dark:text-white">Change Password</h2>
                  <p className="text-xs text-slate-400">Keep your account secure with a strong password.</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                {[
                  { id: 'cp-current', label: 'Current Password', value: currentPwd, setter: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(v => !v), ac: 'current-password' },
                  { id: 'cp-new',     label: 'New Password',     value: newPwd,     setter: setNewPwd,     show: showNew,     toggle: () => setShowNew(v => !v),     ac: 'new-password', ph: 'Min. 6 characters' },
                  { id: 'cp-confirm', label: 'Confirm New Password', value: confirmPwd, setter: setConfirmPwd, show: showConfirm, toggle: () => setShowConfirm(v => !v), ac: 'new-password' },
                ].map(({ id, label, value, setter, show, toggle, ac, ph }) => (
                  <div key={id} className="space-y-1.5">
                    <label htmlFor={id} className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {label}
                    </label>
                    <div className="relative">
                      <Input
                        id={id} type={show ? 'text' : 'password'} value={value}
                        onChange={e => setter(e.target.value)}
                        placeholder={ph || '••••••••'} autoComplete={ac}
                        className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 pr-10 dark:text-white"
                      />
                      <button type="button" onClick={toggle} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <button type="submit" disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
                    className="flex items-center justify-center gap-2 w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200/50"
                  >
                    {pwdLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                      : <><KeyRound className="w-4 h-4" /> Update Password</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
