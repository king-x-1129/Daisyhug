import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  X,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface SavedCard {
  id: string;
  cardholderName: string;
  cardNumber: string; // Masked
  expiryDate: string;
  cardType: string;
  createdAt: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'deposit' | 'payment';
  description: string;
  status: 'Completed' | 'Pending' | 'Failed';
  createdAt: string;
}

export function CustomerWallet() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState<'form' | 'processing' | 'success'>('form');

  // New Card Form State
  const [newCard, setNewCard] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [saveCardCheckbox, setSaveCardCheckbox] = useState(true);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Note: We use standard Firestore onSnapshot listeners because this provides immediate real-time updates of wallet transactions and saved cards, keeping the customer's wallet UI synchronized.
  useEffect(() => {
    if (!user) return;

    // Fetch Saved Cards
    const qCards = query(collection(db, 'users', user.uid, 'paymentMethods'));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedCard));
      setCards(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoadingCards(false);
    }, () => setLoadingCards(false));

    // Fetch Wallet Transactions
    const qTx = query(collection(db, 'users', user.uid, 'walletTransactions'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction));
      setTransactions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoadingTx(false);
    }, () => setLoadingTx(false));

    return () => {
      unsubCards();
      unsubTx();
    };
  }, [user]);

  // Determine card type based on number
  const getCardType = (number: string) => {
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5')) return 'Mastercard';
    return 'Card';
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedCard = newCard.cardNumber.replace(/\s+/g, '');
    if (trimmedCard.length < 16) {
      toast.error("Please enter a valid 16-digit card number");
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(newCard.expiryDate)) {
      toast.error("Please enter expiry in MM/YY format");
      return;
    }

    setIsSavingCard(true);
    try {
      const cardType = getCardType(trimmedCard);
      const maskedNumber = `•••• •••• •••• ${trimmedCard.slice(-4)}`;

      await addDoc(collection(db, 'users', user.uid, 'paymentMethods'), {
        cardholderName: newCard.cardholderName,
        cardNumber: maskedNumber,
        expiryDate: newCard.expiryDate,
        cardType,
        createdAt: new Date().toISOString()
      });

      toast.success("Payment method saved successfully!");
      setNewCard({ cardholderName: '', cardNumber: '', expiryDate: '', cvv: '' });
      setIsAddCardOpen(false);
    } catch (error) {
      toast.error("Failed to save payment method");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'paymentMethods', cardId));
      toast.success("Card removed successfully");
      if (selectedCardId === cardId) {
        setSelectedCardId('');
      }
    } catch (error) {
      toast.error("Failed to remove card");
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const amountNum = Number(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }

    if (!selectedCardId && (!newCard.cardNumber || !newCard.cardholderName)) {
      toast.error("Please select a saved card or enter new card details");
      return;
    }

    setIsDepositing(true);
    setDepositStep('processing');

    try {
      // Simulate payment processing stages
      await new Promise(resolve => setTimeout(resolve, 1550)); // Simulated card charge delay
      
      // Save card if user entered new card and chose to save
      if (!selectedCardId && saveCardCheckbox) {
        const trimmedCard = newCard.cardNumber.replace(/\s+/g, '');
        const cardType = getCardType(trimmedCard);
        const maskedNumber = `•••• •••• •••• ${trimmedCard.slice(-4)}`;
        await addDoc(collection(db, 'users', user.uid, 'paymentMethods'), {
          cardholderName: newCard.cardholderName,
          cardNumber: maskedNumber,
          expiryDate: newCard.expiryDate,
          cardType,
          createdAt: new Date().toISOString()
        });
      }

      const timestamp = new Date().toISOString();

      // Write transaction
      await addDoc(collection(db, 'users', user.uid, 'walletTransactions'), {
        amount: amountNum,
        type: 'deposit',
        description: selectedCardId 
          ? `Deposit via saved card` 
          : `Deposit via online payment`,
        status: 'Completed',
        createdAt: timestamp
      });

      // Update User Balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(amountNum)
      });

      setDepositStep('success');
      toast.success(`Deposited ${formatPrice(amountNum)} successfully!`);
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setDepositStep('form');
    } finally {
      setIsDepositing(false);
    }
  };

  const resetDepositFlow = () => {
    setIsDepositOpen(false);
    setDepositStep('form');
    setDepositAmount('');
    setSelectedCardId('');
    setNewCard({ cardholderName: '', cardNumber: '', expiryDate: '', cvv: '' });
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-8 h-8 text-indigo-650 dark:text-indigo-400" />
            Secure Wallet
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage saved cards, deposit money, and pay online securely</p>
        </div>
        <Button 
          onClick={() => {
            setIsDepositOpen(true);
            setDepositStep('form');
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-5 font-bold shadow-lg shadow-indigo-150 border-none"
        >
          <Plus className="w-4 h-4 mr-2" /> Deposit Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Wallet Card & Saved Payment Methods */}
        <div className="lg:col-span-1 space-y-6">
          {/* Visual Premium Wallet Balance */}
          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-750 via-indigo-900 to-slate-950 text-white rounded-3xl overflow-hidden relative border border-white/5">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Wallet className="w-36 h-36" />
            </div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20"></div>

            <CardContent className="p-8 space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-indigo-250 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Balance
                </span>
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-slate-300 text-sm font-medium">Available Wallet Funds</p>
                <h2 className="text-4.5xl font-black mt-2 tracking-tight">
                  {formatPrice(profile?.walletBalance || 0)}
                </h2>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-white/10 text-xs text-indigo-200">
                <span>Verified Account Owner</span>
                <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded-full uppercase">
                  {profile?.fullName?.split(' ')[0]}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Saved Payment Methods */}
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-bold flex items-center dark:text-white">
                <CreditCard className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Saved Cards
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsAddCardOpen(true)}
                className="h-8 px-2.5 text-xs text-indigo-650 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCards ? (
                <div className="flex py-8 items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                  <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No saved cards. Add a card to pay faster.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {cards.map(card => (
                    <div 
                      key={card.id}
                      className="group relative bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 flex flex-col justify-between h-28 overflow-hidden"
                    >
                      {/* Sub-glow effect on hover */}
                      <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl transition-all duration-300 group-hover:bg-indigo-500/20"></div>

                      <div className="flex justify-between items-start z-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                            {card.cardType}
                          </span>
                          <span className="font-mono text-sm tracking-widest mt-1.5 font-bold">
                            {card.cardNumber}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 hover:bg-white/10 rounded-lg transition-all duration-200"
                          title="Remove Card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex justify-between items-end z-10">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase font-bold">Cardholder</span>
                          <span className="text-xs font-bold truncate max-w-[150px]">{card.cardholderName}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] text-slate-400 uppercase font-bold">Expires</span>
                          <span className="text-xs font-bold">{card.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Transaction History */}
        <div className="lg:col-span-2">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center dark:text-white">
                <History className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Wallet Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTx ? (
                <div className="flex py-20 items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-350" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                  <History className="w-12 h-12 text-slate-200 dark:text-slate-850 mx-auto mb-3" />
                  <p className="font-bold text-slate-500 dark:text-slate-405">No transaction logs available.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Deposits or order spend records will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                    <TableRow className="border-none">
                      <TableHead className="font-bold pl-6 text-slate-900 dark:text-white">Date</TableHead>
                      <TableHead className="font-bold text-slate-900 dark:text-white">Description</TableHead>
                      <TableHead className="font-bold text-slate-900 dark:text-white">Status</TableHead>
                      <TableHead className="font-bold text-right pr-6 text-slate-900 dark:text-white">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/30 border-b border-slate-100 dark:border-slate-800/80 transition-colors">
                        <TableCell className="pl-6 text-slate-500 dark:text-slate-450">
                          {format(parseISO(tx.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{tx.description}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 dark:bg-emerald-950/20 text-emerald-705 dark:text-emerald-450 border-none rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right pr-6 font-black font-sans text-sm ${
                          tx.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-450'
                        }`}>
                          {tx.type === 'deposit' ? '+' : '-'} {formatPrice(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deposit Funds Modal */}
      <AnimatePresence>
        {isDepositOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
                  Deposit Funds
                </h3>
                <button 
                  onClick={resetDepositFlow}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {depositStep === 'form' && (
                <form onSubmit={handleDepositSubmit} className="p-6 space-y-6">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Amount (Rs.)</Label>
                    <Input 
                      required
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="rounded-xl h-12 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white text-lg font-bold"
                    />
                    {/* Quick amount selectors */}
                    <div className="flex gap-2 mt-2">
                      {[500, 1000, 2500, 5000].map(amt => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setDepositAmount(amt.toString())}
                          className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all"
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Saved Cards Selection */}
                  {cards.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Select Saved Payment Method</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {cards.map(card => (
                          <div
                            key={card.id}
                            onClick={() => setSelectedCardId(card.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedCardId === card.id
                                ? 'border-indigo-650 bg-indigo-50/20 dark:bg-indigo-950/20'
                                : 'border-slate-150 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-indigo-500" />
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {card.cardType} {card.cardNumber}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                              Exp: {card.expiryDate}
                            </span>
                          </div>
                        ))}
                        <div
                          onClick={() => setSelectedCardId('')}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedCardId === ''
                              ? 'border-indigo-650 bg-indigo-50/20 dark:bg-indigo-950/20'
                              : 'border-slate-150 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            Use a New Card
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* New Card Details Form */}
                  {(!cards.length || selectedCardId === '') && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">New Card Details</p>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Cardholder Name</Label>
                        <Input 
                          required={selectedCardId === ''}
                          type="text"
                          placeholder="John Doe"
                          value={newCard.cardholderName}
                          onChange={(e) => setNewCard({...newCard, cardholderName: e.target.value})}
                          className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">Card Number</Label>
                          <Input 
                            required={selectedCardId === ''}
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
                            className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500 dark:text-slate-400">Expiry (MM/YY)</Label>
                            <Input 
                              required={selectedCardId === ''}
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
                              className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500 dark:text-slate-400">CVV</Label>
                            <Input 
                              required={selectedCardId === ''}
                              type="password"
                              placeholder="123"
                              maxLength={3}
                              value={newCard.cvv}
                              onChange={(e) => setNewCard({...newCard, cvv: e.target.value.replace(/[^0-9]/g, '')})}
                              className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          id="save_card"
                          type="checkbox"
                          checked={saveCardCheckbox}
                          onChange={(e) => setSaveCardCheckbox(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <label htmlFor="save_card" className="text-xs font-medium text-slate-650 dark:text-slate-400 cursor-pointer">
                          Save this card details for future payments
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-450 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Your transactions are secured with industry-grade encryption.</span>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg border-none"
                  >
                    Confirm Deposit
                  </Button>
                </form>
              )}

              {depositStep === 'processing' && (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-indigo-650 animate-spin" />
                  <p className="font-bold text-slate-800 dark:text-white">Connecting to secure network...</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Please do not refresh the page or close this modal.</p>
                </div>
              )}

              {depositStep === 'success' && (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">Deposit Successful!</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Rs. {Number(depositAmount).toLocaleString()} has been added to your secure wallet.
                    </p>
                  </div>
                  <Button 
                    onClick={resetDepositFlow}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-11 rounded-xl shadow-lg border-none"
                  >
                    Close
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Card Dialog */}
      <AnimatePresence>
        {isAddCardOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Add Payment Method
                </h3>
                <button 
                  onClick={() => setIsAddCardOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddCardSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Cardholder Name</Label>
                  <Input 
                    required
                    type="text"
                    placeholder="John Doe"
                    value={newCard.cardholderName}
                    onChange={(e) => setNewCard({...newCard, cardholderName: e.target.value})}
                    className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Card Number</Label>
                  <Input 
                    required
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
                    className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Expiry (MM/YY)</Label>
                    <Input 
                      required
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
                      className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">CVV</Label>
                    <Input 
                      required
                      type="password"
                      placeholder="123"
                      maxLength={3}
                      value={newCard.cvv}
                      onChange={(e) => setNewCard({...newCard, cvv: e.target.value.replace(/[^0-9]/g, '')})}
                      className="rounded-xl h-11 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-450 mt-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-550 flex-shrink-0" />
                  <span>Your card CVV is never saved. Card numbers are stored in a masked format.</span>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSavingCard}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg border-none"
                >
                  {isSavingCard ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Card"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
