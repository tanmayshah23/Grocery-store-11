import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, CheckCircle, ShieldCheck, Eye, EyeOff, AlertCircle, Store, MapPin } from 'lucide-react';
import { db, type Settings } from '@/db/db';
import { notify } from '@/utils/notify';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings | undefined;
    handleSendRecoveryEmail: () => Promise<void>;
}

// Hashing Utility
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Validation Helpers ─────────────────────────────────────────
function validatePhone(phone: string): { valid: boolean; message: string } {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return { valid: false, message: 'Phone number is required' };
    if (cleaned.length < 10) return { valid: false, message: `${10 - cleaned.length} more digit${10 - cleaned.length > 1 ? 's' : ''} needed` };
    if (cleaned.length > 10) return { valid: false, message: 'Phone number must be 10 digits' };
    if (!/^[6-9]/.test(cleaned)) return { valid: false, message: 'Must start with 6, 7, 8, or 9' };
    return { valid: true, message: 'Valid phone number ✓' };
}

function validateEmail(email: string): { valid: boolean; message: string } {
    if (!email.trim()) return { valid: false, message: 'Email is required' };
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) return { valid: false, message: 'Enter a valid email address' };
    return { valid: true, message: 'Valid email ✓' };
}

function validateName(name: string, label: string): { valid: boolean; message: string } {
    if (!name.trim()) return { valid: false, message: `${label} is required` };
    if (name.trim().length < 2) return { valid: false, message: `${label} must be at least 2 characters` };
    return { valid: true, message: '' };
}

// ─── Inline Field Hint ──────────────────────────────────────────
function FieldHint({ validation, show }: { validation: { valid: boolean; message: string }; show: boolean }) {
    if (!show || !validation.message) return null;
    return (
        <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`text-[11px] mt-1 ml-1 flex items-center gap-1 ${validation.valid ? 'text-emerald-500' : 'text-red-400'
                }`}
        >
            {validation.valid ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
            {validation.message}
        </motion.p>
    );
}

