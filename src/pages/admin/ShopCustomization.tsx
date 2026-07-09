import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Palette, Layout, Type, Save, Image as ImageIcon } from 'lucide-react';

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

export function ShopCustomization() {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'shop');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching shop settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'shop'), settings);
      toast.success('Shop settings updated successfully');
      // Force a reload of the app to apply theme changes if necessary, 
      // or use a context provider to broadcast changes.
    } catch (error) {
      toast.error('Failed to update shop settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Shop Customization</h1>
          <p className="text-slate-500 font-medium">Personalize the look and feel of your marketplace</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 rounded-xl h-12 shadow-lg shadow-indigo-100"
        >
          {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding Section */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Layout className="w-5 h-5 text-indigo-600" />
              Branding & Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Name</Label>
              <Input 
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo URL</Label>
              <div className="flex gap-4">
                <Input 
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/30 flex-1"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Colors */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Theme Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Color</Label>
                <div className="flex gap-3">
                  <Input 
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-12 h-12 p-1 rounded-xl border-slate-200 cursor-pointer"
                  />
                  <Input 
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/30 flex-1 font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accent Color</Label>
                <div className="flex gap-3">
                  <Input 
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-12 h-12 p-1 rounded-xl border-slate-200 cursor-pointer"
                  />
                  <Input 
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/30 flex-1 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hero Section Content */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden lg:col-span-2">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Type className="w-5 h-5 text-indigo-600" />
              Shop Content (Hero Section)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hero Title</Label>
                <Input 
                  value={settings.heroTitle}
                  onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hero Subtitle</Label>
                <Input 
                  value={settings.heroSubtitle}
                  onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="mt-12">
        <h2 className="text-xl font-black text-slate-900 mb-6">Live Preview (Mockup)</h2>
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.primaryColor }}>
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900">{settings.shopName}</span>
          </div>
          <div className="space-y-4">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{settings.heroTitle}</h3>
            <p className="text-slate-500 font-medium text-lg">{settings.heroSubtitle}</p>
            <Button className="font-black px-8 h-12 rounded-xl" style={{ backgroundColor: settings.primaryColor }}>
              Explore Collection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
