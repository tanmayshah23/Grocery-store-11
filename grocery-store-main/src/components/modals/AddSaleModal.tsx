import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { db } from '@/db/db';
import type { SaleItem } from '@/db/db';
import { notify } from '@/utils/notify';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

// Comprehensive grocery units
const UNITS = ['kg', 'gm', 'litre', 'ml', 'pcs'];

const PAYMENT_MODES = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'online', label: '🌐 Online' },
  { value: 'mixed', label: '🔀 Mixed' },
];

const newItem = (): SaleItem => ({
  id: crypto.randomUUID(),
  name: '',
  brand: '',
  category: '',
  unit: 'pcs',
  quantity: 1,
  price: 0,
  total: 0,
});

function getBillNumber(): string {
  const last = localStorage.getItem('gs_last_bill') || '0';
  const next = parseInt(last) + 1;
  localStorage.setItem('gs_last_bill', String(next));
  return `BILL-${String(next).padStart(4, '0')}`;
}

export function AddSaleModal({ isOpen, onClose, onSuccess }: AddSaleModalProps) {
  const [items, setItems] = useState<SaleItem[]>([newItem()]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'online' | 'mixed'>('cash');
  const [isLoading, setIsLoading] = useState(false);

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      const qtyMultiplier = (updated.unit === 'gm' || updated.unit === 'ml') ? 0.001 : 1;
      updated.total = (updated.quantity * qtyMultiplier) * updated.price;
      return updated;
    }));
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.name || i.price <= 0)) {
      notify('Please fill all item names and prices.', 'info');
      return;
    }
    setIsLoading(true);
    const billNumber = getBillNumber();
    await db.sales.add({
      bill_number: billNumber,
      items,
      total_amount: total,
      payment_mode: paymentMode,
      customer_name: customerName.trim() || undefined,
      sync_status: 'pending',
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: 'Store',
      updated_by: 'Store',
    });
    onSuccess(`Bill ${billNumber} saved. ₹${total.toLocaleString()} recorded.`);
    setItems([newItem()]);
    setCustomerName('');
    setPaymentMode('cash');
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    setItems([newItem()]);
    setCustomerName('');
    setPaymentMode('cash');
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
                <ShoppingBag size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">New Sale Bill</h3>
                <p className="text-xs text-muted-foreground">Create a new sales transaction</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Customer Name (Optional)</label>
                <input
                  type="text" value={customerName} onChange={e => setCustomerName(e.target.value.replace(/\d/g, ''))}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-muted/50 border border-border focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 px-4 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Payment Mode <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_MODES.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setPaymentMode(m.value as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${paymentMode === m.value ? 'bg-emerald-600 text-white' : 'bg-muted/50 hover:bg-muted'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Items <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] text-emerald-500 font-medium bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10 hidden sm:block">
                    💡 Tip: For gm/ml, enter price per kg/litre (e.g. 500gm at ₹40/kg = ₹20)
                  </p>
                  <button type="button" onClick={() => setItems(p => [...p, newItem()])}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>

              {/* Header */}
              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground px-1">
                <span className="col-span-3">Name *</span>
                <span className="col-span-2">Brand</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Price ₹</span>
                <span className="col-span-1">Total</span>
                <span className="col-span-1"></span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                    <input type="text" placeholder="e.g. Sugar" value={item.name} required
                      onChange={e => updateItem(item.id, 'name', e.target.value.replace(/\d/g, ''))}
                      className="col-span-3 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <input type="text" placeholder="Brand" value={item.brand}
                      onChange={e => updateItem(item.id, 'brand', e.target.value.replace(/\d/g, ''))}
                      className="col-span-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="col-span-2 bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 rounded-lg py-2 px-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 transition-all cursor-pointer">
                      {UNITS.map(u => <option key={u} value={u} className="bg-card text-foreground">{u.toUpperCase()}</option>)}
                    </select>
                    <input type="number" min={0.001} step="any" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-1 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <input type="number" min={0} step="0.01" placeholder="₹" value={item.price || ''}
                      onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="col-span-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-lg py-2 px-2 text-sm outline-none transition-all focus:bg-card" />
                    <span className="col-span-1 text-xs font-bold text-green-500 text-center">₹{item.total.toFixed(0)}</span>
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

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
              <span className="font-bold">Total Amount</span>
              <span className="text-2xl font-black text-green-500">₹{total.toLocaleString()}</span>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
              {isLoading ? 'Saving...' : 'Save Bill — Stored locally.'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
