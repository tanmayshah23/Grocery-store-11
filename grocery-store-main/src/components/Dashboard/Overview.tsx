import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Label, LabelList
} from 'recharts';
import {
  TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight,
  Clock, ShoppingCart, Package, Download
} from 'lucide-react';
import { db } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { formatDistanceToNow, format } from 'date-fns';
import { DateRangePicker, getDefaultRange, type DateRange } from '@/components/shared/DateRangePicker';
import { QuantumLoader } from '@/components/shared/QuantumLoader';
import { usePWA } from '@/context/PWAContext';

export function DashboardOverview() {
  const { isInstalled, installApp } = usePWA();
  const [range, setRange] = useState<DateRange>(getDefaultRange('1m'));
  const [showInstallFallback, setShowInstallFallback] = useState(false);

  const handleInstallClick = async () => {
    const success = await installApp();
    if (!success) {
      setShowInstallFallback(true);
    }
  };

  const salesData = useSQLiteQuery(async () => {
    return await db.sales.getInRange(range.from, range.to);
  }, [range.from, range.to]);

  const khataData = useSQLiteQuery(async () => {
    return await db.khata.getAllActive();
  });

  const purchaseData = useSQLiteQuery(async () => {
    return await db.purchases.getInRange(range.from, range.to);
  }, [range.from, range.to]);

  const settings = useSQLiteQuery(async () => {
    const coll = await db.settings.toCollection();
    return coll.first();
  });

  const isLoading = salesData === undefined;

  const filteredSales = salesData || [];
  const totalSalesAmt = filteredSales.reduce((s, x) => s + x.total_amount, 0);
  const totalBills = filteredSales.length;
  const cashSales = filteredSales.filter(s => s.payment_mode === 'cash').reduce((s, x) => s + x.total_amount, 0);
  const upiSales = filteredSales.filter(s => s.payment_mode === 'upi' || s.payment_mode === 'online').reduce((s, x) => s + x.total_amount, 0);
  const mixedSales = filteredSales.filter(s => s.payment_mode === 'mixed').reduce((s, x) => s + x.total_amount, 0);

  const totalKhataVal = khataData?.reduce((s, k) => s + k.pending_amount, 0) || 0;
  const totalCustomers = khataData?.length || 0;
  const totalPurchasesVal = purchaseData?.reduce((s, p) => s + (p.grand_total ?? p.total_amount), 0) || 0;

  // Top 5 items from sales
  const itemAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      if (!itemAgg[item.name]) itemAgg[item.name] = { name: item.name, qty: 0, revenue: 0 };
      itemAgg[item.name].qty += item.quantity;
      itemAgg[item.name].revenue += item.total;
    });
  });
  const topItems = Object.values(itemAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Group sales by day for chart
  const dayMap: Record<string, number> = {};
  filteredSales.forEach(sale => {
    const day = format(sale.created_at, 'dd MMM');
    dayMap[day] = (dayMap[day] || 0) + sale.total_amount;
  });
  const chartData = Object.entries(dayMap).map(([name, sales]) => ({ name, sales }));
  if (chartData.length < 2) {
    for (let i = chartData.length; i < 7; i++) chartData.unshift({ name: '--', sales: 0 });
  }

  const paymentSplit = [
    { name: 'Cash', value: cashSales, color: '#22c55e' },
    { name: 'UPI/Online', value: upiSales, color: '#2d8a6a' },
    { name: 'Mixed', value: mixedSales, color: '#14b8a6' },
  ].filter(p => p.value > 0);

  const stats = [
    { label: 'Total Sales', value: `₹${totalSalesAmt.toLocaleString()}`, icon: TrendingUp, sub: `${totalBills} bills`, color: 'text-emerald-500', bg: 'bg-emerald-500/10', hbg: 'group-hover:bg-emerald-500' },
    { label: 'Khata Customers', value: `${totalCustomers}`, icon: Users, sub: `₹${totalKhataVal.toLocaleString()} due`, color: 'text-teal-500', bg: 'bg-teal-500/10', hbg: 'group-hover:bg-teal-500' },
    { label: 'Pending Khata', value: `₹${totalKhataVal.toLocaleString()}`, icon: CreditCard, sub: 'Total due', color: 'text-red-500', bg: 'bg-red-500/10', hbg: 'group-hover:bg-red-500', negative: true },
    { label: 'Purchases', value: `₹${totalPurchasesVal.toLocaleString()}`, icon: Package, sub: `${(purchaseData || []).length} orders`, color: 'text-amber-500', bg: 'bg-amber-500/10', hbg: 'group-hover:bg-amber-500' },
  ];

  // Group sales and purchases by day for Sales vs Purchases chart
  const spMap: Record<string, { name: string; sales: number; purchases: number; timestamp: number }> = {};
  filteredSales.forEach(sale => {
    const day = format(sale.created_at, 'dd MMM');
    if (!spMap[day]) spMap[day] = { name: day, sales: 0, purchases: 0, timestamp: sale.created_at };
    spMap[day].sales += sale.total_amount;
    // ensure we keep the earliest timestamp for sorting
    if (sale.created_at < spMap[day].timestamp) spMap[day].timestamp = sale.created_at;
  });
  purchaseData?.forEach(purchase => {
    const day = format(purchase.created_at, 'dd MMM');
    const ts = new Date(purchase.created_at).getTime();
    if (!spMap[day]) spMap[day] = { name: day, sales: 0, purchases: 0, timestamp: ts };
    spMap[day].purchases += (purchase.grand_total ?? purchase.total_amount);
    if (ts < spMap[day].timestamp) spMap[day].timestamp = ts;
  });

  const spChartData = Object.values(spMap).sort((a, b) => a.timestamp - b.timestamp);
  if (spChartData.length < 2) {
    for (let i = spChartData.length; i < 7; i++) spChartData.unshift({ name: '--', sales: 0, purchases: 0, timestamp: 0 });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Store Insights</h2>
            <p className="text-muted-foreground mt-1">Real-time analytics for {settings?.store_name || 'your store'}</p>
          </div>
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Download size={16} />
              Install App
            </button>
          )}
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {showInstallFallback && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-[2rem] p-6 text-center shadow-xl border border-border mt-10">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <Download size={28} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Install App Manually</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Your browser restricts one-click installs without a secure certificate on local networks.<br /><br />
              To bypass this and install the app now: <br /><br />
              <span className="font-semibold text-foreground">iOS (Safari):</span> Tap the <span className="font-bold">Share</span> menu below, then <span className="font-bold">"Add to Home Screen"</span>.<br /><br />
              <span className="font-semibold text-foreground">Android/Chrome:</span> Tap the <span className="font-bold">Menu (⋮)</span> and select <span className="font-bold">"Install App"</span> or <span className="font-bold">"Add to Home screen"</span>.
            </p>
            <button
              onClick={() => setShowInstallFallback(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading
          ? (
            <div className="col-span-full h-48 flex items-center justify-center">
              <QuantumLoader />
            </div>
          )
          : stats.map((stat, i) => (
            <div key={i} className="card p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} ${stat.hbg} group-hover:text-white transition-all`}>
                  <stat.icon size={22} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.negative ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {stat.negative ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                  Live
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <h3 className="text-3xl font-bold tracking-tight mt-1">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              Sales Activity
            </h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Sales</span>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSalesOv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d8a6a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2d8a6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#88888818" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }}>
                  <Label value="Date" offset={-5} position="insideBottom" style={{ fill: '#888', fontSize: 11, fontWeight: 600 }} />
                </XAxis>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `₹${v}`}>
                  <Label value="Revenue" angle={-90} position="insideLeft" offset={10} style={{ fill: '#888', fontSize: 11, fontWeight: 600, textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg, #1a1a1a)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Sales']}
                />
                <Area type="monotone" dataKey="sales" stroke="#2d8a6a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesOv)">
                  <LabelList
                    dataKey="sales"
                    position="top"
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                    style={{ fill: '#2d8a6a', fontSize: 10, fontWeight: 600 }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Split */}
        <div className="card p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-4">Payment Split</h3>
          {paymentSplit.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentSplit} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card-bg, #1a1a1a)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                      formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {paymentSplit.map((p, i) => <Cell key={i} fill={p.color} />)}
                      <LabelList dataKey="value" position="right" formatter={(value: any) => `₹${Number(value).toLocaleString()}`} stroke="none" style={{ fontSize: 10, fontWeight: 700, fill: '#888' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {paymentSplit.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-bold">₹{p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground italic">
              No payment data for this period.
            </div>
          )}
        </div>
      </div>

      {/* New Row: Sales vs Purchases Graph */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TrendingUp className="text-teal-500" size={20} />
            Sales vs Purchases
          </h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Sales
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Purchases
            </span>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spChartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#88888818" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card-bg, #1a1a1a)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                formatter={(v, name) => [`₹${Number(v).toLocaleString()}`, name === 'sales' ? 'Sales' : 'Purchases']}
              />
              <Bar dataKey="sales" fill="#2d8a6a" radius={[4, 4, 0, 0]} name="sales" />
              <Bar dataKey="purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} name="purchases" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShoppingCart className="text-green-500" size={20} />
            Top Selling Items
          </h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.qty} units sold</p>
                  </div>
                  <span className="font-bold text-sm text-green-500">₹{item.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No sales data for this period.</p>
          )}
        </div>

        {/* Recent Activity + Low Stock */}
        <div className="space-y-6">
          {/* Recent Sales Feed */}
          <div className="card p-5">
            <h4 className="font-bold mb-3">Recent Sales</h4>
            <div className="space-y-3">
              {[...(salesData || [])].sort((a, b) => b.created_at - a.created_at).slice(0, 5).map(sale => (
                <div key={sale.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">#{sale.bill_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(sale.created_at)} ago • {sale.payment_mode}</p>
                  </div>
                  <span className="font-bold text-sm">₹{sale.total_amount.toLocaleString()}</span>
                </div>
              ))}
              {!salesData?.length && <p className="text-xs text-muted-foreground italic">No recent sales.</p>}
            </div>
          </div>

          {/* Low Stock Alerts (Conceptual for now, can be linked to inventory DB later) */}
          <div className="card p-5 border-amber-500/20 bg-amber-500/5">
            <h4 className="font-bold mb-3 flex items-center gap-2 text-amber-500">
              <Package size={18} /> Needs Restock
            </h4>
            <div className="space-y-3">
              {/* Just showing top selling items as "Action Needed" as a placeholder for inventory */}
              {topItems.length > 0 ? topItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate flex-1 pr-2">{item.name}</span>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">Selling Fast</span>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground italic">Inventory levels look good.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
