import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { createGreatCirclePoints } from '@/lib/geo';

interface FlightMapProps {
  departure: { lat: number; lon: number; code: string };
  arrival: { lat: number; lon: number; code: string };
  currentPosition?: { lat: number; lon: number };
  turbulenceData?: Array<{
    lat: number;
    lon: number;
    severity: 'low' | 'moderate' | 'high';
  }>;
}


export const FlightMap = ({ 
  departure, 
  arrival, 
  currentPosition,
  turbulenceData 
}: FlightMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const turbulenceLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(
      [(departure.lat + arrival.lat) / 2, (departure.lon + arrival.lon) / 2],
      4
    );

    // Add OpenStreetMap tiles (free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    routeLayer.current = L.layerGroup().addTo(map.current);
    markerLayer.current = L.layerGroup().addTo(map.current);
    turbulenceLayer.current = L.layerGroup().addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [arrival.lat, arrival.lon, departure.lat, departure.lon]);

  useEffect(() => {
    if (!map.current || !routeLayer.current || !markerLayer.current || !turbulenceLayer.current) {
      return;
    }

    routeLayer.current.clearLayers();
    markerLayer.current.clearLayers();
    turbulenceLayer.current.clearLayers();

    // Custom icon for airports
    const airportIcon = L.divIcon({
      className: 'custom-airport-icon',
      html: '<div style="background: hsl(210 100% 50%); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // Custom icon for plane
    const planeIcon = L.divIcon({
      className: 'custom-plane-icon',
      html: '<div style="color: hsl(210 100% 50%); font-size: 24px;">✈️</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const routePoints = createGreatCirclePoints(
      { lat: departure.lat, lon: departure.lon },
      { lat: arrival.lat, lon: arrival.lon },
      64,
    ).map((point) => [point.lat, point.lon] as L.LatLngTuple);

    const routeLine = L.polyline(routePoints, {
      color: 'hsl(210 100% 50%)',
      weight: 3,
      opacity: 0.7,
    }).addTo(routeLayer.current);

    // Add departure marker
    L.marker([departure.lat, departure.lon], { icon: airportIcon })
      .addTo(markerLayer.current)
      .bindPopup(`<b>${departure.code}</b><br>Departure`);

    // Add arrival marker
    L.marker([arrival.lat, arrival.lon], { icon: airportIcon })
      .addTo(markerLayer.current)
      .bindPopup(`<b>${arrival.code}</b><br>Arrival`);

    // Add current position if available
    if (currentPosition) {
      L.marker([currentPosition.lat, currentPosition.lon], { icon: planeIcon })
        .addTo(markerLayer.current)
        .bindPopup('<b>Current Position</b>');
    }

    // Add turbulence markers if available
    if (turbulenceData && turbulenceData.length > 0) {
      turbulenceData.forEach((point) => {
        const color = 
          point.severity === 'high' ? 'hsl(0 84% 60%)' :
          point.severity === 'moderate' ? 'hsl(38 92% 50%)' :
          'hsl(142 76% 36%)';

        L.circle([point.lat, point.lon], {
          color,
          fillColor: color,
          fillOpacity: 0.3,
          radius: 50000, // 50km radius
        }).addTo(turbulenceLayer.current!)
          .bindPopup(`<b>Turbulence: ${point.severity}</b>`);
      });
    }

    map.current.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
  }, [departure, arrival, currentPosition, turbulenceData]);

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <div 
        ref={mapContainer} 
        className="w-full h-[400px]"
        style={{ zIndex: 0 }}
      />
    </div>
  );
};
