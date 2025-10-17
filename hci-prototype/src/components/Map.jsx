import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { searchLocations, searchRoute } from "../api/otpClient";

const DEFAULT_CENTER = [8.482, 124.647];
const DEFAULT_ZOOM = 13;
const MIN_SEARCH_LENGTH = 3;

// Configure Leaflet default icon assets for Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function formatLatLng(lat, lon) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function normaliseHex(color) {
  if (!color) return "#2563eb";
  return color.startsWith("#") ? color : `#${color}`;
}

function resolveFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function getLegColor(leg) {
  return normaliseHex(
    resolveFirstDefined(
      leg.route?.color,
      leg.routeColor,
      leg.line?.colour,
      leg.line?.color,
      leg.serviceJourney?.line?.colour,
      leg.serviceJourney?.line?.color,
    ),
  );
}

function getLegTextColor(leg) {
  const resolved = resolveFirstDefined(
    leg.route?.textColor,
    leg.routeTextColor,
    leg.line?.textColour,
    leg.line?.textColor,
    leg.serviceJourney?.line?.textColour,
    leg.serviceJourney?.line?.textColor,
  );

  return resolved ? normaliseHex(resolved) : "#ffffff";
}

function getLegRouteName(leg, index) {
  return (
    resolveFirstDefined(
      leg.route?.shortName,
      leg.route?.longName,
      leg.routeShortName,
      leg.routeLongName,
      leg.line?.publicCode,
      leg.line?.name,
      leg.serviceJourney?.line?.publicCode,
      leg.serviceJourney?.line?.name,
    ) || `Leg ${index + 1}`
  );
}

function decodePolyline(encoded = "") {
  const points = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLon = (result & 1) ? ~(result >> 1) : result >> 1;
    lon += deltaLon;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}

function MapClickCapture({ onClick, enabled }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onClick({ lat: event.latlng.lat, lon: event.latlng.lng });
    },
  });
  return null;
}

