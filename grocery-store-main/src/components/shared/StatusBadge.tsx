import { cn } from '@/utils/cn';

type PaymentMode = 'cash' | 'upi' | 'online' | 'mixed' | 'credit';

const PAYMENT_BADGE: Record<PaymentMode, { label: string; cls: string }> = {
    cash: { label: '💵 Cash', cls: 'bg-green-500/10 text-green-600' },
    upi: { label: '📱 UPI', cls: 'bg-blue-500/10 text-blue-600' },
    online: { label: '🌐 Online', cls: 'bg-purple-500/10 text-purple-600' },
    mixed: { label: '🔀 Mixed', cls: 'bg-amber-500/10 text-amber-600' },
    credit: { label: '📒 Credit', cls: 'bg-red-500/10 text-red-600' },
};

export function PaymentBadge({ mode }: { mode: PaymentMode }) {
    const badge = PAYMENT_BADGE[mode] ?? { label: mode, cls: 'bg-muted text-muted-foreground' };
    return (
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold', badge.cls)}>
            {badge.label}
        </span>
    );
}

// ─── Khata Status Badge ─────────────────────────────────────
interface KhataStatusBadgeProps {
    pendingAmount: number;
    totalCredit: number;
}

export function KhataStatusBadge({ pendingAmount, totalCredit }: KhataStatusBadgeProps) {
    if (pendingAmount === 0) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600">🟢 Cleared</span>;
    }
    if (totalCredit > 0 && pendingAmount < totalCredit) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">🟡 Partial</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600">🔴 Pending</span>;
}
