/// <reference types="vite/client" />
/**
 * Courier Tracking Service for Pakistan
 * Supports: Leopards Courier, TCS, M&P, PostEx, Trax
 * 
 * To activate live tracking, add your API credentials to .env:
 * VITE_LEOPARDS_API_KEY=your_key
 * VITE_LEOPARDS_API_PASSWORD=your_password
 * VITE_POSTEX_API_TOKEN=your_token
 * VITE_TCS_API_KEY=your_key
 */

export type CourierProvider = 'leopards' | 'tcs' | 'mp' | 'postex' | 'trax' | 'other';

export interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface TrackingResult {
  trackingNumber: string;
  courier: CourierProvider;
  currentStatus: string;
  estimatedDelivery?: string;
  origin?: string;
  destination?: string;
  events: TrackingEvent[];
  lastUpdated: string;
  isDelivered: boolean;
  error?: string;
}

// ─── Leopards Courier ──────────────────────────────────────────────────────────
async function trackLeopards(trackingNumber: string): Promise<TrackingResult> {
  const apiKey = import.meta.env.VITE_LEOPARDS_API_KEY;
  const apiPassword = import.meta.env.VITE_LEOPARDS_API_PASSWORD;

  if (!apiKey || !apiPassword) {
    return buildFallback(trackingNumber, 'leopards', 'Leopards API credentials not configured.');
  }

  try {
    const url = `https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/?api_key=${apiKey}&api_password=${apiPassword}&track_numbers=${trackingNumber}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.packet_list || data.packet_list.length === 0) {
      return buildFallback(trackingNumber, 'leopards', 'Tracking number not found.');
    }

    const packet = data.packet_list[0];
    const events: TrackingEvent[] = (packet.Activity || []).map((act: any) => ({
      timestamp: `${act.Date} ${act.Time}`,
      status: act['Status Code'] || act.Status,
      description: act.Status,
      location: act.Location,
    }));

    const isDelivered = packet['Packet Status']?.toLowerCase().includes('deliver');

    return {
      trackingNumber,
      courier: 'leopards',
      currentStatus: packet['Packet Status'] || 'Unknown',
      events,
      lastUpdated: new Date().toISOString(),
      isDelivered,
    };
  } catch (err) {
    return buildFallback(trackingNumber, 'leopards', 'Failed to fetch tracking data.');
  }
}

// ─── PostEx ───────────────────────────────────────────────────────────────────
async function trackPostEx(trackingNumber: string): Promise<TrackingResult> {
  const token = import.meta.env.VITE_POSTEX_API_TOKEN;

  if (!token) {
    return buildFallback(trackingNumber, 'postex', 'PostEx API token not configured.');
  }

  try {
    const res = await fetch(`https://api.postex.pk/services/integration/api/order/v3/track-order/${trackingNumber}`, {
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();

    if (!data.dist) {
      return buildFallback(trackingNumber, 'postex', data.message || 'Tracking number not found.');
    }

    const detail = data.dist;
    const events: TrackingEvent[] = (detail.trackingHistory || []).map((h: any) => ({
      timestamp: h.time || h.date,
      status: h.orderStatus,
      description: h.remarks || h.orderStatus,
      location: h.location,
    }));

    const isDelivered = detail.orderStatus?.toLowerCase().includes('deliver');

    return {
      trackingNumber,
      courier: 'postex',
      currentStatus: detail.orderStatus || 'Unknown',
      destination: detail.customerAddress,
      events,
      lastUpdated: new Date().toISOString(),
      isDelivered,
    };
  } catch (err) {
    return buildFallback(trackingNumber, 'postex', 'Failed to fetch tracking data.');
  }
}

// ─── TCS ──────────────────────────────────────────────────────────────────────
async function trackTCS(trackingNumber: string): Promise<TrackingResult> {
  // TCS uses a web scraping / partner API approach
  // Their official API requires a partner agreement
  const apiKey = import.meta.env.VITE_TCS_API_KEY;

  if (!apiKey) {
    return buildFallback(trackingNumber, 'tcs', 'TCS API key not configured.');
  }

  try {
    const res = await fetch(`https://api.tcsexpress.com/track?consignment_no=${trackingNumber}&api_key=${apiKey}`);
    const data = await res.json();

    const events: TrackingEvent[] = (data.activities || []).map((act: any) => ({
      timestamp: act.datetime,
      status: act.status,
      description: act.description,
      location: act.location,
    }));

    const isDelivered = data.status?.toLowerCase().includes('deliver');

    return {
      trackingNumber,
      courier: 'tcs',
      currentStatus: data.status || 'Unknown',
      events,
      lastUpdated: new Date().toISOString(),
      isDelivered,
    };
  } catch (err) {
    return buildFallback(trackingNumber, 'tcs', 'Failed to fetch tracking data.');
  }
}

