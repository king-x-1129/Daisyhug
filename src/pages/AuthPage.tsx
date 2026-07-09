// Map Firebase auth error codes to user-friendly messages
const getAuthErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please contact support.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email. Please register first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site.',
    'auth/cancelled-popup-request': 'Another sign-in is in progress.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/requires-recent-login': 'Please sign in again to continue.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/provider-already-linked': 'This sign-in method is already linked to your account.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
};

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserRole } from '@/types';
import { User, Store, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const isAdminRoute = 
    location.pathname === '/auth/admini' || 
    location.pathname === '/admin-login' || 
    searchParams.get('admin') === 'true' || 
    searchParams.get('access') === 'admin';

  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.email === 'kingx1129@gmail.com' || user.email === 'kingx1129@gmail.com') {
        navigate('/super-admin');
      } else if (profile.role === 'admin') {
        navigate('/admin');
      } else if (profile.role === 'reseller') {
        navigate('/reseller');
      } else if (profile.role === 'customer') {
        navigate('/customer');
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'customer' | 'reseller'>('customer');
  const [regLoading, setRegLoading] = useState(false);
  const [regErrors, setRegErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  // Password visibility
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);

  const validateLogin = () => {
    const errs: typeof loginErrors = {};
    if (!loginEmail || !/\S+@\S+\.\S+/.test(loginEmail)) errs.email = 'Valid email required';
    if (!loginPassword || loginPassword.length < 6) errs.password = 'Min 6 characters';
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateRegister = () => {
    const errs: typeof regErrors = {};
    if (!regName || regName.trim().length < 2) errs.name = 'Full name required (min 2 chars)';
    if (!regEmail || !/\S+@\S+\.\S+/.test(regEmail)) errs.email = 'Valid email required';
    if (!regPassword || regPassword.length < 6) errs.password = 'Min 6 characters';
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoginLoading(true);
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } catch (signInError: any) {
        // Automatic admin password migration logic
        if (loginEmail === 'kingx1129@gmail.com' && loginPassword === 'Password@1129' && (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential')) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, loginEmail, 'adminPassword123');
            if (auth.currentUser) {
              await updatePassword(auth.currentUser, 'Password@1129');
              toast.success('Admin password updated to Password@1129 in Firebase.');
            }
          } catch (oldPasswordErr) {
            throw signInError;
          }
        } else if (loginEmail === 'storeilia08@gmail.com' && loginPassword === '@resell.Daisy@123' && (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential')) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              fullName: 'Moderator Admin',
              email: loginEmail,
              role: 'admin',
              walletBalance: 0,
              pendingProfit: 0,
              totalWithdrawn: 0,
              isVerified: true,
              createdAt: new Date().toISOString(),
            });
            toast.success('Admin account auto-created successfully!');
          } catch (createError) {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }
      
      // Fetch user profile from Firestore to determine role and redirect accordingly
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      let userData = userDoc.exists() ? userDoc.data() : null;

      // Ensure admin/super-admin profiles are correctly set up and have correct role
      if (userCredential.user.email === 'kingx1129@gmail.com' || userCredential.user.email === 'storeilia08@gmail.com') {
        if (!userData) {
          userData = {
            uid: userCredential.user.uid,
            fullName: userCredential.user.email === 'kingx1129@gmail.com' ? 'Platform Administrator' : 'Moderator Admin',
            email: userCredential.user.email,
            role: 'admin',
            walletBalance: userCredential.user.email === 'kingx1129@gmail.com' ? 125000 : 0,
            pendingProfit: userCredential.user.email === 'kingx1129@gmail.com' ? 24500 : 0,
            totalWithdrawn: userCredential.user.email === 'kingx1129@gmail.com' ? 48000 : 0,
            isVerified: true,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        } else if (userData.role !== 'admin') {
          await updateDoc(doc(db, 'users', userCredential.user.uid), { role: 'admin' });
          userData.role = 'admin';
        }
      }

      if (userData) {
        const isUserAdmin = userData.role === 'admin' || userData.email === 'kingx1129@gmail.com' || userData.email === 'storeilia08@gmail.com';
        if (isUserAdmin && !isAdminRoute) {
          await signOut(auth);
          toast.error("Admin accounts can only log in through the Admin portal.");
          setLoginLoading(false);
          return;
        }

        if (userData.email === 'kingx1129@gmail.com' || userCredential.user.email === 'kingx1129@gmail.com') {
          toast.success('Super Admin logged in successfully!');
          navigate('/super-admin');
          return;
        }
        if (userData.role === 'admin') {
          toast.success('Admin logged in successfully!');
          navigate('/admin');
          return;
        } else if (userData.role === 'reseller') {
          toast.success('Reseller logged in successfully!');
          navigate('/reseller');
          return;
        } else if (userData.role === 'customer') {
          toast.success('Welcome back!');
          navigate('/customer');
          return;
        }
      }

      toast.success('Logged in successfully!');
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    if (regRole === 'reseller') {
      navigate('/become-reseller', {
        state: {
          fullName: regName.trim(),
          email: regEmail,
          password: regPassword
        }
      });
      return;
    }

    setRegLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const role: UserRole = (regEmail === 'kingx1129@gmail.com' || regEmail === 'storeilia08@gmail.com' ? 'admin' : regRole) as any;
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName: regName.trim(),
        email: regEmail,
        role: role as UserRole,
        walletBalance: 0,
        pendingProfit: 0,
        totalWithdrawn: 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
      });
      
      toast.success('Account created successfully!');
      if (role === 'admin') {
        if (regEmail === 'kingx1129@gmail.com') {
          navigate('/super-admin');
        } else {
          navigate('/admin');
        }
      } else if (role === 'reseller') {
        navigate('/reseller');
      } else if (role === 'customer') {
        navigate('/customer');
      } else {
        navigate(redirectTo);
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      let role: UserRole = 'customer';
      
      if (!userDoc.exists()) {
        role = (result.user.email === 'kingx1129@gmail.com' || result.user.email === 'storeilia08@gmail.com') ? 'admin' : 'customer';
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          fullName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          email: result.user.email || '',
          photoURL: result.user.photoURL || '',
          role: role,
          walletBalance: 0,
          pendingProfit: 0,
          totalWithdrawn: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        role = userDoc.data().role || 'customer';
      }

      const isUserAdmin = role === 'admin' || result.user.email === 'kingx1129@gmail.com' || result.user.email === 'storeilia08@gmail.com';
      if (isUserAdmin && !isAdminRoute) {
        await signOut(auth);
        toast.error("Admin accounts can only log in through the Admin portal.");
        return;
      }
      
      toast.success('Logged in with Google!');
      if (role === 'admin') {
        if (result.user.email === 'kingx1129@gmail.com') {
          navigate('/super-admin');
        } else {
          navigate('/admin');
        }
      } else if (role === 'reseller') {
        navigate('/reseller');
      } else if (role === 'customer') {
        navigate('/customer');
      } else {
        navigate(redirectTo);
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error.code));
    }
  };

  const handleAdminOneClick = async () => {
    setLoginLoading(true);
    const adminEmail = 'kingx1129@gmail.com';
    const adminPassword = 'Password@1129';
    try {
      try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      } catch (signInError: any) {
        if (['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'].includes(signInError.code)) {
          if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
            try {
              // Try signing in with the old admin password
              await signInWithEmailAndPassword(auth, adminEmail, 'adminPassword123');
              if (auth.currentUser) {
                // If succeeded, update the password to the new one!
                await updatePassword(auth.currentUser, adminPassword);
                toast.success('Admin password updated to Password@1129 in Firebase.');
              }
            } catch (oldPasswordError: any) {
              toast.error('Admin account already exists in Firebase with a different password. Please reset the password in your Firebase Console or use Google Sign-in to access.');
              return;
            }
          } else {
            // It's 'auth/user-not-found', meaning we should create the account
            try {
              const uc = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
              await setDoc(doc(db, 'users', uc.user.uid), {
                uid: uc.user.uid,
                fullName: 'Platform Administrator',
                email: adminEmail,
                role: 'admin',
                walletBalance: 125000,
                pendingProfit: 24500,
                totalWithdrawn: 48000,
                isVerified: true,
                createdAt: new Date().toISOString(),
              });
            } catch (createError: any) {
              if (createError.code !== 'auth/email-already-in-use') throw createError;
              toast.error('Admin account already exists in Firebase with a different password. Please reset the password in your Firebase Console or use Google Sign-in to access.');
              return;
            }
          }
        } else {
          throw signInError;
        }
      }
      toast.success('Admin logged in!');
      navigate('/super-admin');
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleModeratorOneClick = async () => {
    setLoginLoading(true);
    const modEmail = 'storeilia08@gmail.com';
    const modPassword = '@resell.Daisy@123';
    try {
      try {
        await signInWithEmailAndPassword(auth, modEmail, modPassword);
      } catch (signInError: any) {
        if (['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'].includes(signInError.code)) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, modEmail, modPassword);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              fullName: 'Moderator Admin',
              email: modEmail,
              role: 'admin',
              walletBalance: 0,
              pendingProfit: 0,
              totalWithdrawn: 0,
              isVerified: true,
              createdAt: new Date().toISOString(),
            });
          } catch (createError) {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }
      toast.success('Moderator Admin logged in successfully!');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login as admin');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
            <span className="text-2xl font-black text-white">R</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">ResellXPK</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pakistan's #1 Reseller Platform</p>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800">
          <Tabs defaultValue="login" className="w-full">
            {!isAdminRoute && (
              <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 dark:bg-slate-800 p-1 rounded-none">
                <TabsTrigger id="tab-login" value="login" className="rounded-none font-bold text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                  Login
                </TabsTrigger>
                <TabsTrigger id="tab-register" value="register" className="rounded-none font-bold text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                  Register
                </TabsTrigger>
              </TabsList>
            )}

            {/* LOGIN */}
            <TabsContent value="login">
              <CardHeader className="space-y-1 pt-8 pb-2">
                <CardTitle className="text-2xl font-black text-center text-slate-900 dark:text-white">Welcome Back</CardTitle>
                <CardDescription className="text-center text-slate-500 dark:text-slate-400">Enter your credentials to continue</CardDescription>
              </CardHeader>
              <form id="login-form" onSubmit={handleLogin} noValidate>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={e => { setLoginEmail(e.target.value); setLoginErrors(p => ({ ...p, email: undefined })); }}
                      className="rounded-xl h-12 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus-visible:ring-indigo-500"
                      autoComplete="email"
                    />
                    {loginErrors.email && <p className="text-xs text-rose-500 font-medium">{loginErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => { setLoginPassword(e.target.value); setLoginErrors(p => ({ ...p, password: undefined })); }}
                        className="rounded-xl h-12 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pr-12 focus-visible:ring-indigo-500"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="text-xs text-rose-500 font-medium">{loginErrors.password}</p>}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3 pb-8 pt-2">
                  <Button id="login-submit" type="submit" disabled={loginLoading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 dark:shadow-none">
                    {loginLoading ? 'Logging in…' : 'Login'}
                  </Button>
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-semibold">Or</span></div>
                  </div>
                  <Button id="google-login" variant="outline" type="button" onClick={handleGoogleSignIn} disabled={loginLoading} className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 font-semibold">
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2" alt="" />
                    Continue with Google
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* REGISTER */}
            {!isAdminRoute && (
              <TabsContent value="register">
                <CardHeader className="space-y-1 pt-8 pb-2">
                  <CardTitle className="text-2xl font-black text-center text-slate-900 dark:text-white">Create Account</CardTitle>
                  <CardDescription className="text-center text-slate-500 dark:text-slate-400">Join thousands of resellers and customers</CardDescription>
                </CardHeader>
                <form id="register-form" onSubmit={handleRegister} noValidate>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Ahmed Khan"
                        value={regName}
                        onChange={e => { setRegName(e.target.value); setRegErrors(p => ({ ...p, name: undefined })); }}
                        className="rounded-xl h-12 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus-visible:ring-indigo-500"
                        autoComplete="name"
                      />
                      {regErrors.name && <p className="text-xs text-rose-500 font-medium">{regErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={e => { setRegEmail(e.target.value); setRegErrors(p => ({ ...p, email: undefined })); }}
                        className="rounded-xl h-12 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus-visible:ring-indigo-500"
                        autoComplete="email"
                      />
                      {regErrors.email && <p className="text-xs text-rose-500 font-medium">{regErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showRegPwd ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={e => { setRegPassword(e.target.value); setRegErrors(p => ({ ...p, password: undefined })); }}
                          className="rounded-xl h-12 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pr-12 focus-visible:ring-indigo-500"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {regErrors.password && <p className="text-xs text-rose-500 font-medium">{regErrors.password}</p>}
                    </div>
                    <div className="space-y-3">
                      <Label className="font-semibold text-slate-700 dark:text-slate-300">I want to…</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          id="role-customer"
                          type="button"
                          onClick={() => setRegRole('customer')}
                          className={`flex flex-col items-center justify-center gap-2 h-20 rounded-2xl border-2 font-bold text-sm transition-all ${
                            regRole === 'customer'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <User className="w-5 h-5" />
                          Shop & Buy
                        </button>
                        <button
                          id="role-reseller"
                          type="button"
                          onClick={() => setRegRole('reseller')}
                          className={`flex flex-col items-center justify-center gap-2 h-20 rounded-2xl border-2 font-bold text-sm transition-all ${
                            regRole === 'reseller'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <Store className="w-5 h-5" />
                          Resell & Earn
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-8 pt-2">
                    <Button id="register-submit" type="submit" disabled={regLoading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 dark:shadow-none">
                      {regLoading ? 'Creating Account…' : 'Create Account'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            )}
          </Tabs>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
