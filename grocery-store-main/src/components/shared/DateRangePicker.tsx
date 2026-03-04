import { useState } from 'react';
import { cn } from '@/utils/cn';

export interface DateRange {
    from: number; // Unix ms
    to: number;   // Unix ms
}

const QUICK_RANGES = [
    { label: '24 Hr', value: '24h' },
    { label: '1 Wk', value: '1w' },
    { label: '1 Mon', value: '1m' },
    { label: '6 Mon', value: '6m' },
    { label: '1 Yr', value: '1y' },
    { label: '5 Yr', value: '5y' },
];

export function getDefaultRange(preset: string = '24h'): DateRange {
    return computeRange(preset);
}

function computeRange(preset: string): DateRange {
    const now = new Date();
    const to = now.getTime();

    const map: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 86400000,
        '1w': 7 * 86400000,
        '30d': 30 * 86400000,
        '1m': 30 * 86400000,
        '6m': 180 * 86400000,
        '1y': 365 * 86400000,
        '5y': 5 * 365 * 86400000,
    };

    return { from: to - (map[preset] ?? map['24h']), to };
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const [activePreset, setActivePreset] = useState<string>('24h');

    const handlePreset = (v: string) => {
        setActivePreset(v);
        onChange(computeRange(v));
    };

    const handleManualChange = (newRange: DateRange) => {
        setActivePreset('custom');
        onChange(newRange);
    }

    // Format for datetime-local input: YYYY-MM-DDTHH:mm:ss
    const toDateTimeLocal = (ms: number) => {
        if (!ms) return '';
        const d = new Date(ms);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Preset Buttons */}
            <div className="flex flex-wrap bg-muted/30 p-1 rounded-xl border border-border gap-1">
                {QUICK_RANGES.map(r => {
                    const isActive = activePreset === r.value;
                    return (
                        <button
                            key={r.value}
                            onClick={() => handlePreset(r.value)}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95",
                                isActive
                                    ? "bg-white dark:bg-muted text-blue-600 shadow-sm"
                                    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/30"
                            )}
                        >
                            {r.label}
                        </button>
                    );
                })}
            </div>

            {/* High-Precision Custom Range Inputs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/10 border border-border rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase ml-1">From</span>
                    <input
                        type="datetime-local"
                        step="1"
                        value={toDateTimeLocal(value.from)}
                        onChange={(e) => handleManualChange({ from: e.target.value ? new Date(e.target.value).getTime() : value.from, to: value.to })}
                        className="bg-transparent border-none text-[11px] font-bold outline-none focus:text-blue-600 transition-colors w-44 px-1"
                    />
                </div>
                <div className="h-4 w-px bg-border hidden sm:block mx-1" />
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase">To</span>
                    <input
                        type="datetime-local"
                        step="1"
                        value={toDateTimeLocal(value.to)}
                        onChange={(e) => handleManualChange({ from: value.from, to: e.target.value ? new Date(e.target.value).getTime() : value.to })}
                        className="bg-transparent border-none text-[11px] font-bold outline-none focus:text-blue-600 transition-colors w-44 px-1"
                    />
                </div>
            </div>
        </div>
    );
}
