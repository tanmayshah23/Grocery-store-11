import { cn } from '@/utils/cn';

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('card p-5 animate-pulse', className)}>
            <div className="h-3 w-1/2 bg-muted rounded-full mb-3"></div>
            <div className="h-7 w-3/4 bg-muted rounded-full"></div>
        </div>
    );
}

interface SkeletonRowProps {
    cols: number;
    rows: number;
}

export function SkeletonRow({ cols, rows }: SkeletonRowProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, ri) => (
                <tr key={ri} className="animate-pulse border-b border-border">
                    {Array.from({ length: cols }).map((_, ci) => (
                        <td key={ci} className="px-6 py-4">
                            <div className={cn('h-4 bg-muted/70 rounded-full', ci === 0 ? 'w-4/5' : ci % 2 === 0 ? 'w-1/2' : 'w-2/3')} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
