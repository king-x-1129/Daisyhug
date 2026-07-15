import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageSquare, Eye, AlertCircle, FileText, CheckCircle } from 'lucide-react';

interface Ticket {
  id: string;
  resellerId: string;
  resellerName: string;
  category: string;
  orderId?: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: string;
  responseNotes?: string;
}

export function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Resolved'>('Pending');
  const [responseNotes, setResponseNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      // Sort by creation desc
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading tickets:", error);
      toast.error("Failed to load tickets");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setStatus(ticket.status);
    setResponseNotes(ticket.responseNotes || '');
    setIsDetailsOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status,
        responseNotes: responseNotes.trim() || null,
        updatedAt: new Date().toISOString()
      });
      toast.success("Ticket updated successfully!");
      setIsDetailsOpen(false);
      setSelectedTicket(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white transition-colors duration-350">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-indigo-650 dark:text-indigo-400" />
          Reseller Support Tickets
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage, investigate, and respond to reseller complaints and order queries</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold bg-white dark:bg-slate-900">Loading support tickets...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <TableRow>
                <TableHead className="font-bold text-slate-900 dark:text-white">Ticket ID</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Reseller</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Category</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Associated Order</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white">Submitted Date</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                    No support tickets submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <TableCell className="font-mono font-bold text-xs">{t.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{t.resellerName}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-550 dark:text-slate-400">{t.orderId || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${
                        t.status === 'Resolved' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' :
                        t.status === 'In Progress' ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      } border-none rounded-full px-2 py-0.5 text-[10px] font-bold`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenDetails(t)}
                        className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Ticket Details & Action Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Ticket Review & Action
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Review reseller complaint and update ticket resolution status
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6 mt-4">
              {/* Ticket details summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                  <span className="text-slate-450">Reseller:</span>
                  <span className="font-bold">{selectedTicket.resellerName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                  <span className="text-slate-450">Category:</span>
                  <span className="font-bold">{selectedTicket.category}</span>
                </div>
                {selectedTicket.orderId && (
                  <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                    <span className="text-slate-450">Order ID:</span>
                    <span className="font-mono font-bold">{selectedTicket.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                  <span className="text-slate-450">Submitted:</span>
                  <span className="font-bold">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] block">Query Description:</span>
                  <p className="font-bold text-slate-850 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Status Update Dropdown */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-500">Ticket Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="w-full rounded-xl h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Response Note Textarea */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-500">Support Response / Notes</Label>
                <Textarea
                  value={responseNotes}
                  onChange={e => setResponseNotes(e.target.value)}
                  placeholder="Provide resolution details or requests for information..."
                  className="rounded-xl min-h-[100px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="rounded-xl h-11 font-bold flex-grow border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateTicket} 
                  disabled={updating}
                  className="rounded-xl h-11 font-bold flex-grow bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                >
                  {updating ? 'Updating...' : 'Save Resolution'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