function SuggestionsList({ suggestions, onSelect }) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-xl">
      {suggestions.map((item) => (
        <li key={`${item.lat}-${item.lon}-${item.label}`}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full flex-col items-start gap-1 px-4 py-2 text-left text-slate-200 transition-colors hover:bg-slate-800"
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-slate-400">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LocationField({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  suggestions,
  onFocus = () => {},
  isUsingMap,
  onClear,
  onUseMap,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {isUsingMap ? <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-300">Tap map</span> : null}
          {onUseMap ? (
            <button
              type="button"
              onClick={onUseMap}
              className="rounded-full border border-slate-700 px-3 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              {isUsingMap ? "Stop map" : "Use map"}
            </button>
          ) : null}
          {value && (
            <button type="button" onClick={onClear} className="text-slate-400 transition-colors hover:text-white">
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <SuggestionsList suggestions={suggestions} onSelect={onSelect} />
      </div>
    </div>
  );
}

function JeepneyLegDetails({ leg }) {
  return (
    <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Jeepney line</p>
          <p className="text-lg font-semibold text-white">{leg.routeName}</p>
          <p className="text-xs text-slate-400">{leg.fromName} ➜ {leg.toName}</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-200">
          <span>{Math.round(leg.distanceKm * 10) / 10} km</span>
          <span>{Math.round(leg.durationMinutes)} mins</span>
        </div>
      </div>
      {leg.alerts.length ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="font-semibold">Service alerts</p>
          <ul className="mt-1 space-y-1">
            {leg.alerts.map((alert, index) => (
              <li key={index}>{alert.alertHeaderText || "Check operator advisory"}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function Map() {
  const mapRef = useRef(null);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [originSelection, setOriginSelection] = useState(null);
  const [destinationSelection, setDestinationSelection] = useState(null);
  const [mapSelectionTarget, setMapSelectionTarget] = useState(null);
  const [routeLegs, setRouteLegs] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeError, setRouteError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasFullSelection = useMemo(
    () => originSelection !== null && destinationSelection !== null,
    [originSelection, destinationSelection],
  );

  useEffect(() => {
    if (!originSelection || !mapRef.current) return;
    mapRef.current.panTo([originSelection.lat, originSelection.lon]);
  }, [originSelection]);

  useEffect(() => {
    if (!destinationSelection || !mapRef.current) return;
    mapRef.current.panTo([destinationSelection.lat, destinationSelection.lon]);
  }, [destinationSelection]);

  useEffect(() => {
    if (!hasFullSelection) {
      setRouteLegs([]);
      setRouteSummary(null);
      return;
    }

    const controller = new AbortController();
    async function fetchRoute() {
      try {
        setLoading(true);
        setRouteError("");
        const result = await searchRoute(
          originSelection.lat,
          originSelection.lon,
          destinationSelection.lat,
          destinationSelection.lon,
          {
            maxWalkDistance: 800,
            numItineraries: 4,
            allowedTransitModes: ["BUS"],
          },
          controller.signal,
        );

        const itineraries = result?.plan?.itineraries || [];
        if (!itineraries.length) {
          setRouteError("No itineraries returned. Try adjusting your search.");
          setRouteLegs([]);
          setRouteSummary(null);
          return;
        }

        const jeepneyOnly = itineraries.find((itinerary) =>
          itinerary.legs.every((leg) => leg.mode === "BUS"),
        ) ||
          itineraries.find((itinerary) => itinerary.legs.some((leg) => leg.mode === "BUS"));

        if (!jeepneyOnly) {
          setRouteError("No jeepney legs were suggested for this trip.");
          setRouteLegs([]);
          setRouteSummary(null);
          return;
        }

        const jeepneyLegs = jeepneyOnly.legs.filter((leg) => leg.mode === "BUS");

        if (!jeepneyLegs.length) {
          setRouteError("The itinerary only contains walking legs. Try a different pair of stops.");
          setRouteLegs([]);
          setRouteSummary(null);
          return;
        }

        const decodedLegs = jeepneyLegs.map((leg, index) => {
          const legPoints = leg.legGeometry?.points ? decodePolyline(leg.legGeometry.points) : [];
          const coordinates = legPoints.map(([lat, lon]) => [lat, lon]);
          return {
            coordinates,
            color: getLegColor(leg),
            textColor: getLegTextColor(leg),
            routeName: getLegRouteName(leg, index),
            fromName: leg.from?.name || "Origin stop",
            toName: leg.to?.name || "Destination stop",
            distanceKm: (leg.distance || 0) / 1000,
            durationMinutes: (leg.duration || 0) / 60,
            alerts: leg.alerts || [],
          };
        });

        let totalFareCents = 0;
        if (Array.isArray(jeepneyOnly.fares)) {
          totalFareCents = jeepneyOnly.fares.reduce((sum, fare) => sum + (fare?.cents || 0), 0);
        } else if (jeepneyOnly.fare?.fare && typeof jeepneyOnly.fare.fare === "object") {
          totalFareCents = Object.values(jeepneyOnly.fare.fare).reduce(
            (sum, fare) => sum + (fare?.cents || 0),
            0,
          );
        } else if (Array.isArray(jeepneyOnly.fareProducts)) {
          totalFareCents = jeepneyOnly.fareProducts.reduce(
            (sum, product) => sum + (product?.amount?.cents || 0),
            0,
          );
        }

        setRouteLegs(decodedLegs);
        setRouteSummary({
          totalDurationMinutes: Math.round((jeepneyOnly.duration || 0) / 60),
          walkMinutes: Math.round((jeepneyOnly.walkTime || 0) / 60),
          transfers: Math.max(decodedLegs.length - 1, 0),
          fare: totalFareCents ? (totalFareCents / 100).toFixed(2) : null,
        });

        if (decodedLegs.some((leg) => leg.coordinates.length) && mapRef.current) {
          const bounds = decodedLegs.reduce((acc, leg) => {
            if (!leg.coordinates.length) return acc;
            const legBounds = L.latLngBounds(leg.coordinates.map(([lat, lon]) => [lat, lon]));
            return acc ? acc.extend(legBounds) : legBounds;
          }, null);

          if (bounds) {
            mapRef.current.fitBounds(bounds.pad(0.2));
          }
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch route", error);
        setRouteError("Unable to load jeepney routes right now. Please try again.");
        setRouteLegs([]);
        setRouteSummary(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRoute();
    return () => controller.abort();
  }, [hasFullSelection, originSelection, destinationSelection]);

  useEffect(() => {
    if (originQuery.length < MIN_SEARCH_LENGTH) {
      setOriginSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const candidates = await searchLocations(originQuery, controller.signal);
        const filtered = candidates
          .map((candidate) => {
            const coordinates = candidate.geometry?.coordinates;
            const properties = candidate.properties || {};
            if (!coordinates?.length) return null;
            return {
              name: properties.name || properties.label || "Unnamed stop",
              label: properties.label || "Cagayan de Oro",
              lat: coordinates[1],
              lon: coordinates[0],
            };
          })
          .filter(Boolean)
          .filter((candidate) => candidate.label?.toLowerCase().includes("cagayan"));
        setOriginSuggestions(filtered.slice(0, 8));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to search origin", error);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [originQuery]);

  useEffect(() => {
    if (destinationQuery.length < MIN_SEARCH_LENGTH) {
      setDestinationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const candidates = await searchLocations(destinationQuery, controller.signal);
        const filtered = candidates
          .map((candidate) => {
            const coordinates = candidate.geometry?.coordinates;
            const properties = candidate.properties || {};
            if (!coordinates?.length) return null;
            return {
              name: properties.name || properties.label || "Unnamed stop",
              label: properties.label || "Cagayan de Oro",
              lat: coordinates[1],
              lon: coordinates[0],
            };
          })
          .filter(Boolean)
          .filter((candidate) => candidate.label?.toLowerCase().includes("cagayan"));
        setDestinationSuggestions(filtered.slice(0, 8));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to search destination", error);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [destinationQuery]);

  const handleOriginSelect = (selection) => {
    setOriginSelection(selection);
    setOriginQuery(selection.name);
    setOriginSuggestions([]);
    if (mapSelectionTarget === "origin") {
      setMapSelectionTarget("destination");
    }
  };

  const handleDestinationSelect = (selection) => {
    setDestinationSelection(selection);
    setDestinationQuery(selection.name);
    setDestinationSuggestions([]);
    if (mapSelectionTarget === "destination") {
      setMapSelectionTarget(null);
    }
  };

  const handleMapClick = ({ lat, lon }) => {
    if (!mapSelectionTarget) return;
    const candidate = {
      name: `${mapSelectionTarget === "origin" ? "Origin" : "Destination"} via map`,
      label: formatLatLng(lat, lon),
      lat,
      lon,
    };

    if (mapSelectionTarget === "origin") {
      setOriginSelection(candidate);
      setOriginQuery(candidate.label);
      if (!destinationSelection) {
        setMapSelectionTarget("destination");
      } else {
        setMapSelectionTarget(null);
      }
    } else {
      setDestinationSelection(candidate);
      setDestinationQuery(candidate.label);
      setMapSelectionTarget(null);
    }
  };

  const handleSwap = () => {
    if (!originSelection && !destinationSelection) return;
    setOriginSelection(destinationSelection);
    setDestinationSelection(originSelection);
    setOriginQuery(destinationSelection ? destinationSelection.name : "");
    setDestinationQuery(originSelection ? originSelection.name : "");
    setRouteError("");
    setMapSelectionTarget(null);
  };

  const handleReset = () => {
    setOriginQuery("");
    setDestinationQuery("");
    setOriginSelection(null);
    setDestinationSelection(null);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setRouteLegs([]);
    setRouteSummary(null);
    setRouteError("");
    setMapSelectionTarget(null);
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  return (
    <div className="relative flex min-h-[640px] w-full flex-col md:min-h-[720px]">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[540px] w-full md:h-[720px]"
        whenCreated={(instance) => {
          mapRef.current = instance;
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        <MapClickCapture onClick={handleMapClick} enabled={Boolean(mapSelectionTarget)} />

        {originSelection ? (
          <Marker position={[originSelection.lat, originSelection.lon]}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Origin</p>
                <p>{originSelection.name}</p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {destinationSelection ? (
          <Marker position={[destinationSelection.lat, destinationSelection.lon]}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Destination</p>
                <p>{destinationSelection.name}</p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {routeLegs.map((leg, index) => (
          leg.coordinates.length ? (
            <Polyline
              key={`${leg.routeName}-${index}`}
              positions={leg.coordinates.map(([lat, lon]) => [lat, lon])}
              color={leg.color}
              weight={6}
              opacity={0.9}
            />
          ) : null
        ))}
      </MapContainer>

      <aside className="md:absolute md:inset-y-10 md:right-10 md:w-[380px]">
        <div className="mx-auto -mt-12 w-[92%] max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-2xl md:mx-0 md:mt-0">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Jeepney planner</p>
              <h2 className="text-xl font-semibold text-white">Plan your ride</h2>
            </div>
            <button
              type="button"
              onClick={handleSwap}
              className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              Swap
            </button>
          </header>

          <div className="space-y-5">
            <LocationField
              label="Origin"
              placeholder="Search barangay, landmark, or stop"
              value={originQuery}
              onChange={(value) => {
                setOriginQuery(value);
              }}
              onSelect={handleOriginSelect}
              suggestions={originSuggestions}
              isUsingMap={mapSelectionTarget === "origin"}
              onClear={() => {
                setOriginQuery("");
                setOriginSelection(null);
                setRouteError("");
              }}
              onUseMap={() =>
                setMapSelectionTarget((current) => (current === "origin" ? null : "origin"))
              }
            />

            <LocationField
              label="Destination"
              placeholder="Where do you want to go?"
              value={destinationQuery}
              onChange={(value) => {
                setDestinationQuery(value);
              }}
              onSelect={handleDestinationSelect}
              suggestions={destinationSuggestions}
              isUsingMap={mapSelectionTarget === "destination"}
              onClear={() => {
                setDestinationQuery("");
                setDestinationSelection(null);
                setRouteError("");
              }}
              onUseMap={() =>
                setMapSelectionTarget((current) => (current === "destination" ? null : "destination"))
              }
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                {mapSelectionTarget
                  ? `Tap the map to set your ${mapSelectionTarget}`
                  : "Use the buttons above to pick a point from the map"}
              </p>
              {mapSelectionTarget ? (
                <button
                  type="button"
                  onClick={() => setMapSelectionTarget(null)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  Cancel map pick
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                Searching jeepney routes…
              </div>
            ) : null}

            {routeError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {routeError}
              </div>
            ) : null}

            {routeSummary && routeLegs.length ? (
              <section className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                  <h3 className="text-lg font-semibold text-white">Trip overview</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-4 text-sm text-slate-300">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Total time</dt>
                      <dd className="text-lg font-semibold text-white">{routeSummary.totalDurationMinutes} mins</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Transfers</dt>
                      <dd className="text-lg font-semibold text-white">{routeSummary.transfers}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Walking</dt>
                      <dd>{routeSummary.walkMinutes} mins</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated fare</dt>
                      <dd>{routeSummary.fare ? `₱${routeSummary.fare}` : "Check with driver"}</dd>
                    </div>
                  </dl>
                </div>

                <ul className="space-y-3">
                  {routeLegs.map((leg, index) => (
                    <JeepneyLegDetails key={`${leg.routeName}-${index}`} leg={leg} />
                  ))}
                </ul>
              </section>
            ) : null}

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-full bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Reset planner
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Map;
