import type { Sale, Purchase, Khata, Expense, Settings } from '@/db/db';
import { db } from '@/db/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_BRAND = "Smart Grocery Store";
const BLUE = [26, 92, 69] as [number, number, number];
const DARK = [15, 23, 42] as [number, number, number];

async function getSettings(): Promise<Settings | undefined> {
    const coll = await db.settings.toCollection();
    return await coll.first();
}

function addHeader(doc: jsPDF, title: string, brandName: string, subtitle?: string) {
    // Blue banner
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, 210, 26, 'F');

    // Store name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(brandName, 14, 10);

    // Sub-line
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Store Management System', 14, 16);

    // Generated time
    doc.text(`Generated: ${format(Date.now(), 'dd MMM yyyy, h:mm a')}`, 14, 21);

    // Report title on right
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 196, 10, { align: 'right' });
    if (subtitle) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, 196, 16, { align: 'right' });
    }

    doc.setTextColor(...DARK);
}

function addFooter(doc: jsPDF, brandName: string) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} — ${brandName}`, 105, 293, { align: 'center' });
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 289, 196, 289);
    }
}

function fmt(n: number) { return `Rs.${n.toLocaleString('en-IN')}`; }

// ─── Sales Export ─────────────────────────────────────────────────────────────

export async function exportSalesPdf(sales: Sale[], dateLabel: string) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addHeader(doc, 'SALES REPORT', brandName, dateLabel);

    // Summary strip
    const total = sales.reduce((s, x) => s + x.total_amount, 0);
    const cash = sales.filter(s => s.payment_mode === 'cash').reduce((s, x) => s + x.total_amount, 0);
    const upi = sales.filter(s => s.payment_mode === 'upi' || s.payment_mode === 'online').reduce((s, x) => s + x.total_amount, 0);
    const mixed = sales.filter(s => s.payment_mode === 'mixed').reduce((s, x) => s + x.total_amount, 0);

    doc.setFillColor(245, 246, 250);
    doc.rect(14, 29, 182, 16, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const summaryItems = [
        { label: 'Total Bills', val: `${sales.length}` },
        { label: 'Total Amount', val: fmt(total) },
        { label: 'Cash', val: fmt(cash) },
        { label: 'UPI/Online', val: fmt(upi) },
        { label: 'Mixed', val: fmt(mixed) },
    ];
    summaryItems.forEach((item, i) => {
        const x = 20 + i * 36;
        doc.text(item.label, x, 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(item.val, x, 41);
        doc.setFontSize(8);
    });

    // Bills table
    autoTable(doc, {
        startY: 48,
        head: [['Bill No', 'Customer', 'Items', 'Payment', 'Amount', 'Date']],
        body: sales.map(s => [
            s.bill_number,
            s.customer_name || 'Walking Customer',
            `${s.items.length} item${s.items.length !== 1 ? 's' : ''}`,
            s.payment_mode.toUpperCase(),
            fmt(s.total_amount),
            format(s.created_at, 'dd/MM/yyyy  h:mm a'),
        ]),
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: BLUE },
            4: { fontStyle: 'bold', textColor: [22, 163, 74] },
            5: { textColor: [100, 116, 139] },
        },
        margin: { left: 14, right: 14 },
        tableLineWidth: 0.1,
        tableLineColor: [229, 231, 235],
    });

    addFooter(doc, brandName);
    doc.save(`sales-report-${format(Date.now(), 'dd-MM-yyyy')}.pdf`);
}

// ─── Single Bill / Receipt ────────────────────────────────────────────────────

export async function exportBillPdf(sale: Sale) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });

    // Header
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, 80, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(brandName, 40, 8, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Store Receipt', 40, 14, { align: 'center' });

    doc.setTextColor(...DARK);
    let y = 24;

    // Bill info
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill No: ${sale.bill_number}`, 5, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(sale.created_at, 'dd MMM yyyy, h:mm a')}`, 5, y);
    y += 4.5;
    doc.text(`Customer: ${sale.customer_name || 'Walking Customer'}`, 5, y);
    y += 4.5;
    doc.text(`Payment: ${sale.payment_mode.toUpperCase()}`, 5, y);
    y += 4;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(5, y, 75, y);
    y += 4;

    // Items table
    autoTable(doc, {
        startY: y,
        head: [['Item', 'Qty', 'Price', 'Total']],
        body: sale.items.map(item => [
            item.name,
            `${item.quantity} ${item.unit || 'pcs'}`,
            `Rs.${item.price}`,
            `Rs.${item.total}`,
        ]),
        headStyles: { fillColor: BLUE, textColor: 255, fontSize: 6.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 6.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 5, right: 5 },
        tableLineWidth: 0.1,
        tableLineColor: [229, 231, 235],
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // Divider + Total
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 5, y);
    doc.setTextColor(...BLUE);
    doc.text(`Rs.${sale.total_amount.toLocaleString('en-IN')}`, 75, y, { align: 'right' });
    doc.setTextColor(...DARK);
    y += 6;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for shopping with us!', 40, y, { align: 'center' });

    doc.save(`bill-${sale.bill_number}.pdf`);
}

// ─── Purchases Export ─────────────────────────────────────────────────────────

export async function exportPurchasesPdf(purchases: Purchase[], dateLabel: string) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addHeader(doc, 'PURCHASES REPORT', brandName, dateLabel);

    const total = purchases.reduce((s, p) => s + (p.grand_total ?? p.total_amount), 0);
    const extraTotal = purchases.reduce((s, p) => {
        if (!p.extra_costs) return s;
        return s + (p.extra_costs.transport || 0) + (p.extra_costs.loading || 0) + (p.extra_costs.misc || 0);
    }, 0);

    // Summary strip
    doc.setFillColor(245, 246, 250);
    doc.rect(14, 29, 182, 16, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const summaryItems = [
        { label: 'Total Invoices', val: `${purchases.length}` },
        { label: 'Grand Total', val: fmt(total) },
        { label: 'Extra Costs', val: fmt(extraTotal) },
        { label: 'Suppliers', val: `${[...new Set(purchases.map(p => p.supplier_name))].length}` },
    ];
    summaryItems.forEach((item, i) => {
        const x = 20 + i * 45;
        doc.text(item.label, x, 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(item.val, x, 41);
        doc.setFontSize(8);
    });

    autoTable(doc, {
        startY: 48,
        head: [['Invoice No', 'Supplier', 'Items', 'Base Amt', 'Extra Costs', 'Grand Total', 'Payment', 'Date']],
        body: purchases.map(p => {
            const extra = p.extra_costs
                ? (p.extra_costs.transport || 0) + (p.extra_costs.loading || 0) + (p.extra_costs.misc || 0)
                : 0;
            return [
                p.invoice_number,
                p.supplier_name,
                `${p.items.length}`,
                fmt(p.total_amount),
                extra > 0 ? `+${fmt(extra)}` : '—',
                fmt(p.grand_total ?? p.total_amount),
                p.payment_mode.toUpperCase(),
                format(p.created_at, 'dd/MM/yyyy'),
            ];
        }),
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: BLUE },
            5: { fontStyle: 'bold', textColor: [22, 163, 74] },
            4: { textColor: [217, 119, 6] },
        },
        margin: { left: 14, right: 14 },
        tableLineWidth: 0.1,
        tableLineColor: [229, 231, 235],
    });

    addFooter(doc, brandName);
    doc.save(`purchases-report-${format(Date.now(), 'dd-MM-yyyy')}.pdf`);
}

// ─── Khata Export ─────────────────────────────────────────────────────────────

export async function exportKhataPdf(khataList: Khata[]) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addHeader(doc, 'KHATA LEDGER', brandName, `All Active Accounts — ${format(Date.now(), 'dd MMM yyyy')}`);

    const totalPending = khataList.reduce((s, k) => s + k.pending_amount, 0);
    const totalPaid = khataList.reduce((s, k) => s + k.paid_amount, 0);

    // Summary
    doc.setFillColor(245, 246, 250);
    doc.rect(14, 29, 182, 16, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    [{ label: 'Customers', val: `${khataList.length}` }, { label: 'Total Pending', val: fmt(totalPending) }, { label: 'Total Paid', val: fmt(totalPaid) }].forEach((item, i) => {
        const x = 20 + i * 60;
        doc.text(item.label, x, 35);
        doc.setFontSize(9);
        doc.text(item.val, x, 41);
        doc.setFontSize(8);
    });

    // Summary table
    autoTable(doc, {
        startY: 48,
        head: [['Customer', 'Phone', 'Total Credit', 'Paid', 'Pending', 'Status']],
        body: khataList.map(k => {
            const status = k.pending_amount === 0 ? 'CLEARED' : k.paid_amount > 0 ? 'PARTIAL' : 'PENDING';
            return [
                k.customer_name,
                k.phone_number,
                fmt(k.total_credit),
                fmt(k.paid_amount),
                fmt(k.pending_amount),
                status,
            ];
        }),
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { fontStyle: 'bold' },
            4: { fontStyle: 'bold', textColor: [220, 38, 38] },
            5: { fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
        tableLineWidth: 0.1,
        tableLineColor: [229, 231, 235],
    });

    addFooter(doc, brandName);
    doc.save(`khata-ledger-${format(Date.now(), 'dd-MM-yyyy')}.pdf`);
}

// ─── Expenses Export ──────────────────────────────────────────────────────────

export async function exportExpensesPdf(expenses: Expense[], dateLabel: string) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addHeader(doc, 'EXPENSES REPORT', brandName, dateLabel);

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });

    // Summary
    doc.setFillColor(245, 246, 250);
    doc.rect(14, 29, 182, 16, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Total Expenses', 20, 35);
    doc.setFontSize(10);
    doc.text(fmt(total), 20, 41);

    // Category breakdown side by side
    let cx = 80;
    Object.entries(catMap).slice(0, 4).forEach(([cat, amt]) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${fmt(amt)}`, cx, 36);
        cx += 30;
    });

    autoTable(doc, {
        startY: 48,
        head: [['Category', 'Amount', 'Date', 'Notes']],
        body: expenses.map(e => [
            e.category.charAt(0).toUpperCase() + e.category.slice(1),
            fmt(e.amount),
            format(e.created_at, 'dd/MM/yyyy'),
            e.notes || '—',
        ]),
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { fontStyle: 'bold', textColor: [220, 38, 38] },
            2: { textColor: [100, 116, 139] },
        },
        margin: { left: 14, right: 14 },
        tableLineWidth: 0.1,
        tableLineColor: [229, 231, 235],
    });

    doc.save(`expenses-report-${format(Date.now(), 'dd-MM-yyyy')}.pdf`);
}

