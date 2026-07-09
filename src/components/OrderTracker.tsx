import { useState, useEffect } from 'react';
import { ExternalLink, Package, Truck, CheckCircle2, Clock, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trackParcel, COURIER_OPTIONS, TrackingResult, CourierProvider } from '@/lib/courierTracking';
import { format, parseISO } from 'date-fns';

interface OrderTrackerProps {
  trackingNumber: string;
  carrier: string;
  orderStatus: string;
}

const statusIcons: Record<string, typeof Package> = {
  'Delivered': CheckCircle2,
  'Out for Delivery': Truck,
  'In Transit': Truck,
  'Shipped': Truck,
  'Booked': Package,
  'Processing': Clock,
  'Tracking Pending': Clock,
};

const statusColors: Record<string, string> = {
  'Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Out for Delivery': 'bg-blue-100 text-blue-700 border-blue-200',
  'In Transit': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Shipped': 'bg-violet-100 text-violet-700 border-violet-200',
  'Booked': 'bg-amber-100 text-amber-700 border-amber-200',
  'Processing': 'bg-slate-100 text-slate-600 border-slate-200',
  'Tracking Pending': 'bg-slate-100 text-slate-600 border-slate-200',
};

export function OrderTracker({ trackingNumber, carrier, orderStatus }: OrderTrackerProps) {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const courierKey = (carrier?.toLowerCase() || 'other') as CourierProvider;
  const courierInfo = COURIER_OPTIONS.find(c => c.value === courierKey) || COURIER_OPTIONS.find(c => c.value === 'other')!;

  const fetchTracking = async () => {
    if (!trackingNumber) return;
    setLoading(true);
    try {
      const data = await trackParcel(trackingNumber, courierKey);
      setResult(data);
      setLastRefreshed(new Date());
    } catch {
      // silently fail, keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTracking, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trackingNumber, carrier]);

  if (!trackingNumber) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>Tracking number will appear once your order is shipped.</span>
      </div>
    );
  }

  const currentStatus = result?.currentStatus || orderStatus;
  const StatusIcon = statusIcons[currentStatus] || Package;
  const statusClass = statusColors[currentStatus] || statusColors['Processing'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{courierInfo.label}</p>
            <p className="font-mono font-bold text-slate-900 text-sm">{trackingNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusClass} border text-xs font-semibold px-3 py-1`}>
            <StatusIcon className="w-3 h-3 mr-1.5" />
            {currentStatus}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracking}
            disabled={loading}
            className="h-8 px-3 rounded-lg text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a
            href={courierInfo.trackingUrl(trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Track on {courierInfo.label}
            </Button>
          </a>
        </div>
      </div>

      {/* Error / No API key notice */}
      {result?.error && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Live tracking unavailable</p>
            <p>{result.error}</p>
            <a
              href={courierInfo.trackingUrl(trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline mt-1 inline-flex items-center gap-1 hover:text-amber-900"
            >
              Track directly on {courierInfo.label} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Timeline events */}
      {result && result.events.length > 0 && (
        <div className="space-y-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tracking History</p>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {result.events.map((event, idx) => (
                <div key={idx} className="relative pl-10">
                  <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <div className={`p-3 rounded-xl border ${idx === 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className={`text-sm font-semibold ${idx === 0 ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {event.description}
                        </p>
                        {event.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {event.timestamp ? (() => {
                          try { return format(parseISO(event.timestamp), 'MMM d, h:mm a'); }
                          catch { return event.timestamp; }
                        })() : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lastRefreshed && (
        <p className="text-xs text-slate-400 text-right">
          Last updated: {format(lastRefreshed, 'h:mm a')} · Auto-refreshes every 5 min
        </p>
      )}
    </div>
  );
}
