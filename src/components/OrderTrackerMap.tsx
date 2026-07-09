import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order } from '@/types';

// Coordinate list for major cities in Pakistan
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8607, lng: 67.0011 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  gujranwala: { lat: 32.1877, lng: 74.1945 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  multan: { lat: 30.1575, lng: 71.5249 },
  hyderabad: { lat: 25.3960, lng: 68.3578 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  quetta: { lat: 30.1798, lng: 66.9750 },
  bahawalpur: { lat: 29.3544, lng: 71.6911 },
  sargodha: { lat: 32.0836, lng: 72.6711 },
  sialkot: { lat: 32.4945, lng: 74.5229 },
  sukkur: { lat: 27.7244, lng: 68.8471 },
  jhang: { lat: 31.2781, lng: 72.3117 },
  sheikhupura: { lat: 31.7131, lng: 73.9783 },
  larkana: { lat: 27.5589, lng: 68.2099 },
  gujrat: { lat: 32.5742, lng: 74.0754 },
  mardan: { lat: 34.1989, lng: 72.0497 },
  kasur: { lat: 31.1167, lng: 74.4500 },
  rahim_yar_khan: { lat: 28.4195, lng: 70.3027 },
  sahiwal: { lat: 30.6667, lng: 73.1000 },
  okara: { lat: 30.8100, lng: 73.4500 },
  wah_cantt: { lat: 33.7744, lng: 72.7523 },
  dg_khan: { lat: 30.0514, lng: 70.6346 },
  mirpur_khas: { lat: 25.5269, lng: 69.0125 },
  abbottabad: { lat: 34.1688, lng: 73.2215 },
  swat: { lat: 35.2227, lng: 72.4258 },
  gilgit: { lat: 35.9208, lng: 74.3083 },
  muzaffarabad: { lat: 34.3700, lng: 73.4700 },
};

interface OrderTrackerMapProps {
  order: Order;
}

export const OrderTrackerMap: React.FC<OrderTrackerMapProps> = ({ order }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Central warehouse (Origin of shipments) - defaults to Lahore
  const origin = CITY_COORDS.lahore;

  // Resolve destination based on customer city
  const getDestinationCoords = (city: string) => {
    const sanitizedCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Look for exact/substring match
    for (const key in CITY_COORDS) {
      if (sanitizedCity.includes(key) || key.includes(sanitizedCity)) {
        return CITY_COORDS[key];
      }
    }
    
    // Fallback: Use coordinate hashes for pseudo-realistic randomized location around Islamabad/Midpoint
    let hash = 0;
    for (let i = 0; i < city.length; i++) {
      hash = city.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (hash % 100) / 100; // -1 to 1 degree
    const lngOffset = ((hash >> 4) % 100) / 100;
    return { 
      lat: 31.5204 + latOffset, // Centered around central Punjab/Lahore midpoint
      lng: 73.587 + lngOffset 
    };
  };

  const destination = getDestinationCoords(order.customerCity);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Determine current tracking coordinate based on order status
    // If "Delivered", the tracker icon should be at the destination.
    // If "Shipped", let's put it somewhere in transit (e.g. 70% of the way).
    const isDelivered = order.status === 'Delivered';
    const progress = isDelivered ? 1.0 : 0.65; // 65% transit
    
    const trackerLat = origin.lat + (destination.lat - origin.lat) * progress;
    const trackerLng = origin.lng + (destination.lng - origin.lng) * progress;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Fit map bounds to show both origin and destination beautifully
    const bounds = L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]);
    map.fitBounds(bounds, { padding: [50, 50] });

    // OpenStreetMap high contrast premium tile layer (cartodb.dark or light is super sleek)
    // We will use standard tile layer of OpenStreetMap for general accessibility
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Custom modern SVGs to ensure absolute reliability without Vite asset-import failures
    const originIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 border-white shadow-xl text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const destIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const truckIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-2xl text-white animate-pulse">
          <div class="absolute inset-0 rounded-full bg-indigo-600/40 animate-ping -z-10" style="animation-duration: 2s;"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Add Markers to Map
    const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);
    originMarker.bindPopup('<div class="font-sans text-xs"><b>Central Supplier Warehouse</b><br/>Lahore Hub</div>');

    const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
    destMarker.bindPopup(`<div class="font-sans text-xs"><b>Delivery Destination</b><br/>${order.customerCity}<br/><span class="text-slate-500">${order.customerAddress}</span></div>`);

    // Draw Shipment Path/Polyline
    const lineCoords = [
      [origin.lat, origin.lng] as L.LatLngExpression,
      [destination.lat, destination.lng] as L.LatLngExpression
    ];
    
    // Sleek dotted polyline
    const polyline = L.polyline(lineCoords, {
      color: '#4f46e5',
      weight: 3,
      opacity: 0.8,
      dashArray: '8, 8',
    }).addTo(map);

    // Add current live position tracker
    const positionMarker = L.marker([trackerLat, trackerLng], { icon: truckIcon }).addTo(map);
    const courierNote = order.carrier ? `${order.carrier} (Ref: ${order.trackingNumber || 'N/A'})` : 'Local Logistics';
    positionMarker.bindPopup(`
      <div class="font-sans text-xs">
        <b class="text-indigo-600 uppercase font-black text-[10px] tracking-wider block mb-1">Live Shipment Status</b>
        <b>Courier:</b> ${courierNote}<br/>
        <b>Status:</b> ${order.status}<br/>
        <b>Transit Progress:</b> ${Math.round(progress * 100)}%
      </div>
    `);

    // Open transit status popup by default for high visual polish
    setTimeout(() => {
      positionMarker.openPopup();
    }, 400);

    return () => {
      // Clean up leaflet instances safely on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order, origin.lat, origin.lng, destination.lat, destination.lng]);

  const courierName = order.carrier || 'TCS';
  const trackNum = order.trackingNumber || 'PK-10928374921';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">Live Transit Map Tracking</span>
        </div>
        <div className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full flex items-center gap-1.5 border border-indigo-100">
          <span>{courierName}</span>
          <span className="text-slate-400">|</span>
          <span className="text-indigo-800 select-all">{trackNum}</span>
        </div>
      </div>
      
      {/* Actual Map Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-[280px] rounded-2xl overflow-hidden border border-slate-100 shadow-inner z-0"
        style={{ touchAction: 'none' }}
      />
      
      <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 p-4 rounded-xl text-xs font-medium text-slate-500">
        <div>
          <span className="block font-bold text-slate-900 mb-0.5">Shipment Origin</span>
          <span>Lahore Fulfillment</span>
        </div>
        <div>
          <span className="block font-bold text-indigo-700 mb-0.5">In Transit</span>
          <span>{order.status}</span>
        </div>
        <div>
          <span className="block font-bold text-slate-900 mb-0.5">Destination City</span>
          <span className="capitalize">{order.customerCity.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
};
