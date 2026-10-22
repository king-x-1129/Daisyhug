import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { BannerSlide, AnnouncementItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  Eye,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const SEED_BANNERS = [
  {
    image: 'https://apricot.com.pk/cdn/shop/files/Apricot_Winter_Collection.png?v=1791809609&width=2000',
    badge: 'NEW WINTER ARRIVALS',
    title: 'Luxury Home & Lifestyle Collection',
    subtitle: 'From cozy bed linen and comforters to contemporary home essentials, experience unmatched elegance.',
    primaryCtaText: 'Shop New Arrivals',
    primaryCtaLink: '/shop',
    secondaryCtaText: 'Become a Reseller',
    secondaryCtaLink: '/become-a-reseller',
    order: 1,
    isActive: true,
  },
  {
    image: 'https://apricot.com.pk/cdn/shop/files/ChatGPT_Image_Sep_10_2026_11_50_24_PM.png?v=1789066260&width=2000',
    badge: 'WHOLESALE & DROPSHIPPING',
    title: "Pakistan's Leading Reseller Network",
    subtitle: 'Start your zero-investment online store today. Set custom profit margins, with automated nationwide COD delivery.',
    primaryCtaText: 'Start Selling Today',
    primaryCtaLink: '/become-a-reseller',
    secondaryCtaText: 'Browse Catalog',
    secondaryCtaLink: '/shop',
    order: 2,
    isActive: true,
  },
  {
    image: 'https://apricot.com.pk/cdn/shop/files/ChatGPT_Image_Aug_20_2026_04_01_09_PM.png?v=1787224815&width=2000',
    badge: 'FLAT 20% OFF — CODE: DAISY20',
    title: 'Curated Trends For Every Room',
    subtitle: 'Premium craftsmanship delivered to your doorstep across 100+ cities in Pakistan with Cash on Delivery.',
    primaryCtaText: 'Explore Best Sellers',
    primaryCtaLink: '/shop',
    secondaryCtaText: 'View All Deals',
    secondaryCtaLink: '/shop',
    order: 3,
    isActive: true,
  },
];

const SEED_ANNOUNCEMENTS = [
  {
    text: '✨ Exclusive Sale is LIVE! Use code ',
    highlight: 'DAISY10',
    link: '/shop',
    order: 1,
    isActive: true,
  },
  {
    text: '🚚 Free Delivery Across Pakistan on Orders Over Rs. 2,500',
    link: '/shop',
    order: 2,
    isActive: true,
  },
  {
    text: '💳 Cash on Delivery (COD) & Online Debit/Credit Cards Accepted',
    link: '/shop',
    order: 3,
    isActive: true,
  },
];

export function BannerManagement() {
  const [activeTab, setActiveTab] = useState<'banners' | 'announcements'>('banners');

  // Banner State
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState<Partial<BannerSlide>>({
    image: '',
    badge: '',
    title: '',
    subtitle: '',
    primaryCtaText: 'Shop Now',
    primaryCtaLink: '/shop',
    secondaryCtaText: '',
    secondaryCtaLink: '',
    order: 1,
    isActive: true,
  });

  // Announcement State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<Partial<AnnouncementItem>>({
    text: '',
    highlight: '',
    link: '/shop',
    order: 1,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);

  // Subscribe to Banners
  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: BannerSlide[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<BannerSlide, 'id'>) });
        });
        setBanners(list);
        setLoadingBanners(false);
      },
      (error) => {
        console.error('Error fetching banners:', error);
        setLoadingBanners(false);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to Announcements
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: AnnouncementItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<AnnouncementItem, 'id'>) });
        });
        setAnnouncements(list);
        setLoadingAnnouncements(false);
      },
      (error) => {
        console.error('Error fetching announcements:', error);
        setLoadingAnnouncements(false);
      }
    );
    return () => unsub();
  }, []);

  // ─── BANNER ACTIONS ──────────────────────────────────────────────────────────
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.image?.trim() || !bannerForm.title?.trim()) {
      toast.error('Image URL and Headline Title are required');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        image: bannerForm.image.trim(),
        badge: bannerForm.badge?.trim() || '',
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle?.trim() || '',
        primaryCtaText: bannerForm.primaryCtaText?.trim() || 'Shop Now',
        primaryCtaLink: bannerForm.primaryCtaLink?.trim() || '/shop',
        secondaryCtaText: bannerForm.secondaryCtaText?.trim() || '',
        secondaryCtaLink: bannerForm.secondaryCtaLink?.trim() || '',
        order: Number(bannerForm.order) || 1,
        isActive: bannerForm.isActive !== false,
        updatedAt: new Date().toISOString(),
      };

      if (isEditingBanner && bannerForm.id) {
        await updateDoc(doc(db, 'banners', bannerForm.id), dataToSave);
        toast.success('Hero banner updated successfully');
      } else {
        await addDoc(collection(db, 'banners'), {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success('Hero banner created successfully');
      }

      resetBannerForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBanner = (banner: BannerSlide) => {
    setBannerForm(banner);
    setIsEditingBanner(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      toast.success('Banner deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete banner');
    }
  };

  const handleToggleBannerActive = async (banner: BannerSlide) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), {
        isActive: !banner.isActive,
      });
      toast.success(`Banner ${!banner.isActive ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSeedBanners = async () => {
    if (!window.confirm('Populate database with default Apricot-style banners?')) return;
    setSaving(true);
    try {
      for (const item of SEED_BANNERS) {
        await addDoc(collection(db, 'banners'), {
          ...item,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success('Default banners added to database!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed banners');
    } finally {
      setSaving(false);
    }
  };

  const resetBannerForm = () => {
    setIsEditingBanner(false);
    setBannerForm({
      image: '',
      badge: '',
      title: '',
      subtitle: '',
      primaryCtaText: 'Shop Now',
      primaryCtaLink: '/shop',
      secondaryCtaText: '',
      secondaryCtaLink: '',
      order: (banners.length || 0) + 1,
      isActive: true,
    });
  };

  // ─── ANNOUNCEMENT ACTIONS ──────────────────────────────────────────────────
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.text?.trim()) {
      toast.error('Announcement message text is required');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        text: announcementForm.text.trim(),
        highlight: announcementForm.highlight?.trim() || '',
        link: announcementForm.link?.trim() || '',
        order: Number(announcementForm.order) || 1,
        isActive: announcementForm.isActive !== false,
        updatedAt: new Date().toISOString(),
      };

      if (isEditingAnnouncement && announcementForm.id) {
        await updateDoc(doc(db, 'announcements', announcementForm.id), dataToSave);
        toast.success('Announcement updated');
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success('Announcement created');
      }

      resetAnnouncementForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAnnouncement = (item: AnnouncementItem) => {
    setAnnouncementForm(item);
    setIsEditingAnnouncement(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete this announcement message?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Announcement removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleToggleAnnouncementActive = async (item: AnnouncementItem) => {
    try {
      await updateDoc(doc(db, 'announcements', item.id), {
        isActive: !item.isActive,
      });
      toast.success(`Announcement ${!item.isActive ? 'activated' : 'paused'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleSeedAnnouncements = async () => {
    if (!window.confirm('Populate database with default promotional ticker alerts?')) return;
    setSaving(true);
    try {
      for (const item of SEED_ANNOUNCEMENTS) {
        await addDoc(collection(db, 'announcements'), {
          ...item,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success('Default announcements added to database!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed announcements');
    } finally {
      setSaving(false);
    }
  };

  const resetAnnouncementForm = () => {
    setIsEditingAnnouncement(false);
    setAnnouncementForm({
      text: '',
      highlight: '',
      link: '/shop',
      order: (announcements.length || 0) + 1,
      isActive: true,
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header and Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Banner & Announcement Manager
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Dynamically customize your hero banner slider and rotating top announcement alerts.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'banners'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Hero Slider ({banners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'announcements'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Top Bar ({announcements.length})</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: HERO BANNER CAROUSEL SLIDER
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'banners' && (
        <div className="space-y-8">
          {/* Create / Edit Banner Form */}
          <Card className="rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-850 p-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{isEditingBanner ? 'Edit Hero Banner Slide' : 'Add New Hero Banner Slide'}</span>
              </CardTitle>
              {isEditingBanner && (
                <Button
                  variant="ghost"
                  onClick={resetBannerForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveBanner} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Image URL */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Banner Image URL <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      type="url"
                      placeholder="https://example.com/images/banner.jpg"
                      value={bannerForm.image || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                    {bannerForm.image && (
                      <div className="mt-2 relative rounded-xl overflow-hidden h-36 bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <img
                          src={bannerForm.image}
                          alt="Banner Preview"
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md">
                          Live Image Preview
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Headline Title */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Headline Title <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="e.g. Luxury Winter Collection 2026"
                      value={bannerForm.title || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Category Tag / Badge */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Category Tag / Badge
                    </Label>
                    <Input
                      placeholder="e.g. NEW ARRIVALS or FLAT 20% OFF"
                      value={bannerForm.badge || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subtitle / Promotional Description
                    </Label>
                    <Input
                      placeholder="e.g. Crafted with pure combed cotton for exquisite comfort and everyday durability."
                      value={bannerForm.subtitle || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Primary CTA Text & Link */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Button Text
                    </Label>
                    <Input
                      placeholder="e.g. Shop Collection"
                      value={bannerForm.primaryCtaText || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, primaryCtaText: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Button Link
                    </Label>
                    <Input
                      placeholder="e.g. /shop or /collections/winter"
                      value={bannerForm.primaryCtaLink || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, primaryCtaLink: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Secondary CTA Text & Link */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Secondary Button Text (optional)
                    </Label>
                    <Input
                      placeholder="e.g. Become a Reseller"
                      value={bannerForm.secondaryCtaText || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, secondaryCtaText: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Secondary Button Link (optional)
                    </Label>
                    <Input
                      placeholder="e.g. /become-a-reseller"
                      value={bannerForm.secondaryCtaLink || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, secondaryCtaLink: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Order & Active Toggle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Display Order Priority</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={bannerForm.order ?? 1}
                      onChange={(e) => setBannerForm({ ...bannerForm, order: Number(e.target.value) })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      id="banner_is_active"
                      type="checkbox"
                      checked={bannerForm.isActive !== false}
                      onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="banner_is_active" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Active (Display in hero carousel)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 h-11 text-sm shadow-md cursor-pointer"
                  >
                    {saving ? 'Saving...' : isEditingBanner ? 'Update Banner' : 'Create Banner'}
                  </Button>
                  {isEditingBanner && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetBannerForm}
                      className="rounded-xl font-bold px-5 h-11 text-sm cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Existing Banners List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Existing Hero Slides</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {banners.length}
                </span>
              </h2>

              {banners.length === 0 && (
                <Button
                  onClick={handleSeedBanners}
                  disabled={saving}
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Seed Default Apricot Banners</span>
                </Button>
              )}
            </div>

            {loadingBanners ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading banners...</div>
            ) : banners.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No custom banners found in database.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The storefront is currently showing the Apricot default fallback banner slides.
                  Add custom slides above or click below to populate the database with editable records.
                </p>
                <Button
                  onClick={handleSeedBanners}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5 h-10 mt-2"
                >
                  Seed Default Banners
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner) => (
                  <Card
                    key={banner.id}
                    className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
                      banner.isActive
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative h-44 bg-slate-950 overflow-hidden">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/90 text-slate-900 shadow">
                          Order #{banner.order}
                        </span>
                        {banner.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow">
                            {banner.badge}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => handleToggleBannerActive(banner)}
                          title={banner.isActive ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                          className={`p-1.5 rounded-full backdrop-blur-md shadow-md transition-all ${
                            banner.isActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700/80 text-slate-300'
                          }`}
                        >
                          {banner.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="text-sm font-black line-clamp-1 drop-shadow">{banner.title}</h3>
                        {banner.subtitle && (
                          <p className="text-[11px] text-slate-200 line-clamp-1 drop-shadow mt-0.5">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">CTA: {banner.primaryCtaText} ({banner.primaryCtaLink})</span>
                        <span className={`font-bold ${banner.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {banner.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBanner(banner)}
                          className="h-8 px-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: TOP ANNOUNCEMENT BAR TICKER
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'announcements' && (
        <div className="space-y-8">
          {/* Create / Edit Announcement Form */}
          <Card className="rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-850 p-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span>{isEditingAnnouncement ? 'Edit Announcement Message' : 'Add New Announcement Alert'}</span>
              </CardTitle>
              {isEditingAnnouncement && (
                <Button
                  variant="ghost"
                  onClick={resetAnnouncementForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Announcement Text */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Announcement Message <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="e.g. ✨ The DaisyHug Winter Sale is LIVE! Use code "
                      value={announcementForm.text || ''}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Highlight / Promo Code */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Highlighted Code / Keyword (optional)
                    </Label>
                    <Input
                      placeholder="e.g. DAISY10 or 20% OFF"
                      value={announcementForm.highlight || ''}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, highlight: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Link */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Destination Link (optional)
                    </Label>
                    <Input
                      placeholder="e.g. /shop or /collections/winter"
                      value={announcementForm.link || ''}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, link: e.target.value })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Order */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Display Order Priority
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={announcementForm.order ?? 1}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, order: Number(e.target.value) })}
                      className="rounded-xl h-11 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      id="announcement_is_active"
                      type="checkbox"
                      checked={announcementForm.isActive !== false}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="announcement_is_active" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Active (Display in rotating ticker)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 h-11 text-sm shadow-md cursor-pointer"
                  >
                    {saving ? 'Saving...' : isEditingAnnouncement ? 'Update Announcement' : 'Add Announcement'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Existing Announcements List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Existing Rotating Announcements</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {announcements.length}
                </span>
              </h2>

              {announcements.length === 0 && (
                <Button
                  onClick={handleSeedAnnouncements}
                  disabled={saving}
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Seed Default Announcements</span>
                </Button>
              )}
            </div>

            {loadingAnnouncements ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No custom announcements configured.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The top announcement bar is showing the default fallback promotional ticker alerts.
                </p>
                <Button
                  onClick={handleSeedAnnouncements}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5 h-10 mt-2"
                >
                  Seed Default Announcements
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      item.isActive
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        #{item.order}
                      </span>
                      <div className="truncate">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.text}
                        </span>
                        {item.highlight && (
                          <span className="ml-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            ({item.highlight})
                          </span>
                        )}
                        {item.link && (
                          <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                            Links to: {item.link}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleAnnouncementActive(item)}
                        title={item.isActive ? 'Active (Click to pause)' : 'Paused (Click to activate)'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          item.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {item.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{item.isActive ? 'Active' : 'Paused'}</span>
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAnnouncement(item)}
                        className="h-8 px-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
