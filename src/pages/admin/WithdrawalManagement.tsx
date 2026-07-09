import { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Withdrawal } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function WithdrawalManagement() {
  const { formatPrice } = useCurrency();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (withdrawal: Withdrawal, status: 'Approved' | 'Rejected') => {
    try {
      const withdrawalRef = doc(db, 'withdrawals', withdrawal.id);
      const userRef = doc(db, 'users', withdrawal.userId);

      if (status === 'Approved') {
        // Deduct from wallet and add to total withdrawn
        await updateDoc(userRef, {
          walletBalance: increment(-withdrawal.amount),
          totalWithdrawn: increment(withdrawal.amount)
        });
      }

      await updateDoc(withdrawalRef, { status });
      toast.success(`Withdrawal ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Action failed");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Withdrawals</h1>
        <p className="text-slate-500">Review and process withdrawal requests</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Reseller ID</TableHead>
              <TableHead className="font-bold">Amount</TableHead>
              <TableHead className="font-bold">Method</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="text-slate-500">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="font-mono text-xs">#{w.userId.slice(0, 8)}</TableCell>
                <TableCell className="font-bold text-slate-900">{formatPrice(w.amount)}</TableCell>
                <TableCell>{w.method}</TableCell>
                <TableCell>
                  <Badge className={`${
                    w.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    w.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  } border-none rounded-full px-3`}>
                    {w.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {w.status === 'Pending' && (
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAction(w, 'Approved')}
                        className="text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAction(w, 'Rejected')}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
