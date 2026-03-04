import React, { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
    isInstallable: boolean;
    isInstalled: boolean;
    showBanner: boolean;
    isIOS: boolean;
    installApp: () => Promise<boolean>;
    dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS device
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
        }

        const manuallyDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);

            if (!manuallyDismissed && !isStandalone) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setShowBanner(false);
        });

        // For iOS, show the custom prompt if not installed and not dismissed
        if (isIosDevice && !isStandalone && !manuallyDismissed) {
            setShowBanner(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installApp = async (): Promise<boolean> => {
        if (!deferredPrompt) return false;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setIsInstallable(false);
            setShowBanner(false);
            return true;
        }
        return false;
    };

    const dismissPrompt = () => {
        localStorage.setItem('pwa_prompt_dismissed', 'true');
        setShowBanner(false);
    };

    return (
        <PWAContext.Provider value={{ isInstallable, isInstalled, showBanner, isIOS, installApp, dismissPrompt }}>
            {children}
        </PWAContext.Provider>
    );
}

export function usePWA() {
    const context = useContext(PWAContext);
    if (context === undefined) {
        throw new Error('usePWA must be used within a PWAProvider');
    }
    return context;
}
