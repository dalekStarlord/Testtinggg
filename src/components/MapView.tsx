import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import { decodePolyline, type LatLngTuple } from "../lib/polyline";
import type { PlanItinerary } from "./ItineraryList";
import type { CoordinateInput } from "./TripPlannerPanel";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  from: CoordinateInput | null;
  to: CoordinateInput | null;
  itineraries: PlanItinerary[];
  selectedItineraryIndex: number | null;
  nextClickTarget: "from" | "to";
  onMapClick: (coordinate: CoordinateInput) => void;
  onMarkerDrag: (target: "from" | "to", coordinate: CoordinateInput) => void;
}

const DEFAULT_CENTER: LatLngTuple = [8.4795, 124.6272];

const gatherItineraryGeometry = (itinerary: PlanItinerary | null): LatLngTuple[][] => {
  if (!itinerary) return [];
  return itinerary.legs
    .map((leg) => {
      const points = leg.legGeometry?.points;
      if (!points) return null;
      try {
        return decodePolyline(points);
      } catch (error) {
        console.error("Failed to decode polyline", error);
        return null;
      }
    })
    .filter((segment): segment is LatLngTuple[] => Array.isArray(segment) && segment.length > 0);
};

const gatherStopMarkers = (itinerary: PlanItinerary | null): LatLngTuple[] => {
  if (!itinerary) return [];
  const seen = new Set<string>();
  const markers: LatLngTuple[] = [];
  itinerary.legs.forEach((leg) => {
    const startKey = `${leg.from.lat}-${leg.from.lon}`;
    if (!seen.has(startKey)) {
      seen.add(startKey);
      markers.push([leg.from.lat, leg.from.lon]);
    }
    const endKey = `${leg.to.lat}-${leg.to.lon}`;
    if (!seen.has(endKey)) {
      seen.add(endKey);
      markers.push([leg.to.lat, leg.to.lon]);
    }
  });
  return markers;
};

const MapBounds = ({
  from,
  to,
  polylines,
}: {
  from: CoordinateInput | null;
  to: CoordinateInput | null;
  polylines: LatLngTuple[][];
}) => {
  const map = useMap();
  useEffect(() => {
    const points: LatLngTuple[] = [];
    if (from) points.push([from.latitude, from.longitude]);
    if (to) points.push([to.latitude, to.longitude]);
    polylines.forEach((segment) => points.push(...segment));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [from, to, polylines, map]);
  return null;
};

const MapView = ({
  from,
  to,
  itineraries,
  selectedItineraryIndex,
  nextClickTarget,
  onMapClick,
  onMarkerDrag,
}: MapViewProps) => {
  const selectedItinerary =
    selectedItineraryIndex !== null ? itineraries[selectedItineraryIndex] ?? null : null;

  const polylines = useMemo(() => gatherItineraryGeometry(selectedItinerary), [selectedItinerary]);
  const stopMarkers = useMemo(() => gatherStopMarkers(selectedItinerary), [selectedItinerary]);

  const center: LatLngTuple = from
    ? [from.latitude, from.longitude]
    : to
    ? [to.latitude, to.longitude]
    : DEFAULT_CENTER;

  const handleMapClick = (event: LeafletMouseEvent) => {
    const { lat, lng } = event.latlng;
    onMapClick({ latitude: lat, longitude: lng });
  };

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-xl border border-muted-foreground/20 shadow-sm">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        onClick={handleMapClick}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {from ? (
          <Marker
            position={[from.latitude, from.longitude]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                onMarkerDrag("from", { latitude: lat, longitude: lng });
              },
            }}
          />
        ) : null}

        {to ? (
          <Marker
            position={[to.latitude, to.longitude]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                onMarkerDrag("to", { latitude: lat, longitude: lng });
              },
            }}
          />
        ) : null}

        {polylines.map((segment, index) => (
          <Polyline key={`polyline-${index}`} positions={segment} color="#2563eb" weight={5} opacity={0.7} />
        ))}

        {stopMarkers.map((position, index) => (
          <Marker key={`stop-${index}`} position={position} />
        ))}

        <MapBounds from={from} to={to} polylines={polylines} />
      </MapContainer>
      <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-background/90 px-3 py-1 text-xs font-medium shadow">
        Next click: {nextClickTarget === "from" ? "Set origin" : "Set destination"}
      </div>
    </div>
  );
};

export default MapView;
