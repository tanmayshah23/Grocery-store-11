import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Share, Download } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';

interface InstallHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InstallHelpModal({ isOpen, onClose }: InstallHelpModalProps) {
    const { isInstallable, installApp } = usePWA();
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="glass w-full max-w-md rounded-[2.5rem] shadow-3xl overflow-hidden border border-emerald-500/10"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-8 space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-[2rem] bg-gradient-to-br from-teal-600 to-emerald-400 flex items-center justify-center shadow-2xl relative">
                                <Download size={32} className="text-white" />
                                <div className="absolute inset-0 rounded-[2rem] animate-ping bg-emerald-400/20" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Quantum Deployment</h2>
                                <p className="text-xs text-emerald-300/40 font-black uppercase tracking-widest">Universal Precision v4.2</p>
                            </div>
                        </div>

                        {isInstallable ? (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                    <p className="text-sm font-bold text-emerald-100/60 leading-relaxed">
                                        Your system is compatible for native deployment. Click below to initialize installation.
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        await installApp();
                                        onClose();
                                    }}
                                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-700 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-black text-sm tracking-[0.3em] shadow-[0_0_50px_-10px_rgba(45,138,106,0.6)] flex items-center justify-center gap-4 active:scale-[0.97]"
                                >
                                    INITIALIZE INSTALL <Download size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                    <p className="text-center text-xs font-black text-emerald-400 uppercase tracking-widest">Manual Protocol Required</p>
                                    <div className="space-y-4 text-xs font-bold text-emerald-100/40 leading-relaxed">
                                        <div className="flex gap-3">
                                            <Share size={14} className="text-emerald-500 shrink-0" />
                                            <span>Desktop: Click the download icon in your address bar.</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Smartphone size={14} className="text-emerald-500 shrink-0" />
                                            <span>iOS/Android: Open Share menu and select "Add to Home Screen".</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const manifest = {
                                            app: "Tanmy store",
                                            version: "4.2.0",
                                            engine: "Quantum 3D Precision",
                                            encryption: "End-to-End active",
                                            timestamp: new Date().toISOString()
                                        };
                                        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'quantum_core_manifest.json';
                                        a.click();
                                        URL.revokeObjectURL(url);
                                        onClose();
                                    }}
                                    className="w-full py-5 rounded-2xl border border-emerald-500/20 text-emerald-400 font-black text-xs tracking-widest hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-3"
                                >
                                    DOWNLOAD QUANTUM CORE <Download size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
