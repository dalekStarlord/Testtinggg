import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronDownIcon, XMarkIcon, MapPinIcon, ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { searchRoute, searchLocations } from "../api/otpClient";

const CDO_BOUNDS = {
  minLat: 8.3542,
  maxLat: 8.5542,
  minLon: 124.5319,
  maxLon: 124.7319,
};

function MapSearch({ onSelectLocation, onFocusLocation }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const lastSearchIdRef = useRef(0);

  const searchLocation = useCallback(async (text) => {
    const query = text.trim();

    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    const searchId = ++lastSearchIdRef.current;
    setIsSearching(true);
    setError(null);

    try {
      const features = await searchLocations(query);

      if (lastSearchIdRef.current !== searchId) {
        return;
      }

      const formattedResults = (features || [])
        .map((feature, index) => {
          const coordinates = feature?.geometry?.coordinates;
          if (!Array.isArray(coordinates) || coordinates.length < 2) {
            return null;
          }

          const [lonRaw, latRaw] = coordinates;
          const lat = typeof latRaw === "number" ? latRaw : parseFloat(latRaw);
          const lon = typeof lonRaw === "number" ? lonRaw : parseFloat(lonRaw);

          if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return null;
          }

          if (
            lat < CDO_BOUNDS.minLat ||
            lat > CDO_BOUNDS.maxLat ||
            lon < CDO_BOUNDS.minLon ||
            lon > CDO_BOUNDS.maxLon
          ) {
            return null;
          }

          const label = feature?.properties?.label || feature?.properties?.name;
          if (!label) {
            return null;
          }

          return {
            id: feature?.properties?.id || `${label}-${index}`,
            label,
            name: feature?.properties?.name || label,
            lat,
            lon,
          };
        })
        .filter(Boolean)
        .slice(0, 10);

      setResults(formattedResults);
    } catch (err) {
      if (lastSearchIdRef.current !== searchId) {
        return;
      }

      console.error("Search error:", err);
      setResults([]);
      if (err?.name === "AbortError") {
        setError("Search took too long. Please try again.");
      } else {
        setError(err?.message || "Failed to search locations. Please try again.");
      }
    } finally {
      if (lastSearchIdRef.current === searchId) {
        setIsSearching(false);
      }
    }
  }, []);

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              searchLocation(searchText);
            }
          }}
          placeholder="Search for a location in CDO..."
          className="w-full px-10 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => searchLocation(searchText)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
      </div>
      {isSearching && (
        <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg p-2 text-gray-600">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 inline-block text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Searching locations in CDO...
        </div>
      )}
      {error && !isSearching && (
        <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg p-2 text-red-600">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}
      {!isSearching && !error && results.length === 0 && searchText && (
        <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg p-2 text-gray-600">
          No locations found in CDO area. Try a different search term.
        </div>
      )}
      {!isSearching && !error && results.length > 0 && (
        <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => {
                const coords = {
                  lat: result.lat,
                  lon: result.lon,
                  name: result.name,
                };
                onSelectLocation(coords);
                if (onFocusLocation) {
                  onFocusLocation(coords);
                }
                setResults([]);
                setSearchText("");
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
            >
              <div className="text-sm font-medium text-gray-800">{result.name}</div>
              {result.label && (
                <div className="text-xs text-gray-500">{result.label}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fix Leaflet marker icons issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Create custom icons
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="white"/>
        <path d="M16,28 C10,20 10,20 16,12 C22,20 22,20 16,28 Z" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const originIcon = createCustomIcon("#3B82F6");
const destinationIcon = createCustomIcon("#EF4444");
const currentLocationIcon = createCustomIcon("#10B981");

// Route data with multiple routes
const WALK_LEG_COLOR = "#6b7280";
const DEFAULT_TRANSIT_COLOR = "#2563eb";
const DRIVE_LEG_COLOR = "#f97316";

function normalizeHexColor(color) {
  if (!color) return null;
  const trimmed = color.trim();
  if (!trimmed) return null;
    if (trimmed.startsWith('#')) {
      const normalized = trimmed.length === 7 || trimmed.length === 4 ? trimmed : `#${trimmed.slice(1)}`;
      return normalized;
    }
    if (trimmed.length === 6 || trimmed.length === 3) {
      return `#${trimmed}`;
  }
  return null;
}

function decodePolyline(encoded) {
  if (!encoded) {
    return [];
  }

  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLon = (result & 1) ? ~(result >> 1) : result >> 1;
    lon += deltaLon;

    coordinates.push([lat / 1e5, lon / 1e5]);
  }

  return coordinates;
}

function getLegColor(leg) {
  if (!leg) {
    return DEFAULT_TRANSIT_COLOR;
  }

  if (leg.mode === 'WALK') {
    return WALK_LEG_COLOR;
  }

  if (leg.mode === 'CAR' || leg.mode === 'CARPOOL') {
    return DRIVE_LEG_COLOR;
  }

  const hex = normalizeHexColor(leg?.route?.color);
  if (hex) {
    return hex;
  }

  return DEFAULT_TRANSIT_COLOR;
}

function calculateTransitDistance(legs = []) {
  return legs.reduce((total, leg) => {
    if (!leg || leg.mode === 'WALK') {
      return total;
    }
    return total + (leg.distance || 0);
  }, 0);
}

function estimateJeepneyFare(distanceMeters) {
  if (!distanceMeters || distanceMeters <= 0) {
    return 0;
  }

  const distanceKm = distanceMeters / 1000;
  const baseFare = 12;
  if (distanceKm <= 4) {
    return baseFare;
  }

  const additionalKm = Math.max(0, distanceKm - 4);
  const additionalFare = Math.ceil(additionalKm) * 1.8;
  return Math.round((baseFare + additionalFare) * 100) / 100;
}

function resolveFare(itinerary) {
  if (!itinerary) {
    return null;
  }

  const primaryFare = itinerary.fare;
  if (primaryFare?.cents != null) {
    return {
      amount: primaryFare.cents / 100,
      currency: primaryFare.currency || 'PHP',
      isEstimated: false,
    };
  }

  const fares = Array.isArray(itinerary.fares) ? itinerary.fares : [];
  if (fares.length > 0) {
    const totalCents = fares.reduce((sum, entry) => sum + (entry?.cents || 0), 0);
    if (totalCents > 0) {
      const currency = fares.find((entry) => entry?.currency)?.currency || 'PHP';
      return {
        amount: totalCents / 100,
        currency,
        isEstimated: false,
      };
    }
  }

  const transitDistance = calculateTransitDistance(itinerary.legs || []);
  if (transitDistance <= 0) {
    return null;
  }

  return {
    amount: estimateJeepneyFare(transitDistance),
    currency: 'PHP',
    isEstimated: true,
  };
}

function formatDuration(seconds) {
  if (seconds == null) {
    return "0m";
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function metersToKilometers(meters) {
  if (!meters && meters !== 0) {
    return 0;
  }

  return Math.round((meters / 1000) * 100) / 100;
}
// A hook to detect clicks and set markers
function MapEvents({ setOrigin, setDestination, setMode, focusMap, mode }) {
  useMapEvents({
    click(e) {
      const point = [e.latlng.lat, e.latlng.lng];
      if (mode === "origin") {
        setOrigin(point);
        setMode("destination");
      } else if (mode === "destination") {
        setDestination(point);
      }
      focusMap(point);
    },
  });
  return null;
}

// Component to recenter map when needed
function RecenterMap({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom ?? map.getZoom());
    }
  }, [position, zoom, map]);
  return null;
}

function Map() {
  const defaultPosition = [8.4542, 124.6318];
  const [currentLocation, setCurrentLocation] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState(0);
  const [routingError, setRoutingError] = useState(null);
  const [panelState, setPanelState] = useState("collapsed");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [mode, setMode] = useState("origin"); // "origin" or "destination"
  const [geoError, setGeoError] = useState(null);
  const panelRef = useRef(null);
  const dragHandleRef = useRef(null);
  const mapRef = useRef(null);
  const [mapFocus, setMapFocus] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(13);
  const focusMap = useCallback((point, zoom = 15) => {
    if (!point) {
      return;
    }
    setMapFocus(point);
    setMapZoom(zoom);
    if (mapRef.current) {
      mapRef.current.flyTo(point, zoom);
    }
  }, []);

  const selectedItinerary = useMemo(() => {
    if (!itineraries || itineraries.length === 0) {
      return null;
    }

    const safeIndex = Math.min(selectedItineraryIndex, itineraries.length - 1);
    return itineraries[safeIndex];
  }, [itineraries, selectedItineraryIndex]);

  const selectedLegGeometries = useMemo(() => {
    if (!selectedItinerary) {
      return [];
    }

    return (selectedItinerary.legs || [])
      .map((leg) => {
        const points = decodePolyline(leg?.legGeometry?.points || "");
        return {
          leg,
          points,
          color: getLegColor(leg),
        };
      })
      .filter((entry) => entry.points.length > 0);
  }, [selectedItinerary]);

  const selectedFare = useMemo(() => resolveFare(selectedItinerary), [selectedItinerary]);

  const itineraryBounds = useMemo(() => {
    if (selectedLegGeometries.length === 0) {
      return null;
    }

    const latLngs = selectedLegGeometries.flatMap((entry) => entry.points);
    if (latLngs.length === 0) {
      return null;
    }

    return L.latLngBounds(latLngs.map(([lat, lon]) => [lat, lon]));
  }, [selectedLegGeometries]);

  useEffect(() => {
    if (!itineraryBounds || !mapRef.current) {
      return;
    }

    mapRef.current.fitBounds(itineraryBounds.pad(0.1));
  }, [itineraryBounds]);

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setGeoError(null);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          setOrigin([latitude, longitude]);
          setMode("destination");
          setLoading(false);
          setPanelState("half");
          focusMap([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLoading(false);
          setGeoError("Unable to access your location. Please check your browser permissions or manually select a location on the map.");
        },
        {
          timeout: 10000,
          enableHighAccuracy: true
        }
      );
    } else {
      setGeoError("Geolocation is not supported by this browser. Please manually select a location on the map.");
    }
  };

  // Calculate route with OTP
  useEffect(() => {
    if (!origin || !destination) {
      setItineraries([]);
      setSelectedItineraryIndex(0);
      setRoutingError(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setRoutingError(null);

    const planTrip = async () => {
      try {
        const response = await searchRoute(
          origin[0],
          origin[1],
          destination[0],
          destination[1],
          {
            numItineraries: 5,
            modes: ["TRANSIT", "WALK"],
            maxWalkDistance: 1500,
          }
        );

        if (isCancelled) {
          return;
        }

        const plannedItineraries = response?.data?.plan?.itineraries || [];
        setItineraries(plannedItineraries);
        setSelectedItineraryIndex(0);
        setPanelState(plannedItineraries.length > 0 ? "half" : "half");

        if (plannedItineraries.length === 0) {
          setRoutingError("No jeepney routes found between the selected points.");
        }

        setLoading(false);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error("Error fetching route:", error);
        setLoading(false);
        setItineraries([]);
        setRoutingError(error?.message || "Failed to fetch routes. Please try again.");
      }
    };

    planTrip();

    return () => {
      isCancelled = true;
    };
  }, [origin, destination]);

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setCurrentLocation(null);
    setItineraries([]);
    setSelectedItineraryIndex(0);
    setRoutingError(null);
    setMode("origin");
    setPanelState("collapsed");
    setGeoError(null);
    focusMap(defaultPosition, 13);
  };

  // Handle touch events for dragging the panel
  const handleTouchStart = useCallback((e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    
    let currentHeight = 0;
    if (panelState === "collapsed") currentHeight = 10;
    else if (panelState === "half") currentHeight = 50;
    else currentHeight = 90;
    
    setStartHeight(currentHeight);
  }, [panelState]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    const newHeight = Math.min(90, Math.max(10, startHeight + (diff / window.innerHeight) * 100));
    
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${100 - newHeight}%)`;
    }
  }, [isDragging, startY, startHeight]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (panelRef.current) {
      const computedStyle = window.getComputedStyle(panelRef.current);
      const matrix = new DOMMatrixReadOnly(computedStyle.transform);
      const currentTranslateY = matrix.m42;
      const panelHeight = panelRef.current.offsetHeight;
      const visiblePercentage = (1 - currentTranslateY / panelHeight) * 100;
      
      if (visiblePercentage < 30) {
        setPanelState("collapsed");
      } else if (visiblePercentage < 70) {
        setPanelState("half");
      } else {
        setPanelState("full");
      }
      
      panelRef.current.style.transform = '';
    }
  }, [isDragging]);

  // Add event listeners for dragging
  useEffect(() => {
    const handle = dragHandleRef.current;
    if (!handle) return;

    handle.addEventListener('touchstart', handleTouchStart, { passive: true });
    handle.addEventListener('touchmove', handleTouchMove, { passive: true });
    handle.addEventListener('touchend', handleTouchEnd);

    return () => {
      handle.removeEventListener('touchstart', handleTouchStart);
      handle.removeEventListener('touchmove', handleTouchMove);
      handle.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getPanelClass = () => {
    let baseClasses = "fixed md:relative bottom-0 left-0 right-0 md:h-full md:w-96 bg-gray-900 text-white p-6 shadow-2xl transform transition-transform duration-300 z-40 md:translate-x-0 rounded-t-2xl md:rounded-none";
    
    if (isDragging) {
      return `${baseClasses}`;
    }
    
    if (panelState === "collapsed") {
      return `${baseClasses} translate-y-[90%] md:translate-y-0 md:transform-none`;
    } else if (panelState === "half") {
      return `${baseClasses} translate-y-1/2 md:translate-y-0 md:transform-none`;
    } else if (panelState === "full") {
      return `${baseClasses} translate-y-0 md:translate-y-0 md:transform-none`;
    }
  };

  return (
    <div className="flex h-screen w-screen relative">
      {/* Map Container */}
      <MapContainer
        center={defaultPosition}
        zoom={13}
        className="h-full w-full z-0"
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Current location marker */}
        {currentLocation && (
          <Marker position={currentLocation} icon={currentLocationIcon}>
            <Popup>Your Current Location</Popup>
          </Marker>
        )}

        {/* Origin marker */}
        {origin && !currentLocation && (
          <Marker position={origin} icon={originIcon}>
            <Popup>Origin</Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker position={destination} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Route result lines */}
        {selectedLegGeometries.map((legEntry, index) => (
          <Polyline
            key={`${legEntry.leg?.mode}-${index}`}
            positions={legEntry.points}
            color={legEntry.color}
            weight={legEntry.leg?.mode === "WALK" ? 4 : 6}
            opacity={legEntry.leg?.mode === "WALK" ? 0.7 : 0.9}
            dashArray={legEntry.leg?.mode === "WALK" ? "8 8" : undefined}
          />
        ))}

        <MapEvents
          setOrigin={setOrigin}
          setDestination={setDestination}
          setMode={setMode}
          focusMap={focusMap}
          mode={mode}
        />
        <RecenterMap position={mapFocus} zoom={mapZoom} />
      </MapContainer>

      {/* Floating Panel */}
      <div ref={panelRef} className={getPanelClass()}>
        {/* Panel Drag Handle */}
        <div 
          ref={dragHandleRef}
          className="flex justify-center md:hidden touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1.5 bg-gray-600 rounded-full my-2"></div>
        </div>

        {/* Panel Content */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🚍 Jeepney Route Finder</h2>
            {(origin || destination) && (
              <button 
                onClick={handleClear}
                className="md:hidden p-1 rounded-full bg-gray-700 hover:bg-gray-600"
                aria-label="Clear"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {!origin && !destination && (
            <div className="flex flex-col space-y-4">
              <p className="text-gray-300">Plan your jeepney route</p>
              
              <button
                onClick={getCurrentLocation}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>Use My Current Location</span>
              </button>
              
              <div className="relative flex items-center justify-center my-4">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="mx-4 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>

              <MapSearch
                onSelectLocation={(coords) => {
                  const point = [coords.lat, coords.lon];
                  if (!origin) {
                    setOrigin(point);
                    setCurrentLocation(null);
                    setMode("destination");
                    setPanelState("half");
                  } else if (!destination) {
                    setDestination(point);
                  }
                }}
                onFocusLocation={(coords) => {
                  focusMap([coords.lat, coords.lon]);
                }}
              />

              <button
                onClick={() => setMode("origin")}
                className="flex items-center justify-center space-x-2 bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                <MapPinIcon className="w-5 h-5" />
                <span>Select Origin on Map</span>
              </button>

              {geoError && (
                <div className="mt-4 p-3 bg-red-900 rounded-lg">
                  <p className="text-red-200 text-sm">{geoError}</p>
                </div>
              )}
            </div>
          )}

          {origin && !destination && (
            <div className="flex flex-col space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-green-400 font-medium">✓ Origin set</p>
                <p className="text-sm text-gray-400 mt-1">
                  {currentLocation ? "Using your current location" : "Origin selected on map"}
                </p>
              </div>
              
              <MapSearch
                onSelectLocation={(coords) => {
                  if (!destination) {
                    const point = [coords.lat, coords.lon];
                    setDestination(point);
                    setPanelState("half");
                  }
                }}
                onFocusLocation={(coords) => {
                  focusMap([coords.lat, coords.lon]);
                }}
              />

              <button
                onClick={() => setMode("destination")}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-4"
              >
                <MapPinIcon className="w-5 h-5" />
                <span>Select Destination on Map</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="mt-4 py-6 text-center">
              <div className="inline-flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
              <p className="text-blue-400 font-medium mt-3">
                Finding best jeepney route...
              </p>
            </div>
          )}

          {routingError && !loading && (
            <div className="mt-4 bg-red-900/80 border border-red-700 p-4 rounded-lg space-y-3">
              <p className="text-red-100 text-sm">{routingError}</p>
              <button
                onClick={handleClear}
                className="w-full bg-red-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Reset search
              </button>
            </div>
          )}

          {itineraries.length > 0 && !loading && (
            <div className="mt-4 bg-gray-800 p-5 rounded-xl shadow-md space-y-5">
              <div>
                <h3 className="text-xl font-semibold mb-3">Available Routes</h3>
                <div className="space-y-2">
                  {itineraries.map((itinerary, index) => {
                    const fareInfo = resolveFare(itinerary);
                    const transitDistance = calculateTransitDistance(itinerary.legs || []);
                    const isSelected = index === selectedItineraryIndex;

                    return (
                      <button
                        key={`itinerary-${index}`}
                        onClick={() => setSelectedItineraryIndex(index)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? "border-blue-400 bg-gray-700"
                            : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-100">Route {index + 1}</span>
                          <span className="text-sm text-gray-300">{formatDuration(itinerary.duration)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                          <span>{metersToKilometers(transitDistance)} km transit</span>
                          <span>
                            {fareInfo
                              ? `${fareInfo.currency} ${fareInfo.amount.toFixed(2)}${fareInfo.isEstimated ? " (est.)" : ""}`
                              : "Fare unavailable"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedItinerary && (
                <div className="pt-4 border-t border-gray-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-400 block">Duration</span>
                      <span className="font-semibold text-white">{formatDuration(selectedItinerary.duration)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Walking</span>
                      <span className="font-semibold text-white">{formatDuration(selectedItinerary.walkTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Transit</span>
                      <span className="font-semibold text-white">{formatDuration(selectedItinerary.transitTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Fare estimate</span>
                      <span className="font-semibold text-white">
                        {selectedFare
                          ? `${selectedFare.currency} ${selectedFare.amount.toFixed(2)}${selectedFare.isEstimated ? " (est.)" : ""}`
                          : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedLegGeometries.map((entry, index) => {
                      const leg = entry.leg;
                      const isWalk = leg.mode === "WALK";
                      const routeLabel = isWalk
                        ? "Walk"
                        : leg.route?.shortName
                        ? `${leg.route.shortName}${leg.route.longName ? ` - ${leg.route.longName}` : ""}`
                        : leg.mode;

                      return (
                        <div key={`leg-${index}`} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <span
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                style={{ backgroundColor: entry.color }}
                              >
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white">{routeLabel}</p>
                                <p className="text-xs text-gray-300">
                                  {(leg.from?.name || "Start")} → {(leg.to?.name || "End")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-300">
                              <p>{formatDuration(leg.duration)}</p>
                              <p>{metersToKilometers(leg.distance)} km</p>
                            </div>
                          </div>
                          {isWalk && Array.isArray(leg.steps) && leg.steps.length > 0 && (
                            <ul className="mt-3 space-y-1 text-xs text-gray-300 list-disc list-inside">
                              {leg.steps.slice(0, 3).map((step, stepIndex) => (
                                <li key={`step-${index}-${stepIndex}`}>
                                  {step.relativeDirection
                                    ? `${step.relativeDirection.toLowerCase()} on`
                                    : "Continue on"} {step.streetName}
                                </li>
                              ))}
                              {leg.steps.length > 3 && (
                                <li>... {leg.steps.length - 3} more steps</li>
                              )}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    onClick={handleClear}
                  >
                    Plan New Route
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop toggle button */}
      <button 
        onClick={() => setPanelState(panelState === "collapsed" ? "half" : "collapsed")}
        className="hidden md:flex absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-full shadow-lg z-30 hover:bg-gray-800 transition-colors"
        aria-label="Toggle panel"
      >
        <ChevronDownIcon className={`w-5 h-5 transform transition-transform ${panelState === "collapsed" ? "rotate-180" : ""}`} />
      </button>

      {/* Mode indicator */}
      <div className="absolute top-4 left-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-30">
        {mode === "origin" ? "Select origin on map" : "Select destination on map"}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white mt-4 text-lg font-medium">
              Finding best route...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Map;
