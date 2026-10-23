import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Withdrawal, UserProfile } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, CreditCard, User } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawalWithUser extends Withdrawal {
  userName?: string;
  userEmail?: string;
  paymentMethod?: string;
  paymentDetails?: string;
}

export function WithdrawalManagement() {
  const { formatPrice } = useCurrency();
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'withdrawals'), async (snapshot) => {
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
      const sorted = raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich with reseller profile data (name, email, payment info)
      const enriched: WithdrawalWithUser[] = await Promise.all(
        sorted.map(async (w) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', w.userId));
            if (userSnap.exists()) {
              const userData = userSnap.data() as UserProfile;
              return {
                ...w,
                userName: userData.fullName || 'Unknown',
                userEmail: userData.email || '',
                paymentMethod: userData.paymentInfo?.method || w.method || 'N/A',
                paymentDetails: userData.paymentInfo?.details || '',
              };
            }
          } catch {
            // profile fetch failed — show truncated userId as fallback
          }
          return { ...w };
        })
      );

      setWithdrawals(enriched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (withdrawal: WithdrawalWithUser, status: 'Approved' | 'Rejected') => {
    try {
      const batch = writeBatch(db);
      const withdrawalRef = doc(db, 'withdrawals', withdrawal.id);
      const userRef = doc(db, 'users', withdrawal.userId);

      if (status === 'Approved') {
        // Atomic: deduct wallet balance AND increment totalWithdrawn in one batch
        batch.update(userRef, {
          walletBalance: increment(-withdrawal.amount),
          totalWithdrawn: increment(withdrawal.amount),
        });
      }

      batch.update(withdrawalRef, {
        status,
        processedAt: new Date().toISOString(),
      });

      await batch.commit();
      toast.success(`Withdrawal ${status.toLowerCase()} successfully`);
    } catch (error: any) {
      console.error('Withdrawal action error:', error);
      toast.error(error.message || 'Action failed. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Withdrawals</h1>
        <p className="text-slate-500 dark:text-slate-400">Review and process withdrawal requests</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading withdrawals...</div>
      ) : withdrawals.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          No withdrawal requests found.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-950">
              <TableRow className="border-b border-slate-200 dark:border-slate-800">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reseller</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Payment Info</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-bold text-right text-slate-700 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow
                  key={w.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                    <div>{new Date(w.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">#{w.id.slice(0, 8)}</div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {w.userName || `#${w.userId.slice(0, 8)}`}
                        </p>
                        {w.userEmail && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{w.userEmail}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-black text-slate-900 dark:text-white text-base">
                    {formatPrice(w.amount)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-start gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{w.paymentMethod || w.method}</p>
                        {w.paymentDetails && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{w.paymentDetails}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`border-none rounded-full px-3 text-xs font-bold ${
                        w.status === 'Approved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                          : w.status === 'Rejected'
                          ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {w.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {w.status === 'Pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAction(w, 'Approved')}
                          className="w-9 h-9 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl"
                          title="Approve withdrawal"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAction(w, 'Rejected')}
                          className="w-9 h-9 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
                          title="Reject withdrawal"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {w.status !== 'Pending' && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