// ─── Individual Khata Statement ───────────────────────────────────────────────

export async function exportIndividualKhataPdf(khata: Khata) {
    const settings = await getSettings();
    const brandName = settings?.store_name || DEFAULT_BRAND;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addHeader(doc, 'CUSTOMER STATEMENT', brandName, `Statement Date: ${format(Date.now(), 'dd MMM yyyy')}`);

    // Customer Info Strip
    doc.setFillColor(245, 246, 250);
    doc.rect(14, 29, 182, 16, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);

    // Total numbers for summary
    const summaryItems = [
        { label: 'Customer Name', val: khata.customer_name },
        { label: 'Phone Number', val: khata.phone_number },
        { label: 'Total Pending', val: fmt(khata.pending_amount) },
        { label: 'Total Paid', val: fmt(khata.paid_amount) },
    ];

    summaryItems.forEach((item, i) => {
        const x = 20 + i * 45;
        doc.text(item.label, x, 35);
        doc.setFontSize(9);
        if (item.label === 'Total Pending') {
            doc.setTextColor(220, 38, 38);
        } else if (item.label === 'Total Paid') {
            doc.setTextColor(22, 163, 74);
        } else {
            doc.setTextColor(...DARK);
        }
        doc.text(item.val, x, 41);
        doc.setFontSize(8);
    });

    // Reset color for Title
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.text('Payment History', 14, 52);

    // Create a normalized list of transactions if they exist
    // In Khata, total_credit is essentially the starting balance plus any new additions
    // For simplicity, we'll just list the payment history in this MVP PDF.

    if (!khata.payment_history || khata.payment_history.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('No payments recorded for this customer yet.', 14, 60);
    } else {
        autoTable(doc, {
            startY: 56,
            head: [['Date', 'Amount Paid', 'Notes']],
            body: [...khata.payment_history].reverse().map(p => [
                format(p.paid_at, 'dd/MM/yyyy h:mm a'),
                fmt(p.amount),
                p.note || '—',
            ]),
            headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { textColor: [100, 116, 139] },
                1: { fontStyle: 'bold', textColor: [22, 163, 74] },
            },
            margin: { left: 14, right: 14 },
            tableLineWidth: 0.1,
            tableLineColor: [229, 231, 235],
        });
    }

    // Final calculations at bottom
    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 70;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Pending Balance:', 130, finalY);
    doc.setTextColor(220, 38, 38);
    doc.text(fmt(khata.pending_amount), 196, finalY, { align: 'right' });

    doc.setTextColor(...DARK);

    addFooter(doc, brandName);

    const safeName = khata.customer_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`khata-statement-${safeName}-${format(Date.now(), 'dd-MM-yyyy')}.pdf`);
}

