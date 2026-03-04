import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '@/context/PWAContext';
import { db } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, installApp } = usePWA();
    const [isVisible, setIsVisible] = useState(false);

    const settings = useSQLiteQuery(async () => {
        const coll = await db.settings.toCollection();
        return coll.first();
    });

    useEffect(() => {
        if (isInstallable && !isInstalled) {
            // Show banner after a short delay if it's installable
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable, isInstalled]);

    const handleInstall = async () => {
        await installApp();
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-xl p-6"
            >
                <div className="bg-card border border-blue-500/30 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center gap-6 relative w-full xl:w-1/3 max-w-sm">
                    <div className="flex flex-col flex-1 min-w-0 text-center items-center justify-center space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(37,99,235,0.8)]">
                            <Smartphone size={40} className="text-white" />
                        </div>
                        <div>
                            <p className="font-black text-2xl tracking-tight">Install {settings?.store_name || 'Store App'}</p>
                            <p className="text-sm font-medium text-muted-foreground mt-2 px-4 leading-relaxed">
                                Get the full experience. Add this to your home screen for quick access — works completely offline!
                            </p>
                        </div>
                        <div className="w-full max-w-xs mt-6">
                            <button
                                onClick={handleInstall}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black transition-all active:scale-[0.97] shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)]"
                            >
                                <Download size={20} /> ONE-CLICK INSTALL
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="w-full mt-3 py-3 rounded-xl border border-border/50 hover:bg-muted text-xs font-bold transition-all text-muted-foreground"
                            >
                                Continue Request in Browser
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