export function ProfileModal({ isOpen, onClose, settings, handleSendRecoveryEmail }: ProfileModalProps) {
    const [formData, setFormData] = useState({
        store_name: '',
        store_owner: '',
        email: '',
        phone: '',
        store_address: '',
        new_pin: '',
        confirm_pin: '',
        old_pin: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [showPinChange, setShowPinChange] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (settings && isOpen) {
            setFormData({
                store_name: settings.store_name,
                store_owner: settings.store_owner,
                email: settings.email,
                phone: settings.phone,
                store_address: settings.store_address || '',
                new_pin: '',
                confirm_pin: '',
                old_pin: '',
            });
            setShowPinChange(false);
            setTouched({});
            setHasChanges(false);
        }
    }, [settings, isOpen]);

    // Track changes
    useEffect(() => {
        if (!settings) return;
        const changed =
            formData.store_name !== settings.store_name ||
            formData.store_owner !== settings.store_owner ||
            formData.email !== settings.email ||
            formData.phone !== settings.phone ||
            formData.store_address !== (settings.store_address || '') ||
            formData.new_pin.trim().length > 0;
        setHasChanges(changed);
    }, [formData, settings]);

    const handleFieldChange = useCallback((field: string, value: string) => {
        if (field === 'phone') {
            // Only allow digits, max 10
            value = value.replace(/\D/g, '').slice(0, 10);
        }
        setFormData(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));
    }, []);

    const phoneValidation = validatePhone(formData.phone);
    const emailValidation = validateEmail(formData.email);
    const storeNameValidation = validateName(formData.store_name, 'Store name');
    const ownerNameValidation = validateName(formData.store_owner, 'Owner name');

    const isFormValid =
        phoneValidation.valid &&
        emailValidation.valid &&
        storeNameValidation.valid &&
        ownerNameValidation.valid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched to show validation
        setTouched({ store_name: true, store_owner: true, email: true, phone: true });

        if (!isFormValid) {
            notify('Please fix the errors before saving.', 'info');
            return;
        }

        setIsLoading(true);

        try {
            if (!settings?.id) return;

            // PIN change validation
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
                store_address: formData.store_address.trim(),
                logo_letter: formData.store_name.trim()[0].toUpperCase(),
            };

            if (formData.new_pin.trim()) {
                updatedSettings.pin = await hashPin(formData.new_pin.trim());
            }

            await db.settings.update(settings.id, updatedSettings);
            notify('Profile updated successfully!', 'success');
            setHasChanges(false);
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
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Store size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Store Profile</h3>
                                <p className="text-xs text-muted-foreground">Update your store & owner details</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasChanges && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full"
                                >
                                    Unsaved
                                </motion.span>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

                        {/* Store & Owner Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold flex items-center gap-1.5">
                                    <Store size={13} className="text-emerald-500" />
                                    Store Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.store_name}
                                    onChange={e => handleFieldChange('store_name', e.target.value)}
                                    onBlur={() => setTouched(p => ({ ...p, store_name: true }))}
                                    placeholder="e.g. Sharma General Store"
                                    className={`w-full bg-muted/50 border rounded-xl py-2.5 px-4 outline-none text-sm transition-all ${touched.store_name && !storeNameValidation.valid
                                        ? 'border-red-400 focus:border-red-500'
                                        : 'border-border focus:border-emerald-500'
                                        }`}
                                />
                                <AnimatePresence>
                                    <FieldHint validation={storeNameValidation} show={touched.store_name === true && !storeNameValidation.valid} />
                                </AnimatePresence>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold flex items-center gap-1.5">
                                    <User size={13} className="text-emerald-500" />
                                    Owner Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.store_owner}
                                    onChange={e => handleFieldChange('store_owner', e.target.value)}
                                    onBlur={() => setTouched(p => ({ ...p, store_owner: true }))}
                                    placeholder="e.g. Rajesh Sharma"
                                    className={`w-full bg-muted/50 border rounded-xl py-2.5 px-4 outline-none text-sm transition-all ${touched.store_owner && !ownerNameValidation.valid
                                        ? 'border-red-400 focus:border-red-500'
                                        : 'border-border focus:border-emerald-500'
                                        }`}
                                />
                                <AnimatePresence>
                                    <FieldHint validation={ownerNameValidation} show={touched.store_owner === true && !ownerNameValidation.valid} />
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Store Address (optional) */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold flex items-center gap-1.5">
                                <MapPin size={13} className="text-emerald-500" />
                                Store Address
                                <span className="text-[10px] font-normal text-muted-foreground">(optional — shown on bills)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.store_address}
                                onChange={e => handleFieldChange('store_address', e.target.value)}
                                placeholder="e.g. 12, Main Road, Near Bus Stand, Jaipur"
                                className="w-full bg-muted/50 border border-border focus:border-emerald-500 rounded-xl py-2.5 px-4 outline-none text-sm transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold flex items-center gap-1.5">
                                <Mail size={13} className="text-emerald-500" />
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => handleFieldChange('email', e.target.value)}
                                    onBlur={() => setTouched(p => ({ ...p, email: true }))}
                                    placeholder="e.g. store@example.com"
                                    className={`w-full bg-muted/50 border rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all ${touched.email && !emailValidation.valid
                                        ? 'border-red-400 focus:border-red-500'
                                        : touched.email && emailValidation.valid
                                            ? 'border-emerald-500'
                                            : 'border-border focus:border-emerald-500'
                                        }`}
                                />
                                {touched.email && emailValidation.valid && (
                                    <CheckCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                )}
                            </div>
                            <AnimatePresence>
                                <FieldHint validation={emailValidation} show={touched.email === true} />
                            </AnimatePresence>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold flex items-center gap-1.5">
                                <Phone size={13} className="text-emerald-500" />
                                Phone Number
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                                    <span className="text-xs font-semibold">+91</span>
                                </div>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => handleFieldChange('phone', e.target.value)}
                                    onBlur={() => setTouched(p => ({ ...p, phone: true }))}
                                    placeholder="10-digit mobile number"
                                    maxLength={10}
                                    className={`w-full bg-muted/50 border rounded-xl py-2.5 pl-14 pr-16 outline-none text-sm transition-all tracking-wide font-medium ${touched.phone && !phoneValidation.valid
                                        ? 'border-red-400 focus:border-red-500'
                                        : touched.phone && phoneValidation.valid
                                            ? 'border-emerald-500'
                                            : 'border-border focus:border-emerald-500'
                                        }`}
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold ${formData.phone.length === 10 ? 'text-emerald-500' : 'text-muted-foreground'
                                    }`}>
                                    {formData.phone.length}/10
                                </span>
                            </div>
                            <AnimatePresence>
                                <FieldHint validation={phoneValidation} show={touched.phone === true} />
                            </AnimatePresence>
                        </div>

                        {/* PIN Section */}
                        <div className="pt-1">
                            {!showPinChange ? (
                                <button
                                    type="button"
                                    onClick={() => setShowPinChange(true)}
                                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                                >
                                    <ShieldCheck size={14} /> Change Security PIN?
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border border-dashed"
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change PIN</h4>
                                        <button type="button" onClick={() => { setShowPinChange(false); setFormData(p => ({ ...p, new_pin: '', confirm_pin: '', old_pin: '' })); }} className="text-[10px] text-red-500 font-bold hover:text-red-600 transition-colors">Cancel</button>
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
                                                    className="text-[10px] text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
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
                                                    className="w-full bg-background border border-border focus:border-emerald-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
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
                                                    className="w-full bg-background border border-border focus:border-emerald-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
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
                                                    className="w-full bg-background border border-border focus:border-emerald-500 rounded-lg py-2 pl-3 pr-10 outline-none text-xs transition-all font-medium"
                                                />
                                            </div>
                                            {formData.confirm_pin && formData.new_pin && (
                                                <p className={`text-[11px] ml-1 flex items-center gap-1 ${formData.confirm_pin === formData.new_pin ? 'text-emerald-500' : 'text-red-400'}`}>
                                                    {formData.confirm_pin === formData.new_pin
                                                        ? <><CheckCircle size={11} /> PINs match ✓</>
                                                        : <><AlertCircle size={11} /> PINs do not match</>
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !hasChanges || !isFormValid}
                                className={`w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${hasChanges && isFormValid
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 cursor-pointer'
                                    : 'bg-gray-400 cursor-not-allowed shadow-none opacity-60'
                                    }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Saving Changes...
                                    </span>
                                ) : !hasChanges ? (
                                    <>No Changes to Save</>
                                ) : !isFormValid ? (
                                    <><AlertCircle size={18} /> Fix Errors to Save</>
                                ) : (
                                    <><CheckCircle size={18} /> Update Profile</>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