// ─── M&P (Mailman & Parcel) ───────────────────────────────────────────────────
async function trackMP(trackingNumber: string): Promise<TrackingResult> {
  const apiKey = import.meta.env.VITE_MP_API_KEY;

  if (!apiKey) {
    return buildFallback(trackingNumber, 'mp', 'M&P API key not configured.');
  }

  try {
    const res = await fetch(`https://api.salaam.pk/parcels/track/${trackingNumber}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await res.json();

    const events: TrackingEvent[] = (data.history || []).map((h: any) => ({
      timestamp: h.created_at,
      status: h.status,
      description: h.remarks,
      location: h.location,
    }));

    const isDelivered = data.status?.toLowerCase().includes('deliver');

    return {
      trackingNumber,
      courier: 'mp',
      currentStatus: data.status || 'Unknown',
      events,
      lastUpdated: new Date().toISOString(),
      isDelivered,
    };
  } catch (err) {
    return buildFallback(trackingNumber, 'mp', 'Failed to fetch tracking data.');
  }
}

// ─── Trax ─────────────────────────────────────────────────────────────────────
async function trackTrax(trackingNumber: string): Promise<TrackingResult> {
  const apiKey = import.meta.env.VITE_TRAX_API_KEY;

  if (!apiKey) {
    return buildFallback(trackingNumber, 'trax', 'Trax API key not configured.');
  }

  try {
    const res = await fetch(`https://app.trax.com.pk/api/v1/fetch-tracking-events/${trackingNumber}`, {
      headers: { 'api-key': apiKey },
    });
    const data = await res.json();

    const events: TrackingEvent[] = (data.tracking_events || []).map((e: any) => ({
      timestamp: e.datetime,
      status: e.description,
      description: e.description,
      location: e.reference_no,
    }));

    const isDelivered = data.status?.toLowerCase().includes('deliver');

    return {
      trackingNumber,
      courier: 'trax',
      currentStatus: data.status || 'Unknown',
      events,
      lastUpdated: new Date().toISOString(),
      isDelivered,
    };
  } catch (err) {
    return buildFallback(trackingNumber, 'trax', 'Failed to fetch tracking data.');
  }
}

// ─── Fallback (no API key configured) ────────────────────────────────────────
function buildFallback(trackingNumber: string, courier: CourierProvider, reason: string): TrackingResult {
  return {
    trackingNumber,
    courier,
    currentStatus: 'Tracking Pending',
    events: [],
    lastUpdated: new Date().toISOString(),
    isDelivered: false,
    error: reason,
  };
}

// ─── Main tracking dispatcher ─────────────────────────────────────────────────
export async function trackParcel(trackingNumber: string, courier: CourierProvider): Promise<TrackingResult> {
  switch (courier) {
    case 'leopards': return trackLeopards(trackingNumber);
    case 'postex':   return trackPostEx(trackingNumber);
    case 'tcs':      return trackTCS(trackingNumber);
    case 'mp':       return trackMP(trackingNumber);
    case 'trax':     return trackTrax(trackingNumber);
    default:
      return buildFallback(trackingNumber, 'other', 'Please track this shipment on the courier\'s website.');
  }
}

export const COURIER_OPTIONS: { value: CourierProvider; label: string; trackingUrl: (n: string) => string }[] = [
  { value: 'leopards', label: 'Leopards Courier', trackingUrl: (n) => `https://www.leopardscourier.com/leopards-courier/track-your-package/?track_numbers=${n}` },
  { value: 'tcs',      label: 'TCS Express',      trackingUrl: (n) => `https://www.tcsexpress.com/track/${n}` },
  { value: 'mp',       label: 'M&P Courier',       trackingUrl: (n) => `https://salaam.pk/en/track/${n}` },
  { value: 'postex',   label: 'PostEx',            trackingUrl: (n) => `https://postex.pk/tracking/${n}` },
  { value: 'trax',     label: 'Trax',              trackingUrl: (n) => `https://app.trax.com.pk/tracking/${n}` },
  { value: 'other',    label: 'Other Courier',      trackingUrl: (_) => '#' },
];
