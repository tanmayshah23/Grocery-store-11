import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
}

export function ConfirmModal({
    isOpen, onClose, onConfirm,
    title, message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDanger = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 space-y-4">
                        <div className={cn(
                            'h-12 w-12 rounded-2xl flex items-center justify-center mx-auto',
                            isDanger ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                        )}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="font-bold text-lg">{title}</h3>
                            <p className="text-sm text-muted-foreground">{message}</p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all">
                                {cancelLabel}
                            </button>
                            <button onClick={onConfirm}
                                className={cn(
                                    'flex-1 py-2.5 rounded-xl font-bold text-sm transition-all text-white shadow-lg',
                                    isDanger
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                )}>
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
