import { AboutUsContent } from '@/types';

/** Fallback content used when settings/aboutUs does not exist yet. */
export const DEFAULT_ABOUT_US: AboutUsContent = {
  title: 'About DaisyHug',
  subtitle: 'Quality products, fair prices, and a simple way for anyone to start selling online.',
  storyHeading: 'Our Story',
  storyParagraphs: [
    'DaisyHug began with one goal: make online shopping easy, reliable, and affordable. Every product in our catalogue is sourced with care and checked before it ships.',
    'We also built a reseller programme so anyone can share our products, set their own margin, and earn on every order without holding stock.',
    'Today we serve customers nationwide and support a growing community of resellers running their own small businesses.',
  ],
  mission: 'To make quality products accessible to every household while helping people build their own income through reselling.',
  vision: 'To be the most trusted social-commerce platform, where shopping and earning go hand in hand.',
  values: [
    { title: 'Quality First', description: 'Products are checked before dispatch so you get what you ordered.' },
    { title: 'Fair Pricing', description: 'Clear prices with no hidden charges at checkout.' },
    { title: 'Customer Care', description: 'Friendly support on WhatsApp, phone, and email.' },
    { title: 'Partner Growth', description: 'Tools and timely payouts for every reseller.' },
  ],
  stats: [
    { label: 'Happy Customers', value: '10,000+' },
    { label: 'Products Shipped', value: '25,000+' },
    { label: 'Reseller Partners', value: '1,500+' },
    { label: 'Cities Served', value: '100+' },
  ],
  contactEmail: 'support@daisyhug.com',
  contactPhone: '',
  contactAddress: '',
};

/** Merge a partial Firestore document with defaults so no field renders blank. */
export function mergeAboutUs(data?: Partial<AboutUsContent>): AboutUsContent {
  if (!data) return DEFAULT_ABOUT_US;
  return {
    ...DEFAULT_ABOUT_US,
    ...data,
    storyParagraphs: Array.isArray(data.storyParagraphs) ? data.storyParagraphs : DEFAULT_ABOUT_US.storyParagraphs,
    values: Array.isArray(data.values) ? data.values : DEFAULT_ABOUT_US.values,
    stats: Array.isArray(data.stats) ? data.stats : DEFAULT_ABOUT_US.stats,
  };
}
