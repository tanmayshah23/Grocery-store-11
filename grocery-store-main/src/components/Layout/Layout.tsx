import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Receipt, LogOut,
  Moon, Sun, Wifi, WifiOff, Bell, Menu, X, CreditCard,
  Plus, UserPlus, ChevronRight, Download, User, Smartphone, MessageCircle
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import { db } from '@/db/db';
import { useSQLiteQuery } from '@/db/hooks';
import { ProfileModal } from '../modals/ProfileModal';
import { usePWA } from '@/context/PWAContext';
import { AddSaleModal } from '../modals/AddSaleModal';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { AddPurchaseModal } from '../modals/AddPurchaseModal';
import { AddKhataModal } from '../modals/AddKhataModal';
import { PWAInstallBanner } from '../shared/PWAInstallBanner';
import { InstallHelpModal } from '../modals/InstallHelpModal';
import { notify } from '@/utils/notify';

type View = 'dashboard' | 'sales' | 'purchases' | 'expenses' | 'khata' | 'marketing';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  storeName: string;
  logoLetter: string;
  onLogout: () => void;
  handleSendRecoveryEmail: () => Promise<void>;
}

const menuItems = [
  { id: 'dashboard' as View, label: 'Analytics', icon: LayoutDashboard },
  { id: 'sales' as View, label: 'Sales', icon: ShoppingCart },
  { id: 'purchases' as View, label: 'Purchases', icon: Package },
  { id: 'khata' as View, label: 'Khata', icon: CreditCard },
  { id: 'expenses' as View, label: 'Expenses', icon: Receipt },
  { id: 'marketing' as View, label: 'Marketing', icon: MessageCircle },
];

