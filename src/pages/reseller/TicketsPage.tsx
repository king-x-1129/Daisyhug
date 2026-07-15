import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, AlertCircle, FileText, Send } from 'lucide-react';

interface Ticket {
  id: string;
  category: string;
  orderId?: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: string;
  responseNotes?: string;
}

export function TicketsPage() {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState<string>('General Issue');
  const [orderId, setOrderId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tickets'), where('resellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      // Sort by date desc
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (category === 'Order Related Issue' && !orderId.trim()) {
      toast.error("Please provide the associated Order ID.");
      return;
    }

    setSubmitting(true);
    try {
      const ticketPayload = {
        resellerId: user.uid,
        resellerName: profile?.fullName || 'Reseller',
        category,
        orderId: category === 'Order Related Issue' ? orderId.trim() : null,
        title: title.trim(),
        description: description.trim(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'tickets'), ticketPayload);
      toast.success("Support ticket created successfully!");
      setTitle('');
      setDescription('');
      setOrderId('');
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white transition-colors duration-350">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-indigo-650 dark:text-indigo-400" />
          Support Tickets
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Submit complaints, report payment issues, or seek general guidance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Ticket Submission Form */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Create New Query</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-350">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <SelectItem value="General Issue">General Issue</SelectItem>
                      <SelectItem value="Order Related Issue">Order Related Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {category === 'Order Related Issue' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 dark:text-slate-350">Associated Order ID</Label>
                    <Input
                      required
                      value={orderId}
                      onChange={e => setOrderId(e.target.value)}
                      placeholder="e.g. ord-12345"
                      className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-805 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-350">Subject / Title</Label>
                  <Input
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Short description of the issue"
                    className="rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-805 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-350">Describe Your Problem</Label>
                  <Textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide as much details as possible..."
                    className="rounded-xl min-h-[140px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-805 text-slate-900 dark:text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl border-none shadow-md"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tickets History List */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Ticket History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30">
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Subject</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Category</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Order ID</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white">Created</TableHead>
                      <TableHead className="text-xs font-bold text-slate-900 dark:text-white text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                          You haven't submitted any support tickets yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tickets.map(t => (
                        <React.Fragment key={t.id}>
                          <TableRow className="border-b border-slate-100 dark:border-slate-800">
                            <TableCell className="font-bold text-xs max-w-[150px] truncate">{t.title}</TableCell>
                            <TableCell className="text-xs">{t.category}</TableCell>
                            <TableCell className="text-xs font-mono">{t.orderId || '-'}</TableCell>
                            <TableCell className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`${
                                t.status === 'Resolved' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' :
                                t.status === 'In Progress' ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              } border-none rounded-full px-2 py-0 text-[10px] font-bold`}>
                                {t.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {(t.description || t.responseNotes) && (
                            <TableRow className="bg-slate-50/20 dark:bg-slate-950/10">
                              <TableCell colSpan={5} className="p-4 text-xs">
                                <div className="space-y-2">
                                  <div>
                                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">Your Query:</span>
                                    <p className="text-slate-650 dark:text-slate-300 pl-2 border-l border-indigo-200 dark:border-indigo-900 mt-1 whitespace-pre-wrap">{t.description}</p>
                                  </div>
                                  {t.responseNotes && (
                                    <div className="pt-2">
                                      <span className="font-bold text-indigo-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Support Response:
                                      </span>
                                      <p className="text-indigo-950 dark:text-indigo-300 font-bold bg-indigo-50/30 dark:bg-indigo-950/15 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30 mt-1 whitespace-pre-wrap">{t.responseNotes}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
