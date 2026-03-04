import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout/Layout';
import { DashboardOverview } from './components/Dashboard/Overview';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Info, Key, Check, Mail, Phone, ShieldCheck, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { SalesDashboard } from './components/Dashboard/Sales';
import { PurchasesDashboard } from './components/Dashboard/Purchases';
import { ExpensesDashboard } from './components/Dashboard/Expenses';
import { KhataDashboard } from './components/Dashboard/Khata';
import { AddSaleModal } from './components/modals/AddSaleModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { Store, User } from 'lucide-react';
import { db, Settings } from '@/db/db';
import { useSQLiteQuery } from './db/hooks';
import { notify } from './utils/notify';
import { initDB } from './db/sqlite';
import { sendEmail } from './utils/smtpService';
import { Portal3D } from './components/shared/Portal3D';
import { PWAProvider } from './context/PWAContext';
import { QuantumLoader } from './components/shared/QuantumLoader';
import { PWAInstallPrompt } from './components/shared/PWAInstallPrompt';


type View = 'dashboard' | 'sales' | 'purchases' | 'expenses' | 'khata';

// ── Hashing Utility ──
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function AppContent() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('gs_is_logged_in') === 'true');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [notifications, setNotifications] = useState<{ id: number, message: string, type: 'success' | 'info' }[]>([]);

  // Setup form state
  const [setupData, setSetupData] = useState({
    store_name: '',
    store_owner: '',
    email: '',
    phone: '',
    pin: '',
  });
  const [showSetupSuccess, setShowSetupSuccess] = useState(false);

  // Email Recovery State
  const [emailSent, setEmailSent] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isUrlRecovery, setIsUrlRecovery] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    initDB().then(() => setDbInitialized(true)).catch(console.error);
  }, []);

  const settings = useSQLiteQuery(async () => {
    if (!dbInitialized) return undefined;
    return await (await db.settings.toCollection()).first();
  }, [dbInitialized]);

  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState({ key: '', newPin: '', confirmPin: '' });

  useEffect(() => {
    if (forgotPinMode && settings && !recoveryEmail) {
      setRecoveryEmail(settings.email);
    }
  }, [forgotPinMode, settings]);

  // Listen for Recovery Link on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('recover');
    const storedToken = localStorage.getItem('recovery_token');
    const expiry = localStorage.getItem('recovery_expiry');

    if (token && storedToken && token === storedToken) {
      if (expiry && Date.now() < parseInt(expiry)) {
        setIsUrlRecovery(true);
        setForgotPinMode(true);
        notify('Link verified! Please set your new PIN.', 'success');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        notify('Recovery link has expired.', 'info');
        localStorage.removeItem('recovery_token');
        localStorage.removeItem('recovery_expiry');
      }
    }
  }, []);

  // Modal states
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  useEffect(() => {
    (window as any).openAddSale = () => setIsSaleModalOpen(true);
    (window as any).openAddExpense = () => setIsExpenseModalOpen(true);
  }, []);

  const addNotification = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const handleNotify = (e: any) => {
      addNotification(e.detail.message, e.detail.type);
    };
    window.addEventListener('app-notify', handleNotify);
    return () => window.removeEventListener('app-notify', handleNotify);
  }, []);

  // Fallback timer to stop loading if DB hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        // If settings is still undefined after 5s, we force check
        if (settings === undefined) {
          setIsSetupMode(true);
        }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading, settings]);

  useEffect(() => {
    if (settings !== undefined) {
      if (!settings) {
        setIsSetupMode(true);
      } else {
        setIsSetupMode(false);
      }
      setIsLoading(false);
    }
  }, [settings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) {
      notify('Store settings not loaded. Please wait.', 'info');
      const coll = await db.settings.toCollection();
      const currentSettings = await coll.first();
      if (!currentSettings) {
        setIsSetupMode(true);
        return;
      }
    }

    const inputIdentifier = loginData.username.trim(); // This will now be email or phone
    const trimmedInputPin = loginData.password.trim();

    // Hash the input pin to compare with stored hash
    const hashedInputPin = await hashPin(trimmedInputPin);

    // Verify against Email OR Phone
    const isIdentifierMatch = settings && (
      inputIdentifier.toLowerCase() === settings.email.toLowerCase() ||
      inputIdentifier === settings.phone
    );

    if (settings && isIdentifierMatch && hashedInputPin === settings.pin) {
      localStorage.setItem('gs_is_logged_in', 'true');
      setIsLoggedIn(true);
      notify('Welcome back!', 'success');
    } else {
      notify('Invalid credentials. Please check your Email/Phone and PIN.', 'info');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData.store_name.trim() || !setupData.pin.trim() || !setupData.email.trim() || !setupData.phone.trim()) {
      notify('All fields are required.', 'info');
      return;
    }

    if (setupData.phone.trim().length !== 10) {
      notify('Please enter a valid 10-digit phone number.', 'info');
      return;
    }

    setIsLoading(true);

    // Hash the PIN before saving
    const hashedPin = await hashPin(setupData.pin.trim());

    const newSettings: Settings = {
      store_name: setupData.store_name.trim(),
      store_owner: setupData.store_owner.trim(),
      email: setupData.email.trim(),
      phone: setupData.phone.trim(),
      pin: hashedPin,
      logo_letter: setupData.store_name.trim()[0].toUpperCase(),
      theme_color: '#3b82f6',
      is_setup_complete: true,
    };

    try {
      await db.settings.add(newSettings);
      setShowSetupSuccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Setup failed:', err);
      setIsLoading(false);
      notify('Failed to save settings. Please try again.', 'info');
    }
  };

  const generateToken = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSendRecoveryEmail = async () => {
    if (!recoveryEmail) {
      notify('Email required for recovery.', 'info');
      return;
    }

    setIsLoading(true);
    const token = generateToken();
    const expiry = Date.now() + 3600000; // 1 hour

    localStorage.setItem('recovery_token', token);
    localStorage.setItem('recovery_expiry', expiry.toString());

    const recoveryLink = `${window.location.origin}${window.location.pathname}?recover=${token}`;

    // Always log to console as emergency fallback
    console.log('--- EMERGENCY RECOVERY LINK ---');
    console.log(recoveryLink);
    console.log('-------------------------------');

    const logoLetter = settings?.logo_letter || 'K';
    const brandColor = (settings?.theme_color || '#2563eb').replace('#', '');
    const avatarUrl = `https://ui-avatars.com/api/?name=${logoLetter}&background=${brandColor}&color=fff&size=128&bold=true`;

    const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f0f4f8; color: #1e293b; margin: 0; padding: 40px 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
          .banner { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 60px 40px; text-align: center; color: white; }
          .logo-wrapper { background: rgba(255,255,255,1); width: 80px; height: 80px; border-radius: 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-bottom: 20px; }
          .logo { width: 56px; height: 56px; border-radius: 12px; }
          .title { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.025em; color: white; }
          .body-content { padding: 40px; text-align: center; background: white; }
          .message { line-height: 1.8; color: #475569; font-size: 17px; margin-bottom: 32px; font-weight: 500; }
          .btn { background: linear-gradient(to right, #2563eb, #7c3aed); color: #ffffff !important; font-weight: 800; padding: 20px 40px; border-radius: 20px; text-decoration: none; display: inline-block; box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.2); font-size: 16px; letter-spacing: 0.5px; }
          .security-box { background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 24px; border-radius: 24px; margin-top: 32px; text-align: left; }
          .security-title { font-size: 12px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .security-text { font-size: 14px; color: #94a3b8; margin: 0; }
          .footer { padding: 32px; text-align: center; font-size: 13px; color: #94a3b8; font-weight: 600; background: #fafafa; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="banner">
            <div class="logo-wrapper">
              <img src="${avatarUrl}" class="logo" alt="Logo">
            </div>
            <h1 class="title">${settings?.store_name || 'Store'}</h1>
          </div>
          <div class="body-content">
            <p class="message">Security Alert: A request was made to refresh your store's security PIN. Click the button below to restore access.</p>
            <a href="${recoveryLink}" class="btn">RESTORE MY ACCESS</a>
            <div class="security-box">
              <p class="security-title">Important Note</p>
              <p class="security-text">This link is only valid for 1 hour. If you didn't request this, please secure your account immediately.</p>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${settings?.store_name} &bull; Premium Secure POS
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await sendEmail({
        To: recoveryEmail,
        Subject: `PIN Recovery: ${settings?.store_name || 'Your Store'}`,
        Body: emailTemplate
      });

      if (response === 'OK') {
        setEmailSent(true);
        notify(`Recovery link sent to ${recoveryEmail}! Check your inbox.`, 'success');
      } else {
        notify(`Email failed: ${response}`, 'info');
        console.error('SMTP Error:', response);
      }
    } catch (err: any) {
      console.error('Email Exception:', err);
      notify('Service unavailable. Recovery link has been logged to console.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (recoveryInput.newPin !== recoveryInput.confirmPin) {
      notify('PINs do not match. Please re-enter.', 'info');
      return;
    }

    setIsLoading(true);
    const hashed = await hashPin(recoveryInput.newPin.trim());

    // Check if new PIN is same as old PIN
    if (hashed === settings.pin) {
      notify('New PIN must be different from current PIN.', 'info');
      setIsLoading(false);
      return;
    }

    await db.settings.update(settings.id!, { pin: hashed });

    // Cleanup recovery state
    localStorage.removeItem('recovery_token');
    localStorage.removeItem('recovery_expiry');

    setTimeout(() => {
      setForgotPinMode(false);
      setEmailSent(false);
      setIsUrlRecovery(false);
      setRecoveryInput({ key: '', newPin: '', confirmPin: '' });
      setIsLoading(false);
      notify('PIN reset successful! Please sign in.', 'success');
    }, 1000);
  };


  const handleLogout = () => {
    localStorage.removeItem('gs_is_logged_in');
    setIsLoggedIn(false);
    setLoginData({ username: '', password: '' });
    notify('Logged out successfully.', 'info');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardOverview />;
      case 'sales': return <SalesDashboard />;
      case 'purchases': return <PurchasesDashboard />;
      case 'expenses': return <ExpensesDashboard />;
      case 'khata': return <KhataDashboard />;
      default: return <DashboardOverview />;
    }
  };

  if (isLoading) {
    return <QuantumLoader />;
  }

  return (
    <>
      {isLoggedIn ? (
        <Layout
          activeView={activeView}
          onViewChange={setActiveView}
          storeName={settings?.store_name || 'Store'}
          logoLetter={settings?.logo_letter || 'K'}
          onLogout={handleLogout}
          handleSendRecoveryEmail={handleSendRecoveryEmail}
        >
          {renderView()}

          <AddSaleModal
            isOpen={isSaleModalOpen}
            onClose={() => setIsSaleModalOpen(false)}
            onSuccess={(msg) => notify(msg, 'success')}
          />

          <AddExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onSuccess={(msg) => notify(msg, 'success')}
          />
        </Layout>
      ) : isSetupMode ? (
        <AuthWrapper settings={settings}>
          <SetupView
            setupData={setupData}
            setSetupData={setSetupData}
            handleSetup={handleSetup}
            showSetupSuccess={showSetupSuccess}
            showPin={showPin}
            setShowPin={setShowPin}
            onFinish={() => {
              setIsSetupMode(false);
              setShowSetupSuccess(false);
            }}
          />
        </AuthWrapper>
      ) : (
        <AuthWrapper settings={settings}>
          <LoginView
            settings={settings}
            loginData={loginData}
            setLoginData={setLoginData}
            handleLogin={handleLogin}
            forgotPinMode={forgotPinMode}
            setForgotPinMode={setForgotPinMode}
            recoveryInput={recoveryInput}
            setRecoveryInput={setRecoveryInput}
            handleResetPin={handleResetPin}
            emailSent={emailSent}
            handleSendRecoveryEmail={handleSendRecoveryEmail}
            isUrlRecovery={isUrlRecovery}
            recoveryEmail={recoveryEmail}
            setRecoveryEmail={setRecoveryEmail}
            showPin={showPin}
            setShowPin={setShowPin}
          />
        </AuthWrapper>
      )}

      {/* Global Notification Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-2xl min-w-[300px] pointer-events-auto"
            >
              {n.type === 'success' ? (
                <div className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                  <CheckCircle size={18} />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Info size={18} />
                </div>
              )}
              <p className="font-bold text-sm">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── 3D Immersive Wrappers ──

function AuthWrapper({ children }: any) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (clientY - innerHeight / 2) / (innerHeight / 2);
    setRotation({ x, y });
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-[#050608] relative overflow-hidden text-white font-inter"
      onMouseMove={handleMouseMove}
    >
      <Portal3D rotation={rotation}>
        <div className="w-full max-w-lg">
          {children}
        </div>
      </Portal3D>
    </div>
  );
}

// ── Sub-components for cleaner AppContent ──

function SetupView({
  setupData,
  setSetupData,
  handleSetup,
  showSetupSuccess,
  onFinish,
  showPin,
  setShowPin
}: any) {
  if (showSetupSuccess) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500 shadow-xl shadow-green-500/20 mb-2 text-white">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black">Success!</h2>
            <p className="text-muted-foreground mt-2 font-medium text-sm">Your store data is now secure.</p>
          </div>

          <div className="card p-6 border-green-500 bg-green-500/5 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              <p className="text-sm font-bold">Registration Complete</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your store is now registered with your phone number <span className="font-bold text-foreground">{setupData.phone}</span>.
              If you ever forget your PIN, you can reset it by receiving an
              <span className="font-bold text-foreground"> OTP</span> on this number.
            </p>
          </div>

          <button
            onClick={onFinish}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            PROCEED TO LOGIN <Check size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative preserve-3d">
      <div className="glass rounded-[2.5rem] p-8 md:p-10 shadow-3xl border border-blue-500/10 relative overflow-hidden backdrop-blur-3xl preserve-3d">
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] glass p-1 shadow-2xl mx-auto">
            <div className="h-full w-full rounded-[1.8rem] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Store className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white">Quantum Setup</h2>
            <p className="text-blue-400/30 font-black tracking-widest text-[9px] uppercase">Initialize Retail Architecture v4.2</p>
          </div>
        </div>

        <form onSubmit={handleSetup} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Store Designation</label>
            <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-0.5">
              <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
              <input
                type="text"
                required
                className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm text-white"
                placeholder="Business Name"
                value={setupData.store_name}
                onChange={(e) => setSetupData({ ...setupData, store_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Lead Administrator</label>
            <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-0.5">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
              <input
                type="text"
                className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm text-white"
                placeholder="Owner Identity"
                value={setupData.store_owner}
                onChange={(e) => setSetupData({ ...setupData, store_owner: e.target.value.replace(/\d/g, '') })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Contact Link</label>
            <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-0.5">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
              <input
                type="tel"
                required
                className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm text-white"
                placeholder="Phone Protocol"
                value={setupData.phone}
                onChange={(e) => setSetupData({ ...setupData, phone: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">System Communication Email</label>
            <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-0.5">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
              <input
                type="email"
                required
                className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm text-white"
                placeholder="admin@precision.core"
                value={setupData.email}
                onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Encryption Signature (PIN)</label>
            <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-0.5">
              <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
              <input
                type={showPin ? "text" : "password"}
                required
                className="w-full bg-transparent py-4 px-4 outline-none font-black text-3xl tracking-[0.5em] text-center text-white"
                placeholder="••••"
                value={setupData.pin}
                onChange={(e) => setSetupData({ ...setupData, pin: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/40 hover:text-blue-400"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="col-span-2 py-5 mt-4 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-black text-sm tracking-[0.3em] shadow-[0_0_50px_-10px_rgba(59,130,246,0.5)] flex items-center justify-center gap-4 active:scale-[0.97]"
          >
            BOOTSTRAP TERMINAL <ChevronRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginView({
  settings,
  loginData,
  setLoginData,
  handleLogin,
  forgotPinMode,
  setForgotPinMode,
  recoveryInput,
  setRecoveryInput,
  handleResetPin,
  emailSent,
  handleSendRecoveryEmail,
  isUrlRecovery,
  recoveryEmail,
  setRecoveryEmail,
  showPin,
  setShowPin
}: any) {

  return (
    <div className="w-full relative preserve-3d">
      {/* Multi-layered Glass Card */}
      <div className="relative group perspective-2000">
        {/* Decorative Outer Shadow Layer */}
        <div className="absolute -inset-4 bg-blue-600/10 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />

        {/* Main 3D Card Body */}
        <div className="glass rounded-[2.5rem] p-1 shadow-3xl border border-blue-500/10 relative overflow-hidden backdrop-blur-3xl preserve-3d">
          {/* Internal Reflective Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-30 pointer-events-none" />

          <div className="p-8 md:p-10 relative z-10 space-y-8">
            <div className="text-center space-y-4 mb-2">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-24 h-24 mx-auto glass rounded-[2rem] p-4 shadow-2xl relative preserve-3d"
              >
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-4xl font-black italic tracking-tighter shadow-inner transform translate-z-10">
                  {forgotPinMode ? <ShieldCheck size={40} className="text-white" /> : (settings?.logo_letter || 'S')}
                </div>
              </motion.div>

              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-2xl">
                  {forgotPinMode
                    ? (isUrlRecovery ? 'Security Override' : emailSent ? 'Portal Active' : 'Access Recovery')
                    : 'Authentication'}
                </h1>
                <p className="text-blue-400/30 font-black tracking-[0.3em] text-[10px] uppercase">
                  {forgotPinMode
                    ? 'System-Wide Secure Protocol'
                    : `Precision Engine • ${settings?.store_name || 'Retail Core'}`}
                </p>
              </div>
            </div>

            {forgotPinMode ? (
              /* Recovery Views */
              <div className="space-y-6">
                {!emailSent && !isUrlRecovery ? (
                  <div className="space-y-6 relative z-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Recovery Target</label>
                      <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-1">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20" />
                        <input
                          type="email"
                          className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm tracking-wide text-white"
                          placeholder="Verified Email Address"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSendRecoveryEmail}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-black text-sm tracking-[0.3em] shadow-[0_0_50px_-10px_rgba(59,130,246,0.6)] flex items-center justify-center gap-4 active:scale-[0.97]"
                    >
                      INITIALIZE RECOVERY
                    </button>
                  </div>
                ) : emailSent && !isUrlRecovery ? (
                  <div className="text-center space-y-6 py-6 relative z-10 animate-in fade-in zoom-in-95">
                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-100">Verification dispatched to:</p>
                        <p className="text-lg font-black text-white">{recoveryEmail}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-400/30 leading-relaxed font-medium italic">Please authorize the request via the email link.</p>
                  </div>
                ) : (
                  <form onSubmit={handleResetPin} className="space-y-6 relative z-10">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">New Security Signature (PIN)</label>
                        <div className="relative glass border-blue-500/5 focus-within:border-green-500/50 rounded-2xl py-1">
                          <input
                            type={showPin ? "text" : "password"}
                            required
                            className="w-full bg-transparent py-4 px-4 outline-none font-black text-3xl tracking-[0.5em] text-center text-white"
                            placeholder="••••"
                            value={recoveryInput.newPin}
                            maxLength={4}
                            onChange={(e) => setRecoveryInput({ ...recoveryInput, newPin: e.target.value.replace(/\D/g, '') })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/20 hover:text-white"
                          >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-[0.2em] text-blue-400/30 uppercase ml-2">Confirm Encryption Key</label>
                        <div className="relative glass border-blue-500/5 focus-within:border-green-500/50 rounded-2xl py-1">
                          <input
                            type={showPin ? "text" : "password"}
                            required
                            className="w-full bg-transparent py-4 px-4 outline-none font-black text-3xl tracking-[0.5em] text-center text-white"
                            placeholder="••••"
                            value={recoveryInput.confirmPin}
                            maxLength={4}
                            onChange={(e) => setRecoveryInput({ ...recoveryInput, confirmPin: e.target.value.replace(/\D/g, '') })}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-800 to-green-600 hover:from-green-600 hover:to-green-500 transition-all text-white font-black text-sm tracking-[0.3em] shadow-[0_0_50px_-10px_rgba(34,197,94,0.2)] active:scale-[0.97]"
                    >
                      EXECUTE OVERRIDE
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => setForgotPinMode(false)}
                  className="w-full mt-2 text-[10px] font-black tracking-[0.3em] text-blue-400/20 hover:text-blue-400 uppercase transition-colors"
                >
                  Return to Core Authentication
                </button>
              </div>
            ) : (
              /* Login View logic */
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-[0.3em] text-blue-400/30 uppercase ml-2">Access Key</label>
                  <div className="relative group/input">
                    <div className="absolute -inset-0.5 bg-blue-500/0 group-focus-within/input:bg-blue-500/20 rounded-2xl blur-sm transition-all" />
                    <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-1 transition-all">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20 group-focus-within/input:text-blue-400 transition-colors" />
                      <input
                        type="text"
                        required
                        autoFocus
                        className="w-full bg-transparent py-4 pl-12 pr-4 outline-none font-bold text-sm tracking-wide text-white placeholder:text-white/5"
                        placeholder="Identifier (Email/Phone)"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black tracking-[0.3em] text-blue-400/30 uppercase">Secret PIN</label>
                    <button
                      type="button"
                      onClick={() => setForgotPinMode(true)}
                      className="text-[10px] font-black tracking-widest text-blue-400/60 hover:text-blue-400 transition-colors"
                    >
                      OVERRIDE
                    </button>
                  </div>
                  <div className="relative group/input">
                    <div className="absolute -inset-0.5 bg-blue-500/0 group-focus-within/input:bg-blue-500/20 rounded-2xl blur-sm transition-all" />
                    <div className="relative glass border-blue-500/5 focus-within:border-blue-500/50 rounded-2xl py-1 transition-all">
                      <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/20 group-focus-within/input:text-blue-400 transition-colors" />
                      <input
                        type={showPin ? "text" : "password"}
                        required
                        className="w-full bg-transparent py-4 pl-12 pr-12 outline-none font-bold text-sm tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-blue-500/10"
                        placeholder="••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/40 hover:text-blue-400 transition-colors"
                      >
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-black text-sm tracking-[0.3em] shadow-[0_0_50px_-10px_rgba(59,130,246,0.6)] flex items-center justify-center gap-4 active:scale-[0.97] group/btn mt-4"
                >
                  INITIALIZE COGNITION
                  <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 glass rounded-full border border-blue-500/10 opacity-40">
          <ShieldCheck size={12} className="text-blue-400" />
          <span className="text-[9px] font-black tracking-[0.4em] uppercase text-blue-100/40">
            End-to-End Quantum Encryption Active
          </span>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <PWAProvider>
        <AppContent />
        <PWAInstallPrompt />
      </PWAProvider>
    </ThemeProvider>
  );
}
