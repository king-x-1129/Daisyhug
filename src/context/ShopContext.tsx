import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface ShopSettings {
  primaryColor: string;
  accentColor: string;
  shopName: string;
  heroTitle: string;
  heroSubtitle: string;
  logoUrl?: string;
}

const defaultSettings: ShopSettings = {
  primaryColor: '#4f46e5', // indigo-600
  accentColor: '#f43f5e', // rose-500
  shopName: 'Resellxpk',
  heroTitle: 'Blink & Buy Sponsored',
  heroSubtitle: 'Pakistan\'s Leading Reseller Platform',
};

interface ShopContextType {
  settings: ShopSettings;
  loading: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'shop'), (doc) => {
      if (doc.exists()) {
        setSettings({ ...defaultSettings, ...doc.data() });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/shop');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <ShopContext.Provider value={{ settings, loading }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
