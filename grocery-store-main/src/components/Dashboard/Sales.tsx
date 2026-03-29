import React, { useState } from 'react';
import {
  Search, Plus, MoreVertical, IndianRupee,
  ShoppingBag, ChevronDown, Trash2, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { AddSaleModal } from '../modals/AddSaleModal';
import { ConfirmModal } from '../shared/ConfirmModal';
import { QuantumLoader } from '../shared/QuantumLoader';
import { PaymentBadge } from '../shared/StatusBadge';
import { EmptyState } from '../shared/EmptyState';
import { DateRangePicker, getDefaultRange, type DateRange } from '../shared/DateRangePicker';
import { notify } from '@/utils/notify';
import { exportSalesPdf, exportBillPdf } from '@/utils/exportPdf';
import { FileDown, Printer, RotateCcw } from 'lucide-react';

export function SalesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'bills' | 'items'>('bills');
  const [range, setRange] = useState<DateRange>(getDefaultRange('30d'));
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'items'>('date');
  const [expandedBill, setExpandedBill] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const sales = useSQLiteQuery(
    async () => {
      const records = await db.sales.getInRange(range.from, range.to);

      const filtered = searchTerm
        ? records.filter(s =>
          s.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : records;

      return filtered.sort((a, b) => {
        if (sortBy === 'amount') return b.total_amount - a.total_amount;
        if (sortBy === 'items') return b.items.length - a.items.length;
        return b.created_at - a.created_at;
      });
    },
    [searchTerm, range.from, range.to, sortBy]
  );

  const isLoading = sales === undefined;

  const soldItems = (sales || []).flatMap(s =>
    s.items.map(item => ({
      ...item,
      bill_number: s.bill_number,
      customer_name: s.customer_name,
      payment_mode: s.payment_mode,
      created_at: s.created_at
    }))
  );

  const totalSales = (sales || []).reduce((s, x) => s + x.total_amount, 0);

  const handleDelete = async (id: number) => {
    await db.sales.update(id, { is_active: 0, updated_at: Date.now(), sync_status: 'pending' });
    notify('Bill removed. Data safely archived.', 'info');
    setOpenMenuId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Sales Records</h2>
          <p className="text-muted-foreground mt-1">Detailed tracking of all sales transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
            {(['bills', 'items'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${viewMode === m ? 'bg-card shadow-sm text-emerald-500' : 'text-muted-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Bill</span><span className="sm:hidden">+</span>
          </button>
          <button
            onClick={async () => await exportSalesPdf(sales || [], `Last 30 days — ${(sales || []).length} bills`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all"
            title="Export PDF"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <button
          onClick={() => {
            const r = range;
            setRange({ ...r }); // Re-trigger useLiveQuery
            notify('Data updated', 'success');
          }}
          className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-emerald-500 transition-all active:rotate-180 duration-500 border border-border"
          title="Refresh Data"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 px-4 py-3 bg-muted/30 rounded-xl border border-border text-sm">
        <span className="text-muted-foreground">Showing <strong className="text-foreground">{sales?.length || 0}</strong> bills</span>
        <span className="text-muted-foreground">Total: <strong className="text-green-500">₹{totalSales.toLocaleString()}</strong></span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {(['date', 'amount', 'items'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all capitalize ${sortBy === s ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder={viewMode === 'bills' ? 'Search by bill no, customer or item...' : 'Search by item name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-muted/30 border border-transparent focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 pl-10 pr-4 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'bills' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Bill No</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border relative">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex justify-center items-center h-32">
                        <QuantumLoader />
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && sales?.map(sale => (
                  <React.Fragment key={sale.id}>
                    <tr className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-500">{sale.bill_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                            {sale.customer_name?.[0] || 'W'}
                          </div>
                          <span className="font-semibold">{sale.customer_name || 'Walking Customer'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{sale.items.length}</span>
                          <button
                            onClick={() => setExpandedBill(expandedBill === sale.id ? null : sale.id!)}
                            className="p-1 hover:bg-muted rounded-md transition-colors"
                          >
                            <ChevronDown size={14} className={`transition-transform text-muted-foreground ${expandedBill === sale.id ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-bold">
                          <IndianRupee size={14} />
                          {sale.total_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <PaymentBadge mode={sale.payment_mode} />
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(sale.created_at, 'MMM d, yyyy • h:mm:ss a')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === sale.id ? null : sale.id!)}
                            className="p-2 hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === sale.id && (
                            <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-xl py-1 w-40">
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-sm transition-colors"
                                onClick={() => { setExpandedBill(sale.id!); setOpenMenuId(null); }}
                              >
                                <Eye size={14} /> View Items
                              </button>
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-sm transition-colors"
                                onClick={async () => { await exportBillPdf(sale); setOpenMenuId(null); }}
                              >
                                <Printer size={14} /> Print PDF Bill
                              </button>
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-500 text-sm transition-colors"
                                onClick={() => { setConfirmDelete(sale.id!); setOpenMenuId(null); }}
                              >
                                <Trash2 size={14} /> Delete Bill
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedBill === sale.id && (
                      <tr key={`${sale.id}-expanded`} className="bg-muted/10">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {isLoading
                              ? (
                                <div className="col-span-full h-24 flex items-center justify-center">
                                  <QuantumLoader />
                                </div>
                              )
                              : sale.items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                                  <ShoppingBag size={14} className="text-muted-foreground shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold truncate">{item.name}</p>
                                    {item.brand && <p className="text-[10px] text-muted-foreground">{item.brand}</p>}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs font-bold">₹{item.total.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.quantity}{item.unit ? ` ${item.unit}` : ''} × ₹{item.price}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {!isLoading && !sales?.length && (
                  <tr><td colSpan={7}><EmptyState icon={ShoppingBag} title="No sales found" subtitle="No transactions match your filters. Try a different date range." /></td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Qty</th>
                  <th className="px-6 py-4">Unit Price</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex justify-center items-center h-32">
                        <QuantumLoader />
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && soldItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold">{item.name}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{item.brand || '—'}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground capitalize">{item.category || '—'}</td>
                    <td className="px-6 py-4 font-bold">{item.quantity} {item.unit || ''}</td>
                    <td className="px-6 py-4">₹{item.price.toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-green-500">₹{item.total.toLocaleString()}</td>
                    <td className="px-6 py-4"><PaymentBadge mode={item.payment_mode} /></td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{format(item.created_at, 'MMM d, HH:mm:ss')}</td>
                  </tr>
                ))}
                {!isLoading && soldItems.length === 0 && (
                  <tr><td colSpan={8}><EmptyState icon={ShoppingBag} title="No items found" subtitle="No sold items match your current filters." /></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">
            {viewMode === 'bills' ? `${sales?.length || 0} bills` : `${soldItems.length} items`} in selected range
          </p>
        </div>
      </div>

      <AddSaleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={m => notify(m, 'success')} />
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { handleDelete(confirmDelete!); setConfirmDelete(null); }}
        title="Delete Bill?"
        message="This bill will be archived and hidden. You can recover it anytime from admin settings."
        confirmLabel="Yes, Delete"
        isDanger
      />
    </div>
  );
}
