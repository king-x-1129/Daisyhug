import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SupportSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MessageCircle,
  Phone,
  Mail,
  Send,
  Save,
  ExternalLink,
  Users,
  ShoppingBag,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Check,
  RefreshCw,
  Radio,
} from 'lucide-react';

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  enabled: true,
  whatsappNumber: '923001234567',
  supportEmail: 'support@daisyhug.com',
  messengerUrl: '',
  telegramUrl: '',
  phoneNumber: '03001234567',
  showToCustomers: true,
  showToResellers: true,
  customerMessageTemplate: 'Hello DaisyHug Support, I need help with an order/product.',
  resellerMessageTemplate: 'Hello DaisyHug Support, I am Reseller ID: {resellerId} ({resellerName}). I need assistance with my portal/orders.',
  widgetPosition: 'bottom-right',
  widgetTitle: 'Need Help? Chat With Us',
  widgetSubtitle: 'Online support for customers and resellers',
};

export function SupportWidgetSettings() {
  const [settings, setSettings] = useState<SupportSettings>(DEFAULT_SUPPORT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'support');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SUPPORT_SETTINGS, ...snap.data() } as SupportSettings);
        }
      } catch (err) {
        console.error('Error loading support settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload: SupportSettings = {
        ...settings,
        whatsappNumber: settings.whatsappNumber.replace(/[^0-9]/g, ''),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'settings', 'support'), payload, { merge: true });
      setSettings(payload);
      toast.success('WhatsApp & Support settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to save support settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Build clean previews for WhatsApp
  const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '') || '923001234567';

  const previewCustomerText = settings.customerMessageTemplate || '';
  const customerWhatsAppUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(previewCustomerText)}`;

  const mockResellerId = 'usr_res_88392';
  const mockResellerName = 'Ali Hassan (Alpha Reseller)';
  const previewResellerText = (settings.resellerMessageTemplate || '')
    .replace('{resellerId}', mockResellerId)
    .replace('{resellerName}', mockResellerName)
    .replace('{resellerEmail}', 'ali.reseller@example.com')
    .replace('{resellerPhone}', '0301-7654321');
  const resellerWhatsAppUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(previewResellerText)}`;

  const insertTag = (tag: string) => {
    setSettings((prev) => ({
      ...prev,
      resellerMessageTemplate: `${prev.resellerMessageTemplate} ${tag}`,
    }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="font-semibold text-sm">Loading Support Widget Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2.5">
            <MessageCircle className="w-8 h-8 text-emerald-500" />
            <span>WhatsApp & Support Manager</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure contact channels, granular audience visibility (Customers vs. Resellers), and auto-tagged message templates.
          </p>
        </div>

        <Button
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </Button>
      </div>

      {/* Master Toggle Banner */}
      <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:to-indigo-950/40 border border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
              settings.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
            }`}>
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Floating Support Widget Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {settings.enabled
                  ? 'Widget is ACTIVE on storefront according to audience rules below.'
                  : 'Widget is DISABLED globally across the entire platform.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
            <span className="ml-3 text-sm font-bold text-slate-900 dark:text-white">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Primary Channels & Templates */}
          <div className="lg:col-span-8 space-y-8">
            {/* Primary Channels Card */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/80 dark:bg-slate-950 p-6 border-b dark:border-slate-800">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Support Channel Credentials</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Connect your business contact numbers and direct support channels.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <MessageCircle className="w-4 h-4" /> Official WhatsApp Number
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">With Country Code</span>
                    </Label>
                    <Input
                      id="whatsapp"
                      required
                      placeholder="923001234567"
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Format: <code className="font-bold text-slate-800 dark:text-slate-200">923001234567</code> (no spaces, dashes, or plus signs).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Mail className="w-4 h-4" /> Support Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="support@daisyhug.com"
                      value={settings.supportEmail || ''}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Used for formal inquiries and escalated ticket replies.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Phone className="w-4 h-4" /> Direct Calling Phone Number
                    </Label>
                    <Input
                      id="phone"
                      placeholder="0300-1234567"
                      value={settings.phoneNumber || ''}
                      onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Direct hotline for urgent queries or riders.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sky-500">
                      <Send className="w-4 h-4" /> Telegram Channel / Username
                    </Label>
                    <Input
                      id="telegram"
                      placeholder="https://t.me/daisyhug_support"
                      value={settings.telegramUrl || ''}
                      onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Optional direct telegram handle or community group.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Message Templates Card */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/80 dark:bg-slate-950 p-6 border-b dark:border-slate-800">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Custom WhatsApp Message Templates</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Define automated pre-filled messages when customers or registered resellers open WhatsApp.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Customer Template */}
                <div className="space-y-2">
                  <Label htmlFor="customer_template" className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <ShoppingBag className="w-4 h-4 text-indigo-500" /> Retail Customer Greeting Template
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Pre-filled in WhatsApp chat</span>
                  </Label>
                  <Textarea
                    id="customer_template"
                    rows={2}
                    value={settings.customerMessageTemplate}
                    onChange={(e) => setSettings({ ...settings, customerMessageTemplate: e.target.value })}
                    className="rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    placeholder="Hello DaisyHug Support, I need help with an order/product."
                  />
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[80%]">
                      Preview: <em>"{previewCustomerText}"</em>
                    </span>
                    <a
                      href={customerWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0"
                    >
                      <span>Test</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Reseller Template with Auto-Attached Tags */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label htmlFor="reseller_template" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Users className="w-4 h-4 text-purple-500" /> Reseller Partner Message Template
                    </Label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                      Auto-Attaches Reseller ID
                    </span>
                  </div>

                  <Textarea
                    id="reseller_template"
                    rows={3}
                    value={settings.resellerMessageTemplate}
                    onChange={(e) => setSettings({ ...settings, resellerMessageTemplate: e.target.value })}
                    className="rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    placeholder="Hello DaisyHug Support, I am Reseller ID: {resellerId} ({resellerName}). I need assistance with..."
                  />

                  {/* Insertable dynamic tags */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span className="text-slate-400 text-[11px] font-semibold">Click to insert tag:</span>
                    {['{resellerId}', '{resellerName}', '{resellerEmail}', '{resellerPhone}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs flex items-center justify-between">
                    <span className="text-purple-900 dark:text-purple-300 truncate max-w-[80%]">
                      Resolved Live Preview: <em>"{previewResellerText}"</em>
                    </span>
                    <a
                      href={resellerWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 shrink-0"
                    >
                      <span>Test</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (4 cols): Granular Visibility & Layout */}
          <div className="lg:col-span-4 space-y-6">
            {/* Audience Visibility Toggles */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/80 dark:bg-slate-950 p-6 border-b dark:border-slate-800">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Audience Visibility Rules</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Decide who sees the floating support widget.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Show to Customers Toggle */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <span>Show to Customers</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Storefront visitors, shoppers & guests
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.showToCustomers}
                      onChange={(e) => setSettings({ ...settings, showToCustomers: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Show to Resellers Toggle */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Show to Resellers</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Registered & verified resellers
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.showToResellers}
                      onChange={(e) => setSettings({ ...settings, showToResellers: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Widget Position & Titles */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/80 dark:bg-slate-950 p-6 border-b dark:border-slate-800">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Widget Appearance & Layout</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Screen Position
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, widgetPosition: 'bottom-right' })}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        settings.widgetPosition === 'bottom-right'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>Bottom Right</span>
                      <span className="text-[10px] text-slate-400">(Standard)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, widgetPosition: 'bottom-left' })}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        settings.widgetPosition === 'bottom-left'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>Bottom Left</span>
                      <span className="text-[10px] text-slate-400">(Alternative)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget_title" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Widget Popup Title
                  </Label>
                  <Input
                    id="widget_title"
                    value={settings.widgetTitle || ''}
                    onChange={(e) => setSettings({ ...settings, widgetTitle: e.target.value })}
                    className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    placeholder="Need Help? Chat With Us"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget_subtitle" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Widget Popup Subtitle
                  </Label>
                  <Input
                    id="widget_subtitle"
                    value={settings.widgetSubtitle || ''}
                    onChange={(e) => setSettings({ ...settings, widgetSubtitle: e.target.value })}
                    className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    placeholder="Online support for customers and resellers"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-13 shadow-xl shadow-emerald-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
