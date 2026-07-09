import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';
import { Eye, EyeOff, Lock, ShieldCheck, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResellerSettings() {
  const { profile } = useAuth();

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPwd.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Passwords do not match');
      return;
    }

    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      toast.success('Password changed successfully!');
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in before changing your password');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const PasswordInput = ({
    id, label, value, onChange, show, onToggle, placeholder, autoComplete,
  }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder?: string; autoComplete?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
        <Lock className="w-3 h-3" /> {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          autoComplete={autoComplete}
          className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 pr-10 dark:text-white"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account security.</p>
      </div>

      {/* Verification Status Card */}
      <div className={`rounded-2xl p-5 border flex items-start gap-4 ${
        profile?.isVerified
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          profile?.isVerified ? 'bg-emerald-100 dark:bg-emerald-950/20' : 'bg-amber-100 dark:bg-amber-950/20'
        }`}>
          {profile?.isVerified
            ? <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
            : <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-450" />}
        </div>
        <div>
          <p className={`font-black text-sm ${profile?.isVerified ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
            {profile?.isVerified ? 'Account Verified' : 'Verification Pending'}
          </p>
          <p className={`text-xs mt-0.5 ${profile?.isVerified ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
            {profile?.isVerified
              ? 'Your reseller account is fully verified. You have full access to all features.'
              : 'Your account is under review. An admin will verify it shortly. Some features may be limited until verified.'}
          </p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">Change Password</h2>
            <p className="text-xs text-slate-400">You'll be asked to re-enter your current password for security.</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <PasswordInput
            id="current-pwd-reseller" label="Current Password"
            value={currentPwd} onChange={setCurrentPwd}
            show={showCurrent} onToggle={() => setShowCurrent(v => !v)}
            autoComplete="current-password"
          />
          <PasswordInput
            id="new-pwd-reseller" label="New Password"
            value={newPwd} onChange={setNewPwd}
            show={showNew} onToggle={() => setShowNew(v => !v)}
            placeholder="Min. 6 characters" autoComplete="new-password"
          />
          <PasswordInput
            id="confirm-pwd-reseller" label="Confirm New Password"
            value={confirmPwd} onChange={setConfirmPwd}
            show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
            autoComplete="new-password"
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
              className="flex items-center justify-center gap-2 w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200/50 dark:shadow-none"
            >
              {pwdLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              ) : pwdSuccess ? (
                <><CheckCircle className="w-4 h-4" /> Password Updated!</>
              ) : (
                <><KeyRound className="w-4 h-4" /> Update Password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
