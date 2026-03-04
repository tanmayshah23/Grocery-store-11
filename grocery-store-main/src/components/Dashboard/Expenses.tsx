import { useState } from 'react';
import {
  Search, Plus, Receipt, IndianRupee,
  Lightbulb, Home, Truck, Briefcase, Wifi, Users, Droplets
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label, LabelList
} from 'recharts';
import { db, type ExpenseCategory } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { format } from 'date-fns';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { QuantumLoader } from '../shared/QuantumLoader';
import { EmptyState } from '../shared/EmptyState';
import { DateRangePicker, getDefaultRange, type DateRange } from '../shared/DateRangePicker';
import { notify } from '@/utils/notify';
import { exportExpensesPdf } from '@/utils/exportPdf';
import { FileDown, Download } from 'lucide-react';
import { cn } from '@/utils/cn';

const CATEGORIES: { key: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { key: 'rent', label: 'Rent', icon: Home, color: '#3b82f6' },
  { key: 'electricity', label: 'Electricity', icon: Lightbulb, color: '#eab308' },
  { key: 'water', label: 'Water', icon: Droplets, color: '#06b6d4' },
  { key: 'internet', label: 'Internet', icon: Wifi, color: '#8b5cf6' },
  { key: 'transport', label: 'Transport', icon: Truck, color: '#f97316' },
  { key: 'staff', label: 'Staff', icon: Users, color: '#10b981' },
  { key: 'misc', label: 'Misc', icon: Briefcase, color: '#ec4899' },
];

export function ExpensesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(getDefaultRange('30d'));
  const [catFilter, setCatFilter] = useState<ExpenseCategory | ''>('');

  const expenses = useSQLiteQuery(
    async () => {
      const records = await db.expenses.getInRange(range.from, range.to);

      return records.filter(e => {
        const matchSearch = !searchTerm ||
          e.category.includes(searchTerm.toLowerCase()) ||
          (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = !catFilter || e.category === catFilter;
        return matchSearch && matchCat;
      }).sort((a, b) => b.created_at - a.created_at);
    },
    [searchTerm, range.from, range.to, catFilter]
  );

  const isLoading = expenses === undefined;
  const allExpenses = expenses || [];
  const total = allExpenses.reduce((s, e) => s + e.amount, 0);

  const catTotals = CATEGORIES.map(c => ({
    ...c,
    value: allExpenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0),
  }));

  const getIcon = (cat: ExpenseCategory) => {
    const found = CATEGORIES.find(c => c.key === cat);
    const Icon = found?.icon || Briefcase;
    return <Icon size={16} />;
  };

  const getColor = (cat: ExpenseCategory) => CATEGORIES.find(c => c.key === cat)?.color || '#888';

  const handleExport = () => {
    const rows = [
      ['Category', 'Amount', 'Date', 'Notes'],
      ...allExpenses.map(e => [e.category, e.amount, format(e.created_at, 'dd/MM/yyyy'), e.notes || ''])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
    notify('Expenses exported to CSV.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Store Expenses</h2>
          <p className="text-muted-foreground mt-1">Track all operational costs and bills</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => await exportExpensesPdf(allExpenses, `${format(range.from, 'dd MMM')} – ${format(range.to, 'dd MMM yyyy')}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all"
            title="Export as PDF"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Record Expense</span><span className="sm:hidden">+ Expense</span>
          </button>
        </div>
      </div>

      <DateRangePicker value={range} onChange={setRange} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? (
            <div className="col-span-full h-24 flex items-center justify-center">
              <QuantumLoader />
            </div>
          )
          : [
            { label: 'Total Spent', value: `₹${total.toLocaleString()}`, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Rent', value: `₹${(catTotals.find(c => c.key === 'rent')?.value || 0).toLocaleString()}`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Electricity', value: `₹${(catTotals.find(c => c.key === 'electricity')?.value || 0).toLocaleString()}`, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Transport', value: `₹${(catTotals.find(c => c.key === 'transport')?.value || 0).toLocaleString()}`, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          ].map((s, i) => (
            <div key={i} className="card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
            </div>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-6">
          <h3 className="font-bold text-base mb-4">By Category</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catTotals.filter(c => c.value > 0)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888818" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }}>
                  <Label value="Expense Category" offset={-5} position="insideBottom" style={{ fill: '#888', fontSize: 10, fontWeight: 600 }} />
                </XAxis>
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `₹${v}`}>
                  <Label value="Amount" angle={-90} position="insideLeft" offset={10} style={{ fill: '#888', fontSize: 10, fontWeight: 600, textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg,#1a1a1a)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {catTotals.map((c, i) => <Cell key={i} fill={c.color} />)}
                  <LabelList dataKey="value" position="top" formatter={(v: any) => `₹${Number(v).toLocaleString()}`} stroke="none" style={{ fontSize: 10, fontWeight: 700, fill: '#888' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {catTotals.filter(c => c.value > 0).map(c => (
              <div key={c.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  {c.label}
                </span>
                <span className="font-bold">₹{c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/30 border border-transparent focus:border-blue-500 focus:bg-card rounded-xl py-2 pl-9 pr-4 transition-all outline-none text-sm"
                />
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-muted text-sm font-bold transition-all"
              >
                <Download size={14} />
                Export
              </button>
            </div>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCatFilter('')}
                className={cn('px-2.5 py-1 rounded-full text-xs font-bold transition-all', catFilter === '' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                All
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCatFilter(prev => prev === c.key ? '' : c.key)}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all', catFilter === c.key ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                  style={catFilter === c.key ? { background: c.color } : {}}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border relative">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex justify-center items-center h-32">
                        <QuantumLoader />
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && allExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${getColor(exp.category)}15`, color: getColor(exp.category) }}>
                          {getIcon(exp.category)}
                        </div>
                        <span className="font-semibold capitalize">{exp.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center font-bold text-red-500">
                        <IndianRupee size={13} />
                        {exp.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{format(exp.created_at, 'MMM d, yyyy • HH:mm:ss')}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">{exp.notes || '—'}</td>
                  </tr>
                ))}
                {!isLoading && !allExpenses.length && (
                  <tr><td colSpan={4}><EmptyState icon={Receipt} title="No expenses recorded" subtitle="Record your first expense to start tracking costs." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={m => notify(m, 'success')} />
    </div>
  );
}
