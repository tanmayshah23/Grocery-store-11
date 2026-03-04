import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, CheckCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { db, type Settings } from '@/db/db';
import { notify } from '@/utils/notify';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings | undefined;
    handleSendRecoveryEmail: () => Promise<void>;
}

// Hashing Utility (duplicated for simplicity or should be in utils)
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ProfileModal({ isOpen, onClose, settings, handleSendRecoveryEmail }: ProfileModalProps) {
    const [formData, setFormData] = useState({
        store_name: '',
        store_owner: '',
        email: '',
        phone: '',
        new_pin: '',
        confirm_pin: '',
        old_pin: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [showPinChange, setShowPinChange] = useState(false);
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        if (settings && isOpen) {
            setFormData({
                store_name: settings.store_name,
                store_owner: settings.store_owner,
                email: settings.email,
                phone: settings.phone,
                new_pin: '',
                confirm_pin: '',
                old_pin: '',
            });
            setShowPinChange(false);
        }
    }, [settings, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!settings?.id) return;

            // 1. If changing PIN, verify old PIN first
            if (formData.new_pin.trim()) {
                if (formData.new_pin.trim().length < 4) {
                    notify('New PIN must be at least 4 digits.', 'info');
                    setIsLoading(false);
                    return;
                }

                if (formData.new_pin !== formData.confirm_pin) {
                    notify('New PINs do not match.', 'info');
                    setIsLoading(false);
                    return;
                }

                const hashedOld = await hashPin(formData.old_pin.trim());
                if (hashedOld !== settings.pin) {
                    notify('Current PIN is incorrect. Could not change PIN.', 'info');
                    setIsLoading(false);
                    return;
                }

                const hashedNew = await hashPin(formData.new_pin.trim());
                if (hashedNew === settings.pin) {
                    notify('New PIN must be different from current PIN.', 'info');
                    setIsLoading(false);
                    return;
                }
            }

            const updatedSettings: any = {
                ...settings,
                store_name: formData.store_name.trim(),
                store_owner: formData.store_owner.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                logo_letter: formData.store_name.trim()[0].toUpperCase(),
            };

            if (formData.new_pin.trim()) {
                updatedSettings.pin = await hashPin(formData.new_pin.trim());
            }

            await db.settings.update(settings.id, updatedSettings);
            notify('Profile updated successfully!', 'success');
            onClose();
        } catch (err) {
            notify('Failed to update profile.', 'info');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                    className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <User size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Store Profile</h3>
                                <p className="text-xs text-muted-foreground">Update your details</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold">Store Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.store_name}
                                        onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                                        className="w-full bg-muted/50 border border-border focus:border-blue-500 rounded-xl py-2.5 px-4 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold">Owner Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.store_owner}
                                        onChange={e => setFormData({ ...formData, store_owner: e.target.value })}
                                        className="w-full bg-muted/50 border border-border focus:border-blue-500 rounded-xl py-2.5 px-4 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-muted/50 border border-border focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold">Phone Number</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-muted/50 border border-border focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                {!showPinChange ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowPinChange(true)}
                                        className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                                    >
                                        <ShieldCheck size={14} /> Change Security PIN?
                                    </button>
                                ) : (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border border-dashed animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change PIN</h4>
                                            <button type="button" onClick={() => { setShowPinChange(false); setFormData({ ...formData, new_pin: '', confirm_pin: '', old_pin: '' }); }} className="text-[10px] text-red-500 font-bold">Cancel</button>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground">Current PIN</label>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setIsEmailLoading(true);
                                                            await handleSendRecoveryEmail();
                                                            setIsEmailLoading(false);
                                                        }}
                                                        disabled={isEmailLoading}
                                                        className="text-[10px] text-blue-500 hover:text-blue-600 font-medium transition-colors"
                                                    >
                                                        {isEmailLoading ? 'Sending...' : 'Forgot PIN?'}
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showPin ? "text" : "password"}
                                                        placeholder="Current PIN"
                                                        value={formData.old_pin}
                                                        maxLength={4}
                                                        onChange={e => setFormData({ ...formData, old_pin: e.target.value.replace(/\D/g, '') })}
                                                        className="w-full bg-background border border-border focus:border-blue-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin(!showPin)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground ml-1">New PIN</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPin ? "text" : "password"}
                                                        placeholder="New 4-digit PIN"
                                                        value={formData.new_pin}
                                                        maxLength={4}
                                                        onChange={e => setFormData({ ...formData, new_pin: e.target.value.replace(/\D/g, '') })}
                                                        className="w-full bg-background border border-border focus:border-blue-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin(!showPin)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground ml-1">Confirm New PIN</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPin ? "text" : "password"}
                                                        placeholder="Type new PIN again"
                                                        value={formData.confirm_pin}
                                                        maxLength={4}
                                                        onChange={e => setFormData({ ...formData, confirm_pin: e.target.value.replace(/\D/g, '') })}
                                                        className="w-full bg-background border border-border focus:border-blue-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {isLoading ? 'Saving...' : <><CheckCircle size={18} /> Update Profile</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
