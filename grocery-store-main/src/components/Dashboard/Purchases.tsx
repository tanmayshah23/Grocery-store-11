import React, { useState } from 'react';
import {
  Search, Plus, Truck, Layers, Download, Package,
  ChevronDown, ChevronRight, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { AddPurchaseModal } from '../modals/AddPurchaseModal';
import { PaymentBadge } from '../shared/StatusBadge';
import { QuantumLoader } from '../shared/QuantumLoader';
import { EmptyState } from '../shared/EmptyState';
import { DateRangePicker, getDefaultRange, type DateRange } from '../shared/DateRangePicker';
import { notify } from '@/utils/notify';
import { exportPurchasesPdf } from '@/utils/exportPdf';
import { FileDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, LabelList
} from 'recharts';

export function PurchasesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(getDefaultRange('30d'));
  const [viewMode, setViewMode] = useState<'invoices' | 'suppliers'>('invoices');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState('');

  const purchases = useSQLiteQuery(
    async () => {
      const records = await db.purchases.getInRange(range.from, range.to);

      const filtered = records.filter(p => {
        const matchSearch = !searchTerm ||
          p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchSup = !supplierFilter || p.supplier_name === supplierFilter;
        return matchSearch && matchSup;
      });

      return filtered.sort((a, b) => b.created_at - a.created_at);
    },
    [searchTerm, range.from, range.to, supplierFilter]
  );

  const isLoading = purchases === undefined;
  const allPurchases = purchases || [];
  const totalCost = allPurchases.reduce((s, p) => s + (p.grand_total || p.total_amount), 0);
  const uniqueSuppliers = [...new Set(allPurchases.map(p => p.supplier_name))];
  const extraCostsTotal = allPurchases.reduce((s, p) => {
    if (!p.extra_costs) return s;
    return s + (p.extra_costs.transport || 0) + (p.extra_costs.loading || 0) + (p.extra_costs.misc || 0);
  }, 0);

  // By-supplier grouping
  const supplierGroups: Record<string, { name: string; total: number; count: number }> = {};
  allPurchases.forEach(p => {
    if (!supplierGroups[p.supplier_name]) supplierGroups[p.supplier_name] = { name: p.supplier_name, total: 0, count: 0 };
    supplierGroups[p.supplier_name].total += p.grand_total || p.total_amount;
    supplierGroups[p.supplier_name].count += 1;
  });
  const supplierChartData = Object.values(supplierGroups).sort((a, b) => b.total - a.total).slice(0, 8);

  const handleExport = () => {
    const rows = [
      ['Invoice', 'Supplier', 'Items', 'Total', 'Grand Total', 'Payment', 'Date'],
      ...allPurchases.map(p => [
        p.invoice_number, p.supplier_name, p.items.length,
        p.total_amount, p.grand_total || p.total_amount, p.payment_mode,
        format(p.created_at, 'dd/MM/yyyy')
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'purchases.csv'; a.click();
    URL.revokeObjectURL(url);
    notify('Purchases exported to CSV.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Purchases & Suppliers</h2>
          <p className="text-muted-foreground mt-1">Manage supplier orders and procurement history</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
            {(['invoices', 'suppliers'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${viewMode === m ? 'bg-card shadow-sm text-blue-500' : 'text-muted-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Purchase</span><span className="sm:hidden">+</span>
          </button>
          <button
            onClick={async () => await exportPurchasesPdf(allPurchases, `${format(range.from, 'dd MMM')} – ${format(range.to, 'dd MMM yyyy')}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all"
            title="Export as PDF"
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
          className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-blue-500 transition-all active:rotate-180 duration-500 border border-border"
          title="Refresh Data"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><Truck size={22} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Suppliers</p>
            <p className="text-2xl font-bold">{uniqueSuppliers.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0"><Layers size={22} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Cost</p>
            <p className="text-2xl font-bold">₹{totalCost.toLocaleString()}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"><Package size={22} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Extra Costs</p>
            <p className="text-2xl font-bold">₹{extraCostsTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {viewMode === 'suppliers' && (
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Spend by Supplier</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#88888818" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} tickFormatter={v => `₹${v}`}>
                  <Label value="Total Spending" offset={-5} position="insideBottom" style={{ fill: '#888', fontSize: 10, fontWeight: 600 }} />
                </XAxis>
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} width={90}>
                  <Label value="Suppliers" angle={-90} position="insideLeft" offset={-10} style={{ fill: '#888', fontSize: 11, fontWeight: 600, textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg,#1a1a1a)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Spend']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="total" position="right" formatter={(v: any) => `₹${Number(v).toLocaleString()}`} stroke="none" style={{ fontSize: 10, fontWeight: 700, fill: '#888' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search supplier, invoice..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-muted/30 border border-transparent focus:border-blue-500 focus:bg-card rounded-xl py-2.5 pl-10 pr-4 transition-all outline-none"
            />
          </div>
          {uniqueSuppliers.length > 0 && (
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Suppliers</option>
              {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-bold transition-all"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Extra</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border relative">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex justify-center items-center h-48">
                      <QuantumLoader />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && allPurchases.map(pur => (
                <React.Fragment key={pur.id}>
                  <tr className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => setExpandedId(expandedId === pur.id ? null : pur.id!)}>
                    <td className="pl-4 py-4">
                      {expandedId === pur.id
                        ? <ChevronDown size={16} className="text-muted-foreground" />
                        : <ChevronRight size={16} className="text-muted-foreground" />}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-500">{pur.invoice_number}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-black">{pur.supplier_name[0]}</div>
                        {pur.supplier_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{pur.items.length} products</td>
                    <td className="px-6 py-4 font-bold">₹{pur.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-amber-500 font-bold">
                      {pur.extra_costs && (pur.extra_costs.transport || pur.extra_costs.loading || pur.extra_costs.misc)
                        ? `+₹${((pur.extra_costs.transport || 0) + (pur.extra_costs.loading || 0) + (pur.extra_costs.misc || 0)).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4"><PaymentBadge mode={pur.payment_mode as any} /></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{format(pur.created_at, 'MMM d, yyyy • HH:mm:ss')}</td>
                  </tr>
                  {expandedId === pur.id && (
                    <tr key={`${pur.id}-exp`} className="bg-muted/10">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                          {pur.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2 text-xs">
                              <span className="font-bold">{item.name}</span>
                              <span className="text-muted-foreground">{item.quantity}{item.unit ? ` ${item.unit}` : ''} × ₹{item.purchase_price} = <strong className="text-foreground">₹{item.total}</strong></span>
                            </div>
                          ))}
                        </div>
                        {pur.extra_costs && (
                          <div className="flex gap-3 flex-wrap mt-2 text-xs">
                            {pur.extra_costs.transport ? <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold">🚛 Transport: ₹{pur.extra_costs.transport}</span> : null}
                            {pur.extra_costs.loading ? <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold">📦 Loading: ₹{pur.extra_costs.loading}</span> : null}
                            {pur.extra_costs.misc ? <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold">🔖 Misc: ₹{pur.extra_costs.misc}</span> : null}
                          </div>
                        )}
                        {pur.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {pur.notes}</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!isLoading && !allPurchases.length && (
                <tr><td colSpan={8}><EmptyState icon={Truck} title="No purchases found" subtitle="Record a purchase to see supplier and procurement history." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPurchaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={m => notify(m, 'success')} />
    </div>
  );
}
