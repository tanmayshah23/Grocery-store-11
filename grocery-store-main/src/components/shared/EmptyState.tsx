import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <Icon size={28} />
            </div>
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
        </div>
    );
}
