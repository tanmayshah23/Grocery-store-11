import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Users, Zap, Send, Phone, UserPlus,
  CheckCircle, XCircle, Clock, Wifi, WifiOff, QrCode,
  Sparkles, Globe, FileText, Trash2, Upload, Search,
  BarChart3, ChevronDown, AlertCircle, RefreshCw, X,
  Bot, MessageSquare, Copy, Check
} from 'lucide-react';
import { io as socketIO, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3001/api';

// ─── Types ───────────────────────────────────────────────────
interface Contact {
  id: number;
  name: string;
  phone: string;
  group_name: string;
  is_active: number;
  notes?: string;
}

interface Campaign {
  id: number;
  title: string;
  message: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  created_at: number;
  completed_at?: number;
}

interface GeneratedMsg {
  id: number;
  type: string;
  message: string;
}

interface CampaignProgress {
  campaignId: number;
  current: number;
  total: number;
  sent: number;
  failed: number;
  percentage: number;
  currentContact: string;
}

type Tab = 'dashboard' | 'contacts' | 'compose' | 'campaigns';

// ─── Main Component ──────────────────────────────────────────
export function MarketingHub() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [whatsappStatus, setWhatsappStatus] = useState({ connected: false, qrCode: null as string | null });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState({ totalContacts: 0, totalCampaigns: 0, totalSent: 0, totalGroups: 0 });
  const [serverOnline, setServerOnline] = useState(false);

  // Connect Socket
  useEffect(() => {
    const s = socketIO('http://localhost:3001');

    s.on('connect', () => {
      setServerOnline(true);
    });

    s.on('disconnect', () => {
      setServerOnline(false);
    });

    s.on('whatsapp:status', (data: any) => {
      setWhatsappStatus(data);
    });

    s.on('whatsapp:qr', (qr: string) => {
      setWhatsappStatus(prev => ({ ...prev, connected: false, qrCode: qr }));
    });

    s.on('whatsapp:ready', () => {
      setWhatsappStatus({ connected: true, qrCode: null });
    });

    s.on('whatsapp:disconnected', () => {
      setWhatsappStatus({ connected: false, qrCode: null });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  // Fetch stats
  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => setServerOnline(false));
  }, [activeTab]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'compose', label: 'AI Compose', icon: Bot },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <MessageCircle className="text-emerald-500" /> Marketing Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-Powered WhatsApp Messenger — Send to 1000+ customers</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Server Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${serverOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {serverOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            Server {serverOnline ? 'Online' : 'Offline'}
          </div>
          {/* WhatsApp Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${whatsappStatus.connected ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <Phone size={14} />
            WA {whatsappStatus.connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <DashboardTab stats={stats} whatsappStatus={whatsappStatus} serverOnline={serverOnline} />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'compose' && <ComposeTab whatsappConnected={whatsappStatus.connected} socket={socket} />}
          {activeTab === 'campaigns' && <CampaignsTab socket={socket} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════
function DashboardTab({ stats, whatsappStatus, serverOnline }: any) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: stats.totalContacts, icon: Users, color: 'emerald' },
          { label: 'Campaigns Sent', value: stats.totalCampaigns, icon: Send, color: 'blue' },
          { label: 'Messages Sent', value: stats.totalSent, icon: MessageSquare, color: 'purple' },
          { label: 'Contact Groups', value: stats.totalGroups, icon: Globe, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-shadow"
          >
            <div className={`h-10 w-10 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-black">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* WhatsApp Connection */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <QrCode className="text-emerald-500" size={20} /> WhatsApp Connection
        </h3>

        {!serverOnline ? (
          <div className="text-center py-8 space-y-3">
            <WifiOff className="mx-auto text-red-400" size={48} />
            <p className="font-bold text-red-400">Backend Server is Offline</p>
            <p className="text-sm text-muted-foreground">Start the server with: <code className="bg-muted px-2 py-1 rounded text-xs font-mono">cd server && npm run dev</code></p>
          </div>
        ) : whatsappStatus.connected ? (
          <div className="text-center py-8 space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="text-green-500" size={32} />
            </div>
            <p className="font-bold text-green-500">WhatsApp Connected!</p>
            <p className="text-sm text-muted-foreground">You can now send messages to your customers</p>
          </div>
        ) : whatsappStatus.qrCode ? (
          <div className="text-center py-4 space-y-4">
            <p className="font-bold text-amber-500">Scan this QR code with WhatsApp</p>
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
              <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <p className="text-xs text-muted-foreground">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <Clock className="mx-auto text-amber-400 animate-spin" size={48} />
            <p className="font-bold text-amber-400">Waiting for QR Code...</p>
            <p className="text-sm text-muted-foreground">WhatsApp is initializing, this may take a minute</p>
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">🚀 Quick Start Guide</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Add Contacts', desc: 'Add your customer contacts manually or in bulk', icon: UserPlus },
            { step: '2', title: 'Compose Message', desc: 'Use AI to generate promotional messages', icon: Sparkles },
            { step: '3', title: 'Send Campaign', desc: 'Send to all contacts with one click', icon: Send },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-black shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS TAB
// ═══════════════════════════════════════════════════════════════
function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<{ group_name: string; count: number }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', group_name: 'General', notes: '' });
  const [bulkText, setBulkText] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/contacts`);
      const data = await res.json();
      if (data.success) setContacts(data.data);
    } catch { }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/contacts/groups`);
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch { }
  }, []);

  useEffect(() => { fetchContacts(); fetchGroups(); }, []);

  const handleAdd = async () => {
    if (!newContact.name || !newContact.phone) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (data.success) {
        setNewContact({ name: '', phone: '', group_name: 'General', notes: '' });
        setShowAdd(false);
        fetchContacts();
        fetchGroups();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Server offline');
    }
    setLoading(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setLoading(true);
    try {
      // Parse bulk text: each line = "Name, Phone" or "Name, Phone, Group"
      const lines = bulkText.trim().split('\n').filter(l => l.trim());
      const parsedContacts = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
          name: parts[0] || '',
          phone: parts[1] || '',
          group_name: parts[2] || 'General',
        };
      }).filter(c => c.name && c.phone);

      const res = await fetch(`${API_URL}/contacts/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsedContacts }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Added ${data.added} out of ${data.total} contacts!`);
        setBulkText('');
        setShowBulk(false);
        fetchContacts();
        fetchGroups();
      }
    } catch {
      alert('Server offline');
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this contact?')) return;
    await fetch(`${API_URL}/contacts/${id}`, { method: 'DELETE' });
    fetchContacts();
    fetchGroups();
  };

  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchGroup = selectedGroup === 'All' || c.group_name === selectedGroup;
    return matchSearch && matchGroup;
  });

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none font-bold"
          >
            <option value="All">All Groups ({contacts.length})</option>
            {groups.map(g => (
              <option key={g.group_name} value={g.group_name}>{g.group_name} ({g.count})</option>
            ))}
          </select>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
            <UserPlus size={16} /> Add
          </button>
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
            <Upload size={16} /> Bulk
          </button>
        </div>
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold flex items-center gap-2"><UserPlus size={16} className="text-emerald-500" /> Add Contact</h4>
                <button onClick={() => setShowAdd(false)}><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input placeholder="Name *" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  className="bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500" />
                <input placeholder="Phone (10 digits) *" value={newContact.phone} maxLength={10}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value.replace(/\D/g, '') })}
                  className="bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500" />
                <input placeholder="Group (e.g. VIP)" value={newContact.group_name} onChange={e => setNewContact({ ...newContact, group_name: e.target.value })}
                  className="bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500" />
                <button onClick={handleAdd} disabled={loading || !newContact.name || !newContact.phone}
                  className="bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all">
                  {loading ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulk && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="bg-card border border-blue-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold flex items-center gap-2"><Upload size={16} className="text-blue-500" /> Bulk Add Contacts</h4>
                <button onClick={() => setShowBulk(false)}><X size={18} /></button>
              </div>
              <p className="text-xs text-muted-foreground">Enter one contact per line: <span className="font-mono bg-muted px-1 rounded">Name, Phone, Group</span></p>
              <textarea
                rows={8}
                placeholder={'Rajesh Kumar, 9876543210, VIP\nPriya Sharma, 9123456789, Regular\nAmit Verma, 8765432109'}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm font-mono outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{bulkText.trim().split('\n').filter(l => l.trim()).length} contacts</span>
                <button onClick={handleBulkAdd} disabled={loading || !bulkText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {loading ? 'Importing...' : <><Upload size={14} /> Import All</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="font-bold text-sm">{filtered.length} contacts found</p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-muted-foreground mb-3" size={40} />
              <p className="font-bold text-muted-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first customer contact to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground">NAME</th>
                  <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground">PHONE</th>
                  <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground hidden md:table-cell">GROUP</th>
                  <th className="text-right py-3 px-4 font-bold text-xs text-muted-foreground">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">+91 {c.phone}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">{c.group_name}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSE TAB (AI Message Generator)
// ═══════════════════════════════════════════════════════════════
function ComposeTab({ whatsappConnected, socket }: { whatsappConnected: boolean; socket: Socket | null }) {
  const [product, setProduct] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [language, setLanguage] = useState('hinglish');
  const [msgType, setMsgType] = useState('offer');
  const [generated, setGenerated] = useState<GeneratedMsg[]>([]);
  const [selectedMsg, setSelectedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendTarget, setSendTarget] = useState<'all' | 'group'>('all');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<{ group_name: string; count: number }[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [sendProgress, setSendProgress] = useState<CampaignProgress | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/contacts/groups`).then(r => r.json()).then(d => {
      if (d.success) setGroups(d.data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('campaign:progress', (data: CampaignProgress) => {
      setSendProgress(data);
    });
    socket.on('campaign:complete', () => {
      setSending(false);
      setSendProgress(null);
    });
    return () => {
      socket.off('campaign:progress');
      socket.off('campaign:complete');
    };
  }, [socket]);

  const handleGenerate = async () => {
    if (!product || !price) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product, price, unit, storeName, phone: storePhone,
          language, messageType: msgType, count: 4,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGenerated(data.data);
        setSelectedMsg(data.data[0]?.message || '');
      }
    } catch {
      alert('Server offline. Please start the backend server.');
    }
    setLoading(false);
  };

  const handleSendCampaign = async () => {
    if (!selectedMsg || !whatsappConnected) return;
    setSending(true);

    try {
      const body: any = {
        title: `${product} ${msgType}`,
        message: selectedMsg,
      };
      if (sendTarget === 'group' && selectedGroup) {
        body.groupName = selectedGroup;
      }

      const res = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error);
        setSending(false);
      }
    } catch {
      alert('Failed to start campaign');
      setSending(false);
    }
  };

  const copyToClipboard = (msg: string, id: number) => {
    navigator.clipboard.writeText(msg);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-5">
          <Sparkles className="text-emerald-500" size={20} />
          AI Message Generator
          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full ml-2">FREE</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Product Name *</label>
            <input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Wheat, Atta, Rice"
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Price (₹) *</label>
            <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 450"
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none font-bold">
              <option value="kg">per kg</option>
              <option value="litre">per litre</option>
              <option value="packet">per packet</option>
              <option value="piece">per piece</option>
              <option value="dozen">per dozen</option>
              <option value="quintal">per quintal</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Store Name</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Your Store Name"
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Store Phone</label>
            <input value={storePhone} onChange={e => setStorePhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" maxLength={10}
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-emerald-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3 text-sm outline-none font-bold">
              <option value="hinglish">Hinglish (Hindi+English)</option>
              <option value="hindi">Hindi (हिंदी)</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>

        {/* Message Type */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { id: 'offer', label: '🔥 Offer', },
            { id: 'arrival', label: '🆕 New Arrival', },
            { id: 'festival', label: '🎊 Festival Special', },
            { id: 'reminder', label: '📢 Reminder', },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setMsgType(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                msgType === t.id ? 'bg-emerald-600 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !product || !price}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generating...' : 'Generate AI Messages'}
        </button>
      </div>

      {/* Generated Messages */}
      {generated.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Bot className="text-emerald-500" size={18} />
            Generated Messages — Pick one to send
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {generated.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-card border-2 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedMsg === msg.message ? 'border-emerald-500 shadow-emerald-500/10' : 'border-border'
                }`}
                onClick={() => setSelectedMsg(msg.message)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                    {msg.type}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(msg.message, msg.id); }}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      {copied === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                    {selectedMsg === msg.message && <CheckCircle size={18} className="text-emerald-500" />}
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground">{msg.message}</pre>
              </motion.div>
            ))}
          </div>

          {/* Custom Edit */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <label className="text-sm font-bold flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" /> Edit Selected Message (or write your own)
            </label>
            <textarea
              value={selectedMsg}
              onChange={e => setSelectedMsg(e.target.value)}
              rows={6}
              className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm outline-none focus:border-emerald-500 resize-none transition-all"
            />
          </div>

          {/* Send Campaign */}
          <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold flex items-center gap-2">
              <Send size={16} className="text-emerald-500" /> Send Campaign
            </h4>

            {!whatsappConnected && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-xl text-sm text-amber-500 font-medium">
                <AlertCircle size={16} /> Connect WhatsApp first (go to Dashboard tab)
              </div>
            )}

            <div className="flex gap-3 items-center flex-wrap">
              <select
                value={sendTarget}
                onChange={e => setSendTarget(e.target.value as 'all' | 'group')}
                className="bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none font-bold"
              >
                <option value="all">All Contacts</option>
                <option value="group">Specific Group</option>
              </select>

              {sendTarget === 'group' && (
                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none font-bold"
                >
                  <option value="">Select Group</option>
                  {groups.map(g => (
                    <option key={g.group_name} value={g.group_name}>{g.group_name} ({g.count})</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSendCampaign}
                disabled={sending || !selectedMsg || !whatsappConnected}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Sending...' : 'Start Sending'}
              </button>
            </div>

            {/* Progress Bar */}
            {sendProgress && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Sending to: {sendProgress.currentContact}</span>
                  <span>{sendProgress.current}/{sendProgress.total} ({sendProgress.percentage}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${sendProgress.percentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-500 font-bold">✓ Sent: {sendProgress.sent}</span>
                  <span className="text-red-500 font-bold">✕ Failed: {sendProgress.failed}</span>
                  <span className="text-muted-foreground">Remaining: {sendProgress.total - sendProgress.current}</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS TAB
// ═══════════════════════════════════════════════════════════════
function CampaignsTab({ socket }: { socket: Socket | null }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/campaigns`)
      .then(r => r.json())
      .then(d => { if (d.success) setCampaigns(d.data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('campaign:complete', () => {
      // Refresh campaigns
      fetch(`${API_URL}/campaigns`)
        .then(r => r.json())
        .then(d => { if (d.success) setCampaigns(d.data); });
    });
    return () => { socket.off('campaign:complete'); };
  }, [socket]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-500">Completed</span>;
      case 'sending': return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 animate-pulse">Sending</span>;
      case 'error': return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/10 text-red-500">Error</span>;
      default: return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Campaign History</h3>
        <button onClick={() => {
          fetch(`${API_URL}/campaigns`).then(r => r.json()).then(d => { if (d.success) setCampaigns(d.data); });
        }} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="mx-auto text-emerald-500 animate-spin" size={32} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Send className="mx-auto text-muted-foreground mb-3" size={48} />
          <p className="font-bold text-muted-foreground">No campaigns yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first campaign from the AI Compose tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold">{c.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {getStatusBadge(c.status)}
              </div>

              <div className="flex gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground">Total:</span>{' '}
                  <span className="font-bold">{c.total_contacts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sent:</span>{' '}
                  <span className="font-bold text-green-500">{c.sent_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed:</span>{' '}
                  <span className="font-bold text-red-500">{c.failed_count}</span>
                </div>
              </div>

              {c.status === 'completed' && c.total_contacts > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                      style={{ width: `${Math.round((c.sent_count / c.total_contacts) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round((c.sent_count / c.total_contacts) * 100)}% delivered</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
