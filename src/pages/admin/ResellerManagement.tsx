import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Eye, Phone, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ResellerManagement() {
  const { formatPrice } = useCurrency();
  const [resellers, setResellers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification Details Modal
  const [selectedReseller, setSelectedReseller] = useState<UserProfile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'reseller'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setResellers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading resellers:", error);
      toast.error("Failed to load resellers list: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleVerification = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isVerified: !current });
      toast.success(`Reseller ${!current ? 'verified' : 'unverified'}`);
      if (selectedReseller && selectedReseller.uid === uid) {
        setSelectedReseller(prev => prev ? { ...prev, isVerified: !current } : null);
      }
    } catch (error) {
      toast.error("Failed to update verification");
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Platform Resellers</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage registered reseller accounts and verification status</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold bg-white dark:bg-slate-900">Loading resellers...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <TableRow>
                <TableHead className="font-bold text-slate-900 dark:text-white">Name</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Contact</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">City</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Wallet</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                    No resellers registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                resellers.map((r) => (
                  <TableRow key={r.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {r.fullName}
                        <Badge className={`${r.isVerified ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'} border-none rounded-full px-2 py-0 text-[10px] font-bold`}>
                          {r.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm dark:text-white">{r.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">{r.mobile}</p>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{r.city || '-'}</TableCell>
                    <TableCell className="font-bold text-indigo-650 dark:text-indigo-400 font-sans">{formatPrice(r.walletBalance || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleVerification(r.uid, r.isVerified)}
                          className={r.isVerified ? 'text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20' : 'text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}
                        >
                          {r.isVerified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedReseller(r); setIsDetailsOpen(true); }}
                          className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Reseller Documentation & Verification Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl rounded-3xl overflow-y-auto max-h-[90vh] bg-white dark:bg-slate-900 border dark:border-slate-800 text-slate-900 dark:text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 dark:text-white">
              <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Reseller Verification Portal
            </DialogTitle>
          </DialogHeader>

          {selectedReseller && (
            <div className="space-y-6 mt-4">
              {/* Top Banner Status */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedReseller.isVerified 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
              }`}>
                <div>
                  <p className="font-bold text-sm">Status: {selectedReseller.isVerified ? 'Fully Verified Reseller' : 'Pending Verification Review'}</p>
                  <p className="text-xs mt-0.5 opacity-90">Joined on {selectedReseller.createdAt ? new Date(selectedReseller.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => toggleVerification(selectedReseller.uid, selectedReseller.isVerified)}
                  className={`font-bold ${
                    selectedReseller.isVerified 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-none' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-none'
                  }`}
                >
                  {selectedReseller.isVerified ? 'Revoke Verification' : 'Approve & Verify'}
                </Button>
              </div>

              {/* Grid 2-columns details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact and Personal details */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Personal & Contact Info</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Full Name:</span>
                      <span className="font-bold">{selectedReseller.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Email Address:</span>
                      <span className="font-bold">{selectedReseller.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Primary Mobile:</span>
                      <span className="font-bold flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {selectedReseller.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Secondary Mobile:</span>
                      <span className="font-bold flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {selectedReseller.mobile2 || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">CNIC Number:</span>
                      <span className="font-bold">{selectedReseller.cnic || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Address & Payments */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Address & Payment details</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">City / Province:</span>
                      <span className="font-bold">{selectedReseller.city}, {selectedReseller.province}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-450 dark:text-slate-400">Residential Address:</p>
                      <p className="font-bold pl-2 border-l border-indigo-200 dark:border-indigo-900 text-slate-700 dark:text-slate-300">{selectedReseller.address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-450 dark:text-slate-400">Permanent Address:</p>
                      <p className="font-bold pl-2 border-l border-indigo-200 dark:border-indigo-900 text-slate-700 dark:text-slate-300">{selectedReseller.permanentAddress || 'Same as residential'}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Payout Method:</span>
                      <span className="font-bold flex items-center gap-1"><CreditCard className="w-3 h-3 text-slate-400" /> {selectedReseller.paymentInfo?.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 dark:text-slate-400">Details:</span>
                      <span className="font-mono font-bold">{selectedReseller.paymentInfo?.details}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Verification Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-center">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CNIC Front Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicFrontUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all bg-slate-50 dark:bg-slate-800 h-32 flex items-center justify-center"
                    >
                      {selectedReseller.cnicFrontUrl ? (
                        <img src={selectedReseller.cnicFrontUrl} alt="CNIC Front" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-slate-400 text-xs">No Document Uploaded</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-center">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CNIC Back Side</p>
                    <div 
                      onClick={() => setPreviewImage(selectedReseller.cnicBackUrl || null)}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all bg-slate-50 dark:bg-slate-800 h-32 flex items-center justify-center"
                    >
                      {selectedReseller.cnicBackUrl ? (
                        <img src={selectedReseller.cnicBackUrl} alt="CNIC Back" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-slate-400 text-xs">No Document Uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full size Document Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none rounded-3xl shadow-none">
          {previewImage && (
            <div className="relative flex items-center justify-center max-h-[90vh]">
              <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[90vh] object-contain rounded-2xl bg-slate-950/80 p-4" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
