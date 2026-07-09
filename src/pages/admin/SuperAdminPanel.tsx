import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { UserProfile, UserRole } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Shield, ShieldAlert, UserCog, Search, Mail, CheckCircle, XCircle, Settings2, Trash2, Coins, Landmark, Calendar, Phone, MapPin, Eye, CreditCard, LogOut, LayoutDashboard, ArrowLeft } from 'lucide-react';

export function SuperAdminPanel() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Edit & View Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editPending, setEditPending] = useState<number>(0);
  const [editVerified, setEditVerified] = useState(false);
  
  // Extra Documentation & Account Details States
  const [editMobile, setEditMobile] = useState('');
  const [editMobile2, setEditMobile2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPermanentAddress, setEditPermanentAddress] = useState('');
  const [editCnic, setEditCnic] = useState('');
  const [editCnicFront, setEditCnicFront] = useState('');
  const [editCnicBack, setEditCnicBack] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Bank' | 'JazzCash' | 'Easypaisa' | ''>('');
  const [editPaymentDetails, setEditPaymentDetails] = useState('');
  
  // Scanned / Manual Credit Card details
  const [editCardNumber, setEditCardNumber] = useState('');
  const [editCardHolder, setEditCardHolder] = useState('');
  const [editCardExpiry, setEditCardExpiry] = useState('');
  const [editCardCVV, setEditCardCVV] = useState('');
  
  // Lightbox Preview Image
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security Check: Only kingx1129@gmail.com is allowed
  const isSuperAdmin = user?.email === 'kingx1129@gmail.com' || profile?.email === 'kingx1129@gmail.com';

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as unknown as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading users:", error);
      toast.error("Failed to load users list");
      setLoading(false);
    });

    return () => unsub();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = 
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.mobile?.includes(searchQuery) ||
        u.cnic?.includes(searchQuery);
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Stats
  const stats = useMemo(() => {
    let totalAdmins = 0;
    let totalResellers = 0;
    let totalCustomers = 0;
    let totalBalances = 0;

    users.forEach((u) => {
      if (u.role === 'admin') totalAdmins++;
      else if (u.role === 'reseller') totalResellers++;
      else if (u.role === 'customer') totalCustomers++;
      totalBalances += u.walletBalance || 0;
    });

    return { totalAdmins, totalResellers, totalCustomers, totalBalances };
  }, [users]);

  const handleOpenEdit = (u: UserProfile) => {
    setSelectedUser(u);
    setEditName(u.fullName || '');
    setEditRole(u.role || 'customer');
    setEditBalance(u.walletBalance || 0);
    setEditPending(u.pendingProfit || 0);
    setEditVerified(!!u.isVerified);
    
    // Extra docs loading
    setEditMobile(u.mobile || '');
    setEditMobile2(u.mobile2 || '');
    setEditCity(u.city || '');
    setEditProvince(u.province || '');
    setEditAddress(u.address || '');
    setEditPermanentAddress(u.permanentAddress || '');
    setEditCnic(u.cnic || '');
    setEditCnicFront(u.cnicFrontUrl || '');
    setEditCnicBack(u.cnicBackUrl || '');
    
    // Account details
    setEditPaymentMethod(u.paymentInfo?.method || '');
    setEditPaymentDetails(u.paymentInfo?.details || '');
    
    // Credit card details
    setEditCardNumber((u as any).cardInfo?.cardNumber || '');
    setEditCardHolder((u as any).cardInfo?.cardHolder || '');
    setEditCardExpiry((u as any).cardInfo?.cardExpiry || '');
    setEditCardCVV((u as any).cardInfo?.cardCVV || '');
    
    setIsEditOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      
      const updateData: any = {
        fullName: editName,
        role: editRole,
        walletBalance: editBalance,
        pendingProfit: editPending,
        isVerified: editVerified,
        mobile: editMobile,
        mobile2: editMobile2,
        city: editCity,
        province: editProvince,
        address: editAddress,
        permanentAddress: editPermanentAddress,
        cnic: editCnic,
        cnicFrontUrl: editCnicFront,
        cnicBackUrl: editCnicBack
      };

      if (editPaymentMethod) {
        updateData.paymentInfo = {
          method: editPaymentMethod,
          details: editPaymentDetails
        };
      } else {
        updateData.paymentInfo = null;
      }

      if (editCardNumber || editCardHolder || editCardExpiry || editCardCVV) {
        updateData.cardInfo = {
          cardNumber: editCardNumber,
          cardHolder: editCardHolder,
          cardExpiry: editCardExpiry,
          cardCVV: editCardCVV
        };
      } else {
        updateData.cardInfo = null;
      }

      await updateDoc(userRef, updateData);
      toast.success("User profile details updated successfully");
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Error saving user:", err);
      toast.error(err.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (u.email === 'kingx1129@gmail.com') {
      toast.error("You cannot delete the primary super admin account!");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user ${u.fullName} (${u.email})?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', u.uid));
      toast.success("User record deleted from database");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("Failed to delete user record");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
      navigate('/auth');
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar specific to Super Admin Layout */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
              <span className="text-sm font-black text-white uppercase tracking-wider">Super Console</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Role: ROOT_OWNER</p>
          </div>

          <nav className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold cursor-default shadow-md shadow-rose-900/30">
              <UserCog className="w-5 h-5" />
              <span>User Manager</span>
            </div>

            <Link 
              to="/admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-slate-400"
            >
              <LayoutDashboard className="w-5 h-5 text-slate-500" />
              <span>Standard Admin</span>
            </Link>

            <Link 
              to="/" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-slate-400"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
              <span>Main Storefront</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full flex items-center justify-start gap-3 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-xl py-3 px-4 h-auto font-bold border-none"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        <div className="flex justify-between items-center border-b pb-6 border-slate-200 dark:border-slate-850">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Super Admin Command Center</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Direct access to database user records, verification documents, and payment details.</p>
          </div>
          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-none px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-wider">
            Root Credentials Approved
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900 border-none text-white shadow-xl rounded-2xl relative overflow-hidden group">
            <div className="absolute right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-all duration-300">
              <Shield className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-bold">Platform Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.totalAdmins}</p>
              <p className="text-[10px] text-indigo-400 font-medium mt-1">Full access moderators</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-all duration-300">
              <UserCog className="w-32 h-32 text-slate-655" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-bold">Total Resellers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.totalResellers}</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-1">Earning commission partners</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-all duration-300">
              <UserCog className="w-32 h-32 text-slate-655" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-bold">Direct Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.totalCustomers}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Active buyers</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-xl rounded-2xl relative overflow-hidden group">
            <div className="absolute right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-all duration-300">
              <Coins className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-indigo-200 font-bold">Total Ledgers Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{formatPrice(stats.totalBalances)}</p>
              <p className="text-[10px] text-indigo-200 font-medium mt-1">Reseller accumulated balances</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Platform User Manager (Super Admin)
              </h2>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-grow md:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search name, email, phone, CNIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl"
                  />
                </div>

                {/* Role filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-11 md:w-44 bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl font-bold">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 dark:text-white border-slate-100 dark:border-slate-800 rounded-xl">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="reseller">Resellers</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400 font-bold text-sm">Loading users databases...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-bold text-sm">No users found matching search criteria.</div>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-850">
                    <TableRow>
                      <TableHead className="font-bold">Full Name</TableHead>
                      <TableHead className="font-bold">Email & Verification ID</TableHead>
                      <TableHead className="font-bold">Role</TableHead>
                      <TableHead className="font-bold text-right">Wallet Balance</TableHead>
                      <TableHead className="font-bold text-right">Pending Profit</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                      <TableHead className="font-bold text-center">Joined At</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <TableCell className="font-bold">
                          <div>
                            <p className="text-slate-900 dark:text-white">{u.fullName || 'No Name'}</p>
                            {u.cnic && (
                              <p className="text-[10px] text-indigo-500 font-bold mt-1">CNIC: {u.cnic}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[200px]">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" /> {u.email}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono select-all">UID: {u.uid}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${
                            u.role === 'admin' 
                              ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400' 
                              : u.role === 'reseller' 
                              ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'
                          } border-none rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px]`}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 dark:text-white">
                          {formatPrice(u.walletBalance || 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(u.pendingProfit || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {u.role === 'reseller' ? (
                            u.isVerified ? (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-none rounded-full flex items-center gap-1 w-fit mx-auto font-bold text-[10px]">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-none rounded-full flex items-center gap-1 w-fit mx-auto font-bold text-[10px]">
                                <XCircle className="w-3.5 h-3.5" /> Pending
                              </Badge>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-slate-500">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.createdAt ? format(parseISO(u.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => handleOpenEdit(u)}
                              className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-700 h-9 font-bold rounded-lg border-none"
                            >
                              <Settings2 className="w-4 h-4" /> Manage
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleDeleteUser(u)}
                              className="border-none text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-9 w-9 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit User Modal Dialog (Expanded view for Super Admin) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-none rounded-3xl max-w-4xl shadow-2xl p-6 dark:text-white animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCog className="w-6 h-6 text-indigo-650 dark:text-indigo-400" /> Super Admin Console: Account Profile
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400 text-xs">
              Review verification documents, scanned cards, residential addresses, and payment configurations.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Left Column: Account Settings & Wallet override */}
              <div className="space-y-5">
                <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  Account Core Settings
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="editName" className="font-bold text-slate-500 dark:text-slate-400">Full Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editRole" className="font-bold text-slate-500 dark:text-slate-400">Account Role</Label>
                    <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)}>
                      <SelectTrigger id="editRole" className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-11 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 dark:text-white border-slate-100 dark:border-slate-800 rounded-xl">
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="reseller">Reseller</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end pb-2 pl-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="editVerified" 
                        checked={editVerified} 
                        onCheckedChange={(val: boolean) => setEditVerified(val)} 
                        className="dark:border-slate-600 dark:data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:border-indigo-600 h-5 w-5 rounded-md"
                      />
                      <Label htmlFor="editVerified" className="font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                        Verified Profile
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editBalance" className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5" /> Wallet Balance (Rs.)
                    </Label>
                    <Input
                      id="editBalance"
                      type="number"
                      value={editBalance}
                      onChange={(e) => setEditBalance(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editPending" className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> Pending Profit (Rs.)
                    </Label>
                    <Input
                      id="editPending"
                      type="number"
                      value={editPending}
                      onChange={(e) => setEditPending(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-11"
                    />
                  </div>
                </div>

                {/* Scanned / Manual Credit Card details section */}
                <div className="space-y-4 pt-3">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Credit/Debit Card Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="editCardHolder" className="font-bold text-[11px] text-slate-500">Cardholder Name</Label>
                      <Input
                        id="editCardHolder"
                        value={editCardHolder}
                        onChange={(e) => setEditCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="editCardNumber" className="font-bold text-[11px] text-slate-500">Card Number</Label>
                        <Input
                          id="editCardNumber"
                          value={editCardNumber}
                          onChange={(e) => setEditCardNumber(e.target.value)}
                          placeholder="xxxx xxxx xxxx xxxx"
                          className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editCardExpiry" className="font-bold text-[11px] text-slate-500">Expiry</Label>
                        <Input
                          id="editCardExpiry"
                          value={editCardExpiry}
                          onChange={(e) => setEditCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editCardCVV" className="font-bold text-[11px] text-slate-500">CVV</Label>
                        <Input
                          id="editCardCVV"
                          value={editCardCVV}
                          onChange={(e) => setEditCardCVV(e.target.value)}
                          placeholder="xxx"
                          className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Documentation, Payment details, addresses */}
              <div className="space-y-6">
                {/* Contact & Location */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> Address & Contact Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="editMobile" className="font-bold text-[11px] text-slate-500">Primary Phone</Label>
                      <Input
                        id="editMobile"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="editMobile2" className="font-bold text-[11px] text-slate-500">Secondary Phone</Label>
                      <Input
                        id="editMobile2"
                        value={editMobile2}
                        onChange={(e) => setEditMobile2(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="editCity" className="font-bold text-[11px] text-slate-500">City</Label>
                      <Input
                        id="editCity"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="editProvince" className="font-bold text-[11px] text-slate-500">Province</Label>
                      <Input
                        id="editProvince"
                        value={editProvince}
                        onChange={(e) => setEditProvince(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editAddress" className="font-bold text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Residential Address</Label>
                    <Input
                      id="editAddress"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editPermanentAddress" className="font-bold text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Permanent Address</Label>
                    <Input
                      id="editPermanentAddress"
                      value={editPermanentAddress}
                      onChange={(e) => setEditPermanentAddress(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Verification IDs & CNIC */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Identity Documentation
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="editCnic" className="font-bold text-[11px] text-slate-500">CNIC Number</Label>
                      <Input
                        id="editCnic"
                        value={editCnic}
                        onChange={(e) => setEditCnic(e.target.value)}
                        placeholder="e.g. 37405-xxxxxxx-x"
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] font-bold text-slate-500">CNIC Front</span>
                        <div 
                          onClick={() => editCnicFront && setPreviewImage(editCnicFront)}
                          className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 bg-slate-50 dark:bg-slate-800 h-24 flex items-center justify-center"
                        >
                          {editCnicFront ? (
                            <img src={editCnicFront} alt="CNIC Front" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-slate-400 text-[10px]">No image</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] font-bold text-slate-500">CNIC Back</span>
                        <div 
                          onClick={() => editCnicBack && setPreviewImage(editCnicBack)}
                          className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 bg-slate-50 dark:bg-slate-800 h-24 flex items-center justify-center"
                        >
                          {editCnicBack ? (
                            <img src={editCnicBack} alt="CNIC Back" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-slate-400 text-[10px]">No image</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4" /> Account Payment details
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-1">
                      <Label htmlFor="editPaymentMethod" className="font-bold text-[11px] text-slate-500">Payment Method</Label>
                      <Select 
                        value={editPaymentMethod || "none"} 
                        onValueChange={(val: any) => setEditPaymentMethod(val === "none" ? "" : val)}
                      >
                        <SelectTrigger id="editPaymentMethod" className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 dark:text-white border-slate-100 dark:border-slate-800 rounded-xl">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Bank">Bank Transfer</SelectItem>
                          <SelectItem value="JazzCash">JazzCash</SelectItem>
                          <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="editPaymentDetails" className="font-bold text-[11px] text-slate-500">Details / Account Number</Label>
                      <Input
                        id="editPaymentDetails"
                        value={editPaymentDetails}
                        onChange={(e) => setEditPaymentDetails(e.target.value)}
                        placeholder="IBAN or account identifier number"
                        className="bg-slate-50 dark:bg-slate-850 dark:text-white border-none rounded-xl h-10 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">UID: {selectedUser?.uid}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl h-11 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 font-bold"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveUser} 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg border-none"
              >
                {isSubmitting ? "Saving..." : "Save Profile Details"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full size Document Preview Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none rounded-3xl shadow-none">
          {previewImage && (
            <div className="relative flex items-center justify-center max-h-[90vh]">
              <img 
                src={previewImage} 
                alt="Document Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-2xl bg-slate-950/80 p-4" 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
