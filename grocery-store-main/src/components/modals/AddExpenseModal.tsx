import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt } from 'lucide-react';
import { db, type ExpenseCategory } from '@/db/db';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: 'rent', label: 'Rent', emoji: '🏠' },
  { key: 'electricity', label: 'Electricity', emoji: '💡' },
  { key: 'water', label: 'Water', emoji: '💧' },
  { key: 'internet', label: 'Internet', emoji: '🌐' },
  { key: 'transport', label: 'Transport', emoji: '🚛' },
  { key: 'staff', label: 'Staff', emoji: '👥' },
  { key: 'misc', label: 'Misc', emoji: '📦' },
];

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsLoading(true);

    await db.expenses.add({
      category,
      amount: parseFloat(amount),
      notes: notes.trim(),
      sync_status: 'pending',
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: 'Store',
      updated_by: 'Store',
    });

    const cat = CATEGORIES.find(c => c.key === category);
    onSuccess(`${cat?.emoji} ${cat?.label} expense of ₹${parseFloat(amount).toLocaleString()} recorded. Saved safely.`);
    setAmount(''); setNotes(''); setCategory('misc');
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    setAmount(''); setNotes(''); setCategory('misc');
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
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Record Expense</h3>
                <p className="text-xs text-muted-foreground">Log an operational cost</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Category <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.key} type="button"
                    onClick={() => setCategory(c.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${category === c.key ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                    <span className="text-lg">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Amount (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                <input type="number" min={1} step="0.01" required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-muted/50 border border-border focus:border-red-500 focus:bg-card rounded-xl py-3 pl-8 pr-4 transition-all outline-none font-bold text-xl"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Monthly rent for February, Shop electricity bill..."
                rows={2}
                className="w-full bg-muted/50 border border-border focus:border-red-500 focus:bg-card rounded-xl py-2.5 px-4 text-sm outline-none transition-all resize-none" />
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]">
              {isLoading ? 'Saving...' : 'Save Expense — Data stored safely.'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
