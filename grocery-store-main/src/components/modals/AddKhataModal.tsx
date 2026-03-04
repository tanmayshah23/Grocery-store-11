import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, IndianRupee } from 'lucide-react';
import { db } from '@/db/db';
import { notify } from '@/utils/notify';

interface AddKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function AddKhataModal({ isOpen, onClose, onSuccess }: AddKhataModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !creditAmount) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (phoneNumber && phoneNumber.trim().length !== 10) {
      notify('Please enter a valid 10-digit phone number.', 'info');
      return;
    }

    // Check if already exists
    const allActive = await db.khata.getAllActive();
    const existing = allActive.find((k: any) => k.customer_name.toLowerCase() === customerName.trim().toLowerCase());

    if (existing) {
      notify(`${customerName} already has a khata account. Please update instead.`, 'info');
      return;
    }

    setIsLoading(true);

    await db.khata.add({
      customer_name: customerName.trim(),
      phone_number: phoneNumber.trim(),
      total_credit: amount,
      pending_amount: amount,
      paid_amount: 0,
      payment_history: [],
      notes: notes.trim() || undefined,
      sync_status: 'pending',
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: 'Store',
      updated_by: 'Store',
    });

    const msg = `Khata account created for ${customerName}. ₹${amount.toLocaleString()} credit added. Saved safely.`;
    onSuccess(msg);
    notify(msg, 'success');
    setCustomerName(''); setPhoneNumber(''); setCreditAmount(''); setNotes('');
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    setCustomerName(''); setPhoneNumber(''); setCreditAmount(''); setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">New Khata Account</h3>
                <p className="text-xs text-muted-foreground">Add a customer credit record</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Customer Name <span className="text-red-500">*</span></label>
              <input type="text" required value={customerName}
                onChange={e => setCustomerName(e.target.value.replace(/\d/g, ''))}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-muted/50 border border-border focus:border-blue-500 focus:bg-card rounded-xl py-2.5 px-4 outline-none transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Phone Number <span className="text-red-500">*</span></label>
              <input type="tel" value={phoneNumber} required
                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9876543210"
                maxLength={10}
                className="w-full bg-muted/50 border border-border focus:border-blue-500 focus:bg-card rounded-xl py-2.5 px-4 outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Credit Amount (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="number" required min={1} step="0.01" value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full bg-muted/50 border border-border focus:border-blue-500 focus:bg-card rounded-xl py-2.5 pl-8 pr-4 outline-none transition-all font-bold" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Month ends payment, pending for milk items..."
                rows={2}
                className="w-full bg-muted/50 border border-border focus:border-blue-500 focus:bg-card rounded-xl py-2.5 px-4 text-sm outline-none transition-all resize-none" />
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-muted-foreground">
              ⚠️ This will create a pending amount of <strong className="text-amber-500">₹{creditAmount ? parseFloat(creditAmount).toLocaleString() : '0'}</strong> for {customerName || 'this customer'}.
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
              {isLoading ? 'Creating...' : 'Create Khata Account — Saved safely.'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
