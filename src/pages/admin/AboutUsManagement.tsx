import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AboutUsContent, AboutStat, AboutValue } from '@/types';
import { DEFAULT_ABOUT_US, mergeAboutUs } from '@/lib/aboutUsDefaults';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Info,
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Target,
  Compass,
  BarChart3,
  Layers,
  Phone,
} from 'lucide-react';

export function AboutUsManagement() {
  const [content, setContent] = useState<AboutUsContent>(DEFAULT_ABOUT_US);
  const [storyText, setStoryText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAboutUs() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'aboutUs'));
        if (snap.exists()) {
          const merged = mergeAboutUs(snap.data() as Partial<AboutUsContent>);
          setContent(merged);
          setStoryText(merged.storyParagraphs.join('\n\n'));
        } else {
          setContent(DEFAULT_ABOUT_US);
          setStoryText(DEFAULT_ABOUT_US.storyParagraphs.join('\n\n'));
        }
      } catch (err) {
        console.error('Error loading About Us settings:', err);
        toast.error('Could not load current About Us data.');
      } finally {
        setLoading(false);
      }
    }
    loadAboutUs();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      // Split story text by double or single newlines
      const parsedParagraphs = storyText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const payload: AboutUsContent = {
        ...content,
        storyParagraphs: parsedParagraphs.length > 0 ? parsedParagraphs : DEFAULT_ABOUT_US.storyParagraphs,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'settings', 'aboutUs'), payload, { merge: true });
      setContent(payload);
      toast.success('About Us content saved successfully!');
    } catch (err: unknown) {
      console.error('Failed to save About Us content:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save changes';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all About Us content to default template? Unsaved changes will be lost.')) {
      setContent(DEFAULT_ABOUT_US);
      setStoryText(DEFAULT_ABOUT_US.storyParagraphs.join('\n\n'));
      toast.info('Reset form to default template. Click "Save Changes" to apply.');
    }
  };

  // Stat handlers
  const handleStatChange = (index: number, field: keyof AboutStat, val: string) => {
    const updated = [...content.stats];
    updated[index] = { ...updated[index], [field]: val };
    setContent({ ...content, stats: updated });
  };

  const handleAddStat = () => {
    setContent({
      ...content,
      stats: [...content.stats, { label: 'New Metric', value: '100+' }],
    });
  };

  const handleRemoveStat = (index: number) => {
    const updated = content.stats.filter((_, i) => i !== index);
    setContent({ ...content, stats: updated });
  };

  // Value handlers
  const handleValueChange = (index: number, field: keyof AboutValue, val: string) => {
    const updated = [...content.values];
    updated[index] = { ...updated[index], [field]: val };
    setContent({ ...content, values: updated });
  };

  const handleAddValue = () => {
    setContent({
      ...content,
      values: [...content.values, { title: 'New Core Value', description: 'Brief description of this value.' }],
    });
  };

  const handleRemoveValue = (index: number) => {
    const updated = content.values.filter((_, i) => i !== index);
    setContent({ ...content, values: updated });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading About Us content...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              About Us Page Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize your brand story, mission, vision, values, and key metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
          >
            <span>Preview Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-xs font-bold rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Hero & Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Page Header & Hero</CardTitle>
            </div>
            <CardDescription>
              Main headline and tagline shown at the top of the About Us page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="about-title" className="text-xs font-bold">
                Main Headline Title
              </Label>
              <Input
                id="about-title"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                placeholder="About DaisyHug"
                className="mt-1 font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="about-subtitle" className="text-xs font-bold">
                Hero Subtitle / Tagline
              </Label>
              <Textarea
                id="about-subtitle"
                rows={2}
                value={content.subtitle}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                placeholder="Quality products, honest prices, and a platform that empowers sellers..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Story & Background */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Brand Story</CardTitle>
            </div>
            <CardDescription>
              Write your company's origin, journey, and community focus. Separate paragraphs with an empty blank line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="story-heading" className="text-xs font-bold">
                Story Section Heading
              </Label>
              <Input
                id="story-heading"
                value={content.storyHeading}
                onChange={(e) => setContent({ ...content, storyHeading: e.target.value })}
                placeholder="Our Story"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="story-paragraphs" className="text-xs font-bold">
                Story Paragraphs (separate paragraphs with a blank line)
              </Label>
              <Textarea
                id="story-paragraphs"
                rows={7}
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="DaisyHug started with a simple idea..."
                className="mt-1 font-mono text-sm leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tip: Enter two line breaks between paragraphs to format them as separate text blocks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Mission & Vision */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Mission & Vision</CardTitle>
            </div>
            <CardDescription>
              Core statements displayed in prominent side-by-side feature cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mission" className="text-xs font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mission Statement</span>
              </Label>
              <Textarea
                id="mission"
                rows={3}
                value={content.mission}
                onChange={(e) => setContent({ ...content, mission: e.target.value })}
                placeholder="To make quality products accessible..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vision" className="text-xs font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vision Statement</span>
              </Label>
              <Textarea
                id="vision"
                rows={3}
                value={content.vision}
                onChange={(e) => setContent({ ...content, vision: e.target.value })}
                placeholder="To become Pakistan's most trusted platform..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Key Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">Key Metrics & Stats</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStat}
                className="text-xs font-bold gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Metric
              </Button>
            </div>
            <CardDescription>
              Numerical highlights displayed in the stats bar (e.g., 10,000+ Happy Customers).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.stats.map((stat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
              >
                <div className="w-1/3">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Value</Label>
                  <Input
                    value={stat.value}
                    onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                    placeholder="10,000+"
                    className="h-9 text-sm font-bold text-indigo-600"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Label</Label>
                  <Input
                    value={stat.label}
                    onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                    placeholder="Happy Customers"
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStat(idx)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 mt-4"
                  title="Remove Stat"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 5: Core Values */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">Core Values</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddValue}
                className="text-xs font-bold gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Value
              </Button>
            </div>
            <CardDescription>
              Guiding company principles displayed in the values grid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.values.map((val, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Value #{idx + 1}
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(idx)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
                <Input
                  value={val.title}
                  onChange={(e) => handleValueChange(idx, 'title', e.target.value)}
                  placeholder="Value Title (e.g. Quality First)"
                  className="font-bold"
                />
                <Textarea
                  rows={2}
                  value={val.description}
                  onChange={(e) => handleValueChange(idx, 'description', e.target.value)}
                  placeholder="Short explanation of this principle..."
                  className="text-sm"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 6: Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </div>
            <CardDescription>
              Optional contact channels displayed at the bottom of the About Us page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contact-email" className="text-xs font-bold">
                Email Address
              </Label>
              <Input
                id="contact-email"
                value={content.contactEmail || ''}
                onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                placeholder="support@daisyhug.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone" className="text-xs font-bold">
                Phone Number
              </Label>
              <Input
                id="contact-phone"
                value={content.contactPhone || ''}
                onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
                placeholder="03001234567"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-address" className="text-xs font-bold">
                Office / Location
              </Label>
              <Input
                id="contact-address"
                value={content.contactAddress || ''}
                onChange={(e) => setContent({ ...content, contactAddress: e.target.value })}
                placeholder="Lahore, Pakistan"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="font-bold rounded-xl"
          >
            Reset to Defaults
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 shadow-lg shadow-indigo-600/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