export function Layout({
  children,
  activeView,
  onViewChange,
  storeName,
  logoLetter,
  onLogout,
  handleSendRecoveryEmail
}: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isKhataOpen, setIsKhataOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);


  const settings = useSQLiteQuery(async () => {
    const coll = await db.settings.toCollection();
    return coll.first();
  });


  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    (window as any).openAddSale = () => setIsSaleOpen(true);
    (window as any).openAddExpense = () => setIsExpenseOpen(true);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  /* ─── PWA Install Component ─────── */
  const PWAInstallButton = ({ collapsed }: { collapsed: boolean }) => {
    const { isInstallable, isInstalled, installApp } = usePWA();

    if (isInstalled || !isInstallable) return null;

    return (
      <button
        onClick={installApp}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-bold animate-pulse',
          collapsed && 'justify-center'
        )}
      >
        <Download size={18} className="shrink-0" />
        {!collapsed && <span className="text-xs uppercase tracking-wider">Install App</span>}
      </button>
    );
  };

  /* ─── Sidebar content (shared by desktop + mobile) ─────── */
  const SidebarContent = ({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className={cn('flex items-center gap-3 overflow-hidden transition-all', collapsed && 'opacity-0 w-0 p-0')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
            <span className="text-white font-black text-sm">{logoLetter}</span>
          </div>
          <div className="min-w-0">
            <span className="font-black text-base leading-tight block truncate text-emerald-600">{storeName}</span>
            <span className="text-[10px] text-muted-foreground font-medium">Store Management</span>
          </div>
        </div>
        {collapsed && (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 mx-auto">
            <span className="text-white font-black text-sm">{logoLetter}</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setSidebarExpanded(false)}
            className="hidden lg:flex p-2 hover:bg-muted rounded-lg shrink-0"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => { onViewChange(item.id); if (onNav) onNav(); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left',
              activeView === item.id
                ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="font-semibold text-sm">{item.label}</span>}
            {!collapsed && activeView === item.id && <ChevronRight size={14} className="ml-auto" />}
          </button>
        ))}

        {/* Profile Navigation */}
        <button
          onClick={() => { setIsProfileOpen(true); if (onNav) onNav(); }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left border border-transparent hover:border-emerald-500/30 text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-500 mt-2',
            collapsed && 'justify-center'
          )}
        >
          <User size={20} className="shrink-0" />
          {!collapsed && <span className="font-semibold text-sm">My Profile</span>}
        </button>
      </nav>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-border space-y-2 shrink-0">
        {/* Online status */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all',
          isOnline ? 'bg-green-500/10' : 'bg-amber-500/10',
          collapsed && 'justify-center'
        )}>
          {isOnline ? (
            <>
              <Wifi size={15} className="text-green-500 shrink-0" />
              {!collapsed && <span className="text-xs font-bold text-green-500">Synced</span>}
            </>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              {!collapsed && (
                <div>
                  <p className="text-xs font-bold text-amber-500">Offline</p>
                  <p className="text-[10px] text-amber-500/70">Saved locally</p>
                </div>
              )}
              {collapsed && <WifiOff size={15} className="text-amber-500 shrink-0" />}
            </>
          )}
        </div>

        {/* Manual Install Help */}
        <button
          onClick={() => setIsInstallHelpOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/5 transition-all text-left uppercase tracking-tighter',
            collapsed && 'justify-center px-0'
          )}
        >
          <Smartphone size={14} className="shrink-0" />
          {!collapsed && <span>How to Download</span>}
        </button>


        {/* PWA Install Button */}
        <PWAInstallButton collapsed={collapsed} />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors', collapsed && 'justify-center')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={onLogout}
          className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors', collapsed && 'justify-center')}
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background transition-colors duration-200 overflow-hidden">

      {/* ── MOBILE DRAWER BACKDROP ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-transform duration-300 w-72 lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent collapsed={false} onNav={() => setMobileOpen(false)} />
      </aside>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300',
        sidebarExpanded ? 'w-64' : 'w-20'
      )}>
        {sidebarExpanded ? (
          <SidebarContent collapsed={false} />
        ) : (
          <>
            <div className="flex items-center justify-center p-4 border-b border-border">
              <button
                onClick={() => setSidebarExpanded(true)}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30"
              >
                <span className="text-white font-black text-sm">{logoLetter}</span>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  title={item.label}
                  className={cn(
                    'w-full flex items-center justify-center py-3 rounded-xl transition-all',
                    activeView === item.id
                      ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon size={20} />
                </button>
              ))}

              <button
                onClick={() => setIsProfileOpen(true)}
                title="My Profile"
                className="w-full flex items-center justify-center py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <User size={20} />
              </button>
            </nav>
            <div className="p-3 border-t border-border space-y-2">
              <button onClick={() => setSidebarExpanded(true)} className="w-full flex justify-center p-2 hover:bg-muted rounded-lg">
                <Menu size={18} className="text-muted-foreground" />
              </button>

              <div className="flex justify-center">
                <PWAInstallButton collapsed={true} />
              </div>

              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full flex justify-center p-2 hover:bg-muted rounded-lg text-muted-foreground">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={onLogout} className="w-full flex justify-center p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-300',
        'lg:pl-20', // icon rail = 80px
        sidebarExpanded && 'lg:pl-64',
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 h-14 md:h-16 bg-card/90 backdrop-blur-md border-b border-border px-4 md:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold capitalize truncate">
                {activeView === 'dashboard' ? 'Store Analytics' : `${activeView.charAt(0).toUpperCase() + activeView.slice(1)} `}
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{today}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setIsSaleOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold text-xs transition-all">
              <Plus size={13} /><span className="hidden lg:inline">SALE</span><span className="lg:hidden">Sale</span>
            </button>
            <button onClick={() => setIsPurchaseOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/10 text-green-600 hover:bg-green-600 hover:text-white font-bold text-xs transition-all">
              <Package size={13} /><span className="hidden lg:inline">PURCHASE</span><span className="lg:hidden">Buy</span>
            </button>
            <button onClick={() => setIsKhataOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600/10 text-teal-600 hover:bg-teal-600 hover:text-white font-bold text-xs transition-all">
              <UserPlus size={13} />KHATA
            </button>
            <button onClick={() => setIsExpenseOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs transition-all">
              <Receipt size={13} />EXPENSE
            </button>

            <button className="relative p-1.5 rounded-full hover:bg-muted transition-colors">
              <Bell size={17} />
              {!isOnline && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full border border-card animate-pulse" />}
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 border-l border-border pl-2 md:pl-3 group hover:bg-muted/50 rounded-lg py-1 transition-colors"
            >
              <div className="text-right hidden md:block group-hover:pr-1 transition-all">
                <p className="text-xs font-bold leading-tight">Admin</p>
                <p className="text-[10px] text-muted-foreground">{storeName}</p>
              </div>
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-inner group-hover:scale-105 transition-transform">
                {logoLetter}
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto overscroll-none">
          <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
            {children}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all flex-1 max-w-[72px]',
                activeView === item.id ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              <item.icon size={20} strokeWidth={activeView === item.id ? 2.5 : 1.8} />
              <span className={cn('text-[9px] font-bold truncate w-full text-center', activeView === item.id && 'text-emerald-500')}>
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-muted-foreground flex-1 max-w-[72px]"
          >
            <User size={20} />
            <span className="text-[9px] font-bold truncate w-full text-center">Profile</span>
          </button>
          <button
            onClick={() => setIsSaleOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 max-w-[72px]"
          >
            <div className="h-8 w-8 bg-gradient-to-br from-teal-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Plus size={18} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-emerald-500 truncate">+ Sale</span>
          </button>
        </div>
      </nav>

      <AddSaleModal isOpen={isSaleOpen} onClose={() => setIsSaleOpen(false)} onSuccess={m => notify(m, 'success')} />
      <AddPurchaseModal isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} onSuccess={m => notify(m, 'success')} />
      <AddKhataModal isOpen={isKhataOpen} onClose={() => setIsKhataOpen(false)} onSuccess={m => notify(m, 'success')} />
      <AddExpenseModal isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} onSuccess={m => notify(m, 'success')} />

      <PWAInstallBanner />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        settings={settings}
        handleSendRecoveryEmail={handleSendRecoveryEmail}
      />

      <InstallHelpModal
        isOpen={isInstallHelpOpen}
        onClose={() => setIsInstallHelpOpen(false)}
      />
    </div>
  );
}
