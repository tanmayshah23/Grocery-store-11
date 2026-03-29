import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { db } from '@/db/db';
import type { PurchaseItem, PurchaseExtraCosts } from '@/db/db';

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

// Comprehensive grocery units
const UNITS = ['kg', 'gm', 'litre', 'ml', 'pcs'];

const newItem = (): PurchaseItem => ({
  id: crypto.randomUUID(),
  name: '',
  brand: '',
  category: '',
  unit: 'kg',
  quantity: 1,
  purchase_price: 0,
  total: 0,
});

const PAYMENT_MODES = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'online', label: '🌐 Online' },
  { value: 'credit', label: '📒 Credit' },
];

export function AddPurchaseModal({ isOpen, onClose, onSuccess }: AddPurchaseModalProps) {
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([newItem()]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'online' | 'credit'>('cash');
  const [extraCosts, setExtraCosts] = useState<PurchaseExtraCosts>({ transport: 0, loading: 0, misc: 0 });
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      const qtyMultiplier = (updated.unit === 'gm' || updated.unit === 'ml') ? 0.001 : 1;
      updated.total = (updated.quantity * qtyMultiplier) * updated.purchase_price;
      return updated;
    }));
  };

  const itemsTotal = items.reduce((s, i) => s + i.total, 0);
  const extraTotal = (extraCosts.transport || 0) + (extraCosts.loading || 0) + (extraCosts.misc || 0);
  const grandTotal = itemsTotal + extraTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName) return;
    setIsLoading(true);

    await db.purchases.add({
      supplier_name: supplierName.trim(),
      invoice_number: invoiceNumber.trim() || `INV-${Date.now()}`,
      items,
      total_amount: itemsTotal,
      extra_costs: extraTotal > 0 ? extraCosts : undefined,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      notes: notes.trim() || undefined,
      sync_status: 'pending',
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: 'Store',
      updated_by: 'Store',
    });

    onSuccess(`Purchase from ${supplierName} saved. ₹${grandTotal.toLocaleString()} recorded.`);
    setSupplierName(''); setInvoiceNumber(''); setItems([newItem()]);
    setPaymentMode('cash'); setNotes(''); setExtraCosts({ transport: 0, loading: 0, misc: 0 });
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    setSupplierName(''); setInvoiceNumber(''); setItems([newItem()]);
    setPaymentMode('cash'); setNotes(''); setExtraCosts({ transport: 0, loading: 0, misc: 0 });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Package size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Add Purchase</h3>
                <p className="text-xs text-muted-foreground">Record a supplier order</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Supplier / Client Name <span className="text-red-500">*</span></label>
                <input type="text" required value={supplierName}
                  onChange={e => setSupplierName(e.target.value.replace(/\d/g, ''))}
                  placeholder="e.g. Shree Distributor"
                  className="w-full bg-muted/50 border border-border focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 px-4 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Invoice / Bill No.</label>
                <input type="text" value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2024-001"
                  className="w-full bg-muted/50 border border-border focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 px-4 transition-all outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Payment Mode <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_MODES.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setPaymentMode(m.value as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${paymentMode === m.value ? 'bg-emerald-600 text-white' : 'bg-muted/50 hover:bg-muted'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Items Purchased <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] text-green-600 font-medium bg-green-500/5 px-2 py-1 rounded-md border border-green-500/10 hidden sm:block">
                    💡 Tip: For gm/ml, enter the buy price per kg/litre.
                  </p>
                  <button type="button" onClick={() => setItems(p => [...p, newItem()])}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground px-1">
                <span className="col-span-3">Item Name *</span>
                <span className="col-span-2">Brand</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Buy Price ₹</span>
                <span className="col-span-1">Total</span>
                <span className="col-span-1"></span>
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                    <input type="text" required placeholder="e.g. Rice" value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value.replace(/\d/g, ''))}
                      className="col-span-3 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <input type="text" placeholder="Brand" value={item.brand}
                      onChange={e => updateItem(item.id, 'brand', e.target.value.replace(/\d/g, ''))}
                      className="col-span-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="col-span-2 bg-green-500/5 border border-green-200 dark:border-green-500/30 rounded-lg py-2 px-1 text-xs font-bold text-green-600 dark:text-green-400 outline-none focus:border-green-500 transition-all cursor-pointer">
                      {UNITS.map(u => <option key={u} value={u} className="bg-card text-foreground">{u.toUpperCase()}</option>)}
                    </select>
                    <input type="number" min={0.001} step="any" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-1 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <input type="number" min={0} step="0.01" placeholder="₹" value={item.purchase_price || ''}
                      onChange={e => updateItem(item.id, 'purchase_price', parseFloat(e.target.value) || 0)}
                      className="col-span-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <span className="col-span-1 text-xs font-bold text-emerald-500 text-center">₹{item.total.toFixed(0)}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                        className="col-span-1 p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extra Costs */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5">
                <p className="text-sm font-bold text-muted-foreground">Extra Costs (Optional)</p>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {(['transport', 'loading', 'misc'] as const).map(field => (
                  <div key={field}>
                    <label className="text-xs font-bold text-muted-foreground capitalize block mb-1">{field} ₹</label>
                    <input type="number" min={0} step="0.01"
                      value={extraCosts[field] || ''}
                      onChange={e => setExtraCosts(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g. 50"
                      className="w-full bg-muted/50 border border-border focus:border-amber-500 focus:bg-card rounded-lg py-2 px-3 text-sm outline-none transition-all" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Details of batch, expiry, quality, etc."
                rows={2}
                className="w-full bg-muted/50 border border-border focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 px-4 text-sm outline-none transition-all resize-none" />
            </div>

            {/* Grand Total */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items Total</span>
                <span className="font-bold">₹{itemsTotal.toLocaleString()}</span>
              </div>
              {extraTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Extra Costs</span>
                  <span className="font-bold text-amber-500">+₹{extraTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-bold">Grand Total</span>
                <span className="text-xl font-black text-emerald-500">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
              {isLoading ? 'Saving...' : 'Save Purchase — Stored locally.'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
