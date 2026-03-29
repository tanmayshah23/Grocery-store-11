import React, { useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronRight, Trash2,
  MessageSquare, FileDown, Search, UserPlus, Phone, IndianRupee,
  MessageCircle, FileText
} from 'lucide-react';
import { db, type Khata } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { formatDistanceToNow, format } from 'date-fns';
import { AddKhataModal } from '../modals/AddKhataModal';
import { ReceivePaymentModal } from '../shared/ReceivePaymentModal';
import { ConfirmModal } from '../shared/ConfirmModal';
import { KhataStatusBadge } from '../shared/StatusBadge';
import { QuantumLoader } from '../shared/QuantumLoader';
import { EmptyState } from '../shared/EmptyState';
import { notify } from '@/utils/notify';
import { exportKhataPdf, exportIndividualKhataPdf } from '@/utils/exportPdf';

export function KhataDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentKhata, setPaymentKhata] = useState<Khata | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const khataEntries = useSQLiteQuery(
    async () => {
      const records = await db.khata.getAllActive();

      if (!searchTerm) return records;
      return records.filter(k =>
        k.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.phone_number.includes(searchTerm)
      );
    },
    [searchTerm]
  );

  const isLoading = khataEntries === undefined;
  const totalPending = khataEntries?.reduce((s, k) => s + k.pending_amount, 0) || 0;
  const totalPaid = khataEntries?.reduce((s, k) => s + k.paid_amount, 0) || 0;
  const activeBorrowers = khataEntries?.filter(k => k.pending_amount > 0).length || 0;

  const handleDelete = async (id: number) => {
    await db.khata.update(id, { is_active: 0, updated_at: Date.now(), sync_status: 'pending' });
    notify('Khata account archived. Data safely stored.', 'info');
  };

  const settings = useSQLiteQuery(async () => {
    return await (await db.settings.toCollection()).first();
  });

  const generateReminderMessage = (khata: Khata) => {
    const storeName = settings?.store_name || "our store";
    const amount = khata.pending_amount.toLocaleString();

    // Gujarati message
    const gujaratiMsg = `🙏 નમસ્તે ${khata.customer_name},\n\nઆ ${storeName} તરફથી એક નમ્ર યાદ છે.\nતમારી ખાતા બાકી રકમ ₹${amount} છે.\nકૃપા કરીને જલ્દીથી ચુકવણી કરવા વિનંતી.\n\nઆભાર! 🙏`;

    // English message
    const englishMsg = `Hello ${khata.customer_name},\n\nThis is a gentle reminder from ${storeName} regarding your pending Khata balance of ₹${amount}. Please arrange for payment at your earliest convenience.\n\nThank you!`;

    return `${gujaratiMsg}\n\n━━━━━━━━━━━━━━━━━━\n\n${englishMsg}`;
  };

  const handleWhatsAppReminder = (khata: Khata) => {
    // Basic phone number cleaning just in case
    const cleanPhone = khata.phone_number.replace(/\D/g, '');
    const message = generateReminderMessage(khata);
    const encodedMessage = encodeURIComponent(message);

    // Attempt universal WA link
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleSmsReminder = (khata: Khata) => {
    const cleanPhone = khata.phone_number.replace(/\D/g, '');
    const message = generateReminderMessage(khata);
    const encodedMessage = encodeURIComponent(message);
    window.open(`sms:${cleanPhone}?body=${encodedMessage}`, '_self');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Khata Management</h2>
          <p className="text-muted-foreground mt-1">Track customer credit and payment history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => await exportKhataPdf(khataEntries || [])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all"
            title="Export Khata Ledger PDF"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">Export Ledger</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">New Khata Account</span><span className="sm:hidden">+ Khata</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-6 bg-red-500/5 border-red-500/20">
          <p className="text-xs font-bold text-red-500/80 uppercase tracking-wider">Total Pending</p>
          <div className="flex items-end justify-between mt-2">
            <div className="flex items-center font-black text-3xl text-red-500"><IndianRupee size={22} />{totalPending.toLocaleString()}</div>
            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-lg font-bold">Real-time</span>
          </div>
        </div>
        <div className="card p-6 bg-green-500/5 border-green-500/20">
          <p className="text-xs font-bold text-green-500/80 uppercase tracking-wider">Total Paid</p>
          <div className="flex items-end justify-between mt-2">
            <div className="flex items-center font-black text-3xl text-green-500"><IndianRupee size={22} />{totalPaid.toLocaleString()}</div>
            <CheckCircle2 size={20} className="text-green-500" />
          </div>
        </div>
        <div className="card p-6 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">Active Borrowers</p>
          <div className="flex items-end justify-between mt-2">
            <span className="font-black text-3xl text-emerald-500">{activeBorrowers} People</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg font-bold">Total: {khataEntries?.length || 0}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-muted/30 border border-transparent focus:border-emerald-500 focus:bg-card rounded-xl py-2.5 pl-10 pr-4 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Pending</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border relative">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex justify-center items-center h-48">
                      <QuantumLoader />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && khataEntries?.map(item => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-muted/20 transition-colors group">
                    <td className="pl-4 py-4">
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id!)}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                      >
                        {expandedId === item.id
                          ? <ChevronDown size={15} className="text-muted-foreground" />
                          : <ChevronRight size={15} className="text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                          {item.customer_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold">{item.customer_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone size={10} />{item.phone_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center font-black text-lg text-red-500">
                        <IndianRupee size={14} />{item.pending_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center font-bold text-green-500 text-sm">
                        <IndianRupee size={12} />{item.paid_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <KhataStatusBadge pendingAmount={item.pending_amount} totalCredit={item.total_credit || item.pending_amount + item.paid_amount} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(item.updated_at)} ago
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {item.pending_amount > 0 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(item); }}
                              title="Send WhatsApp Reminder"
                              className="p-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors font-bold flex items-center gap-1 shadow-sm"
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSmsReminder(item); }}
                              title="Send SMS Reminder"
                              className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors font-bold flex items-center gap-1 shadow-sm"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button
                              onClick={() => setPaymentKhata(item)}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-sm whitespace-nowrap"
                            >
                              Receive Money
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); exportIndividualKhataPdf(item); }}
                          title="Download Statement PDF"
                          className="p-1.5 hover:bg-purple-500/10 text-purple-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <FileText size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id!)}
                          title="Archive Account"
                          className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Payment History */}
                  {expandedId === item.id && (
                    <tr key={`${item.id}-hist`} className="bg-muted/10">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="mb-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Payment History</p>
                          {item.payment_history && item.payment_history.length > 0 ? (
                            <div className="space-y-1.5">
                              {[...item.payment_history].reverse().map(payment => (
                                <div key={payment.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5">
                                  <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                                  <div className="flex-1">
                                    <span className="font-bold text-green-500">₹{payment.amount.toLocaleString()}</span>
                                    {payment.note && <span className="text-xs text-muted-foreground ml-2">— {payment.note}</span>}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{format(payment.paid_at, 'MMM d, yyyy • h:mm:ss a')}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {item.notes}</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!isLoading && !khataEntries?.length && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={UserPlus} title="No khata accounts" subtitle='Add a customer to track their pending payments. Click "New Khata Account" to start.' />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddKhataModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={m => notify(m, 'success')}
      />
      <ReceivePaymentModal
        isOpen={paymentKhata !== null}
        khata={paymentKhata}
        onClose={() => setPaymentKhata(null)}
      />
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { handleDelete(confirmDelete!); setConfirmDelete(null); }}
        title="Archive Khata Account?"
        message="This customer's khata account will be archived. All history is preserved and can be restored."
        confirmLabel="Yes, Archive"
        isDanger
      />
    </div>
  );
}
