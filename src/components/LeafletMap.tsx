import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface HexPolygonItem {
  boundary: [number, number][];
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  popupHtml?: string;
}

export interface CircleMarkerItem {
  lat: number;
  lon: number;
  radius: number;
  color: string;
  popupHtml?: string;
  tooltip?: string;
}

export interface PolylineItem {
  coords: [number, number][];
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  tooltip?: string;
}

export interface PinMarkerItem {
  lat: number;
  lon: number;
  color: string;
  label: string;
  tooltip?: string;
}

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  height?: number;
  polygons?: HexPolygonItem[];
  circleMarkers?: CircleMarkerItem[];
  polylines?: PolylineItem[];
  pins?: PinMarkerItem[];
  legendHtml?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom,
  height = 560,
  polygons,
  circleMarkers,
  polylines,
  pins,
  legendHtml,
}) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = mapDivRef.current;
    if (!el) return;

    const map = L.map(el, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (polygons) {
      for (const poly of polygons) {
        const layer = L.polygon(poly.boundary, {
          color: poly.color,
          fillColor: poly.fillColor,
          fillOpacity: poly.fillOpacity,
          weight: poly.weight,
        });
        if (poly.popupHtml) {
          layer.bindPopup(poly.popupHtml, { maxWidth: 260 });
        }
        layer.addTo(group);
      }
    }

    if (circleMarkers) {
      for (const cm of circleMarkers) {
        const layer = L.circleMarker([cm.lat, cm.lon], {
          radius: cm.radius,
          color: cm.color,
          fill: true,
          fillColor: cm.color,
          fillOpacity: 0.75,
          weight: 1.5,
        });
        if (cm.popupHtml) {
          layer.bindPopup(cm.popupHtml, { maxWidth: 260 });
        }
        if (cm.tooltip) {
          layer.bindTooltip(cm.tooltip);
        }
        layer.addTo(group);
      }
    }

    if (polylines) {
      for (const line of polylines) {
        const layer = L.polyline(line.coords, {
          color: line.color,
          weight: line.weight,
          opacity: line.opacity,
          dashArray: line.dashArray,
        });
        if (line.tooltip) {
          layer.bindTooltip(line.tooltip);
        }
        layer.addTo(group);
      }
    }

    if (pins) {
      for (const pin of pins) {
        const icon = L.divIcon({
          className: 'seismo-pin-icon',
          html: `<div style="background:${pin.color};color:#fff;border:2px solid #fff;border-radius:999px;padding:3px 8px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">${pin.label}</div>`,
          iconSize: [0, 0],
          iconAnchor: [24, 12],
        });
        const marker = L.marker([pin.lat, pin.lon], { icon });
        if (pin.tooltip) {
          marker.bindTooltip(pin.tooltip);
        }
        marker.addTo(group);
      }
    }
  }, [polygons, circleMarkers, polylines, pins]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]);

  return (
    <div className="leaflet-map-shell" style={{ height }}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
      {legendHtml && (
        <div
          className="map-legend-overlay"
          dangerouslySetInnerHTML={{ __html: legendHtml }}
        />
      )}
    </div>
  );
};
