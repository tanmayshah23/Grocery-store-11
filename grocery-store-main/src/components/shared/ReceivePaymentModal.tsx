import type { Khata, KhataPayment } from '@/db/db';
import { db } from '@/db/db';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, IndianRupee, CheckCircle2 } from 'lucide-react';
import { notify } from '@/utils/notify';

interface ReceivePaymentModalProps {
    isOpen: boolean;
    khata: Khata | null;
    onClose: () => void;
}

export function ReceivePaymentModal({ isOpen, khata, onClose }: ReceivePaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!khata || !amount) return;
        const amtNum = parseFloat(amount);
        if (isNaN(amtNum) || amtNum <= 0 || amtNum > khata.pending_amount) return;

        setIsLoading(true);

        const payment: KhataPayment = {
            id: crypto.randomUUID(),
            amount: amtNum,
            paid_at: Date.now(),
            note: note.trim() || undefined,
        };

        const newPending = khata.pending_amount - amtNum;
        const newPaid = khata.paid_amount + amtNum;

        await db.khata.update(khata.id!, {
            pending_amount: newPending,
            paid_amount: newPaid,
            payment_history: [...(khata.payment_history || []), payment],
            updated_at: Date.now(),
            sync_status: 'pending',
        });

        notify(
            `✅ Payment received from ${khata.customer_name}. ₹${amtNum.toLocaleString()} recorded.${newPending === 0 ? ' Khata cleared! 🎉' : ` Still pending: ₹${newPending.toLocaleString()}`}`,
            'success'
        );
        setAmount('');
        setNote('');
        setIsLoading(false);
        onClose();
    };

    const handleClose = () => {
        setAmount(''); setNote(''); onClose();
    };

    if (!isOpen || !khata) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.35 }}
                    className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Receive Payment</h3>
                                <p className="text-xs text-muted-foreground">{khata.customer_name}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
                            <span className="text-sm font-bold text-muted-foreground">Pending Amount</span>
                            <div className="flex items-center font-black text-xl text-red-500">
                                <IndianRupee size={16} />{khata.pending_amount.toLocaleString()}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold">Amount Received (₹) *</label>
                            <div className="relative">
                                <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    max={khata.pending_amount}
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder={`Max ₹${khata.pending_amount.toLocaleString()}`}
                                    className="w-full bg-muted/50 border border-border focus:border-green-500 focus:bg-card rounded-xl py-3 pl-8 pr-4 outline-none transition-all font-bold text-xl"
                                    autoFocus
                                />
                            </div>
                            {amount && parseFloat(amount) > khata.pending_amount && (
                                <p className="text-xs text-red-500 font-bold">Amount cannot exceed ₹{khata.pending_amount.toLocaleString()}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold">Payment Note (Optional)</label>
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Cash collected at shop"
                                className="w-full bg-muted/50 border border-border focus:border-green-500 focus:bg-card rounded-xl py-2.5 px-4 outline-none transition-all text-sm"
                            />
                        </div>

                        {amount && !isNaN(parseFloat(amount)) && (
                            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-xs">
                                Remaining after this payment:{' '}
                                <strong className={khata.pending_amount - parseFloat(amount) === 0 ? 'text-green-500' : 'text-amber-500'}>
                                    ₹{Math.max(0, khata.pending_amount - parseFloat(amount)).toLocaleString()}
                                </strong>
                                {khata.pending_amount - parseFloat(amount) === 0 && ' — Khata will be cleared! 🎉'}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !amount || parseFloat(amount) > khata.pending_amount}
                            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? 'Recording...' : 'Confirm Payment Received'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
