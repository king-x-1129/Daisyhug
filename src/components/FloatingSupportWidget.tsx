import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SupportSettings } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_SUPPORT_SETTINGS } from '@/pages/admin/SupportWidgetSettings';
import {
  MessageCircle,
  X,
  Phone,
  Mail,
  Send,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ChevronUp,
} from 'lucide-react';

export function FloatingSupportWidget() {
  const location = useLocation();
  const { user, profile, isReseller, isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SupportSettings>(DEFAULT_SUPPORT_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Real-time synchronization with Firestore settings/support
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'support'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings({ ...DEFAULT_SUPPORT_SETTINGS, ...snapshot.data() } as SupportSettings);
        } else {
          setSettings(DEFAULT_SUPPORT_SETTINGS);
        }
      },
      (err) => {
        console.warn('FloatingSupportWidget: using fallback settings', err);
      }
    );

    return () => unsub();
  }, []);

  // Close widget when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Hide widget completely on admin management routes to prevent UI obstruction
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/super-admin';
  if (isAdminRoute) {
    return null;
  }

  // If support widget is globally disabled, do not render
  if (!settings.enabled) {
    return null;
  }

  // Audience Visibility Enforcement
  // 1. If user is a verified reseller:
  //    - Check settings.showToResellers (or allow if admin)
  // 2. If user is customer or guest:
  //    - Check settings.showToCustomers (or allow if admin)
  if (!authLoading) {
    if (isReseller) {
      if (!settings.showToResellers && !isAdmin) return null;
    } else {
      if (!settings.showToCustomers && !isAdmin) return null;
    }
  }

  // Clean WhatsApp phone number (digits only, e.g. 923001234567)
  const cleanPhone = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');

  // Build the context-aware WhatsApp URL
  const resellerId = user?.uid || profile?.uid || 'RES-UNKNOWN';
  const resellerName = profile?.fullName || user?.displayName || 'Reseller';
  const customerName = profile?.fullName || user?.displayName || 'Valued Customer';
  const storeName = (profile as unknown as { storeName?: string })?.storeName || 'DaisyHug Store';

  let customText = '';
  if (isReseller) {
    customText = (settings.resellerMessageTemplate || DEFAULT_SUPPORT_SETTINGS.resellerMessageTemplate)
      .replace(/{resellerId}/g, resellerId)
      .replace(/{resellerName}/g, resellerName)
      .replace(/{resellerEmail}/g, user?.email || '')
      .replace(/{storeName}/g, storeName);
  } else {
    customText = (settings.customerMessageTemplate || DEFAULT_SUPPORT_SETTINGS.customerMessageTemplate)
      .replace(/{customerName}/g, customerName)
      .replace(/{customerEmail}/g, user?.email || '');
  }

  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customText)}`
    : '';

  const positionClasses =
    settings.widgetPosition === 'bottom-left'
      ? 'left-4 sm:left-6 items-start'
      : 'right-4 sm:right-6 items-end';

  return (
    <div
      ref={widgetRef}
      className={`fixed bottom-4 sm:bottom-6 z-50 flex flex-col pointer-events-auto ${positionClasses}`}
      aria-label="Customer Support Widget"
    >
      {/* Expanded Support Card */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Close Support"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
              </span>
              <span className="text-xs font-semibold tracking-wide uppercase text-emerald-100">
                Online Support
              </span>
            </div>
            <h3 className="font-bold text-lg text-white">
              {settings.widgetTitle || 'Need Help? Chat With Us'}
            </h3>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              {settings.widgetSubtitle || 'Quick response via WhatsApp & customer care'}
            </p>

            {/* Role indicator pill */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/20 text-white backdrop-blur-sm">
              {isReseller ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Reseller Priority • ID: <strong className="font-mono text-amber-200">{resellerId.slice(0, 8)}...</strong></span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Customer Support Desk</span>
                </>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
            {/* Primary Action: WhatsApp */}
            {cleanPhone ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Chat on WhatsApp</div>
                    <div className="text-xs text-emerald-100">
                      {isReseller ? 'Auto-attaches Reseller ID' : 'Direct Agent Response'}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>
            ) : (
              <div className="p-3 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                WhatsApp number is currently being configured by the admin team.
              </div>
            )}

            {/* Auto Message Preview Box for Transparency */}
            {isReseller && customText && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Reseller Verification Payload
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
                  &ldquo;{customText}&rdquo;
                </p>
              </div>
            )}

            {/* Secondary Support Channels */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Other Ways to Reach Us
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {settings.phoneNumber && (
                  <a
                    href={`tel:${settings.phoneNumber}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors text-xs font-medium border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Direct Phone Support</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">{settings.phoneNumber}</span>
                  </a>
                )}

                {settings.supportEmail && (
                  <a
                    href={`mailto:${settings.supportEmail}?subject=Support Request from ${isReseller ? `Reseller ${resellerId}` : 'DaisyHug Shopper'}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors text-xs font-medium border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Email Support</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-[140px]">
                      {settings.supportEmail}
                    </span>
                  </a>
                )}

                {settings.telegramUrl && (
                  <a
                    href={settings.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors text-xs font-medium border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Send className="w-4 h-4 text-sky-500" />
                      <span>Telegram Channel</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}

                {settings.messengerUrl && (
                  <a
                    href={settings.messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors text-xs font-medium border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5">
                      <HelpCircle className="w-4 h-4 text-indigo-500" />
                      <span>Facebook Messenger</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center p-3.5 sm:p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
        aria-expanded={isOpen}
        title={isOpen ? 'Close Support' : 'Open WhatsApp Support'}
      >
        {/* Pulsing indicator ring */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
        </span>

        {isOpen ? (
          <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 fill-current animate-bounce sm:animate-none" />
            <span className="hidden sm:inline font-bold text-sm tracking-wide pr-1">
              {isReseller ? 'Reseller Help' : 'Support'}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
