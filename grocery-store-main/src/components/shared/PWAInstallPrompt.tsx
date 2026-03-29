import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

export function PWAInstallPrompt() {
    const { showBanner, isIOS, isInstallable, installApp, dismissPrompt } = usePWA();

    if (!showBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="fixed bottom-0 left-0 right-0 z-[200] p-4 pointer-events-none"
            >
                <div className="max-w-md mx-auto bg-card border border-border/50 shadow-2xl rounded-t-3xl rounded-b-xl p-6 pointer-events-auto backdrop-blur-xl relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                    <button
                        onClick={dismissPrompt}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-foreground/5 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                            <Download size={24} className="text-white" />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-lg font-bold text-foreground mb-1">Install App</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                {isIOS ?
                                    "Install this app on your iPhone for quick access and offline use." :
                                    "Install this app on your device for a better, faster offline experience."}
                            </p>

                            {isIOS ? (
                                <div className="bg-foreground/5 rounded-xl p-3 text-sm">
                                    <p className="flex items-center gap-2 mb-2 font-medium">
                                        1. Tap <Share size={16} className="text-emerald-500" /> in your browser
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        2. Scroll and tap <span className="bg-background px-2 py-0.5 rounded text-xs font-bold border border-border shadow-sm">Add to Home Screen</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {isInstallable && (
                                        <button
                                            onClick={installApp}
                                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            Install Now
                                        </button>
                                    )}
                                    <button
                                        onClick={dismissPrompt}
                                        className="flex-1 py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-bold transition-colors active:scale-95"
                                    >
                                        Not Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
