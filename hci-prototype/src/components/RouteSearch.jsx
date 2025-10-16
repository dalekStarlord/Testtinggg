import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { searchRoute } from '../api/otpClient';
import { SearchIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// This component updates the map view when markers change
function MapUpdater({ points }) {
  const map = useMap();
  
  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) {
      // Reset to default view if no points
      map.setView([8.4542, 124.6319], 14);
      return;
    }
    
    if (points.length === 1) {
      // Single point, center on it
      map.setView(points[0], 15);
      return;
    }

    try {
      const bounds = L.latLngBounds(points);
      // Add padding and min zoom to ensure good visibility
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 16 // Don't zoom in too close
      });
    } catch (error) {
      console.error('Error updating map bounds:', error);
      // Fallback to default view
      map.setView([8.4542, 124.6319], 14);
    }
  }, [points, map]);

  return null;
}

function MapSearch({ onSelectLocation }) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();

  const searchLocation = useCallback(async (text) => {
    if (!text) {
      setResults([]);
      setError(null);
      return;
    }
    
    setIsSearching(true);
    setResults([]);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(text + ' Cagayan de Oro')}&` +
        `format=json&bounded=1&viewbox=124.5319,8.3542,124.7319,8.5542`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations. Please try again.');
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!Array.isArray(data)) {
        throw new Error('Invalid response from search service');
      }
      
      const filteredResults = data.filter(result => {
        if (!result.lat || !result.lon || !result.display_name) return false;
        
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        return result.display_name.toLowerCase().includes('cagayan de oro') &&
          !isNaN(lat) && !isNaN(lon) &&
          lat >= 8.3542 && lat <= 8.5542 &&
          lon >= 124.5319 && lon <= 124.7319;
      });
      
      setResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      if (error.name === 'AbortError') {
        setError('Search took too long. Please try again.');
      } else {
        setError(error.message || 'Failed to search locations. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] bg-white rounded-lg shadow-lg">
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
          <SearchIcon className="w-5 h-5" />
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
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => {
                const coords = { 
                  lat: parseFloat(result.lat), 
                  lon: parseFloat(result.lon),
                  name: result.display_name.split(',')[0]
                };
                onSelectLocation(coords);
                setResults([]);
                setSearchText('');
                map.flyTo([coords.lat, coords.lon], 15);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RouteSearch() {
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [isSettingFrom, setIsSettingFrom] = useState(true);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);

  const handleSearch = async () => {
    if (!fromCoords || !toCoords) {
      setError('Please select both starting point and destination');
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);
    setRoutePoints([]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for route search

      const result = await searchRoute(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon,
        {
          mode: 'TRANSIT,WALK',
          time: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      );

      clearTimeout(timeoutId);
      
      if (!result || !result.plan) {
        throw new Error('No route found. Try different locations or try again later.');
      }
      
      setRoute(result);
      
      // Extract route points for the map if available
      if (result.plan?.itineraries?.[0]) {
        const points = [];
        const itinerary = result.plan.itineraries[0];
        
        itinerary.legs.forEach(leg => {
          if (Array.isArray(leg.steps)) {
            leg.steps.forEach(step => {
              if (step && typeof step.lat === 'number' && typeof step.lon === 'number') {
                points.push([step.lat, step.lon]);
              }
            });
          }
        });
        
        if (points.length > 0) {
          setRoutePoints(points);
        } else {
          console.warn('No valid route points found in the response');
        }
      }
    } catch (err) {
      console.error('Route search error:', err);
      if (err.name === 'AbortError') {
        setError('Route search took too long. Please try again.');
      } else {
        setError(err.message || 'Failed to find route. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="route-search p-4 space-y-4">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">From</label>
            <div className="mt-1 relative">
              <div
                onClick={() => setIsSettingFrom(true)}
                className={`p-2 border rounded-md cursor-pointer ${
                  !fromLocation ? 'text-gray-500' : ''
                } ${isSettingFrom ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
              >
                {fromLocation || 'Click to set start location on map'}
              </div>
              {fromLocation && (
                <button
                  onClick={() => {
                    setFromLocation('');
                    setFromCoords(null);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">To</label>
            <div className="mt-1 relative">
              <div
                onClick={() => setIsSettingFrom(false)}
                className={`p-2 border rounded-md cursor-pointer ${
                  !toLocation ? 'text-gray-500' : ''
                } ${!isSettingFrom ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
              >
                {toLocation || 'Click to set destination on map'}
              </div>
              {toLocation && (
                <button
                  onClick={() => {
                    setToLocation('');
                    setToCoords(null);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !fromCoords || !toCoords}
          className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md ${
            loading || !fromCoords || !toCoords ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
        >
          {loading ? 'Searching...' : 'Find Route'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {route && route.plan && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Route Found</h3>
          {route.plan.itineraries.map((itinerary, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Time</p>
                  <p className="font-semibold">{Math.round(itinerary.duration / 60)} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Walking Time</p>
                  <p className="font-semibold">{Math.round(itinerary.walkTime / 60)} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transit Time</p>
                  <p className="font-semibold">{Math.round(itinerary.transitTime / 60)} min</p>
                </div>
              </div>

              <div className="space-y-4">
                {itinerary.legs.map((leg, legIndex) => (
                  <div key={legIndex} className="flex items-start space-x-3">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-white ${
                      leg.mode === 'WALK' ? 'bg-gray-500' : 'bg-blue-500'
                    }`}>
                      <span className="text-xs">
                        {leg.mode === 'WALK' ? '🚶' : '🚌'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {leg.mode === 'WALK' ? 'Walk' : `Take ${leg.route}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.round(leg.duration / 60)} minutes
                        {leg.distance && ` (${(leg.distance / 1000).toFixed(1)} km)`}
                      </p>
                      {leg.from && leg.to && (
                        <p className="text-sm text-gray-500">
                          From {leg.from.name} to {leg.to.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 h-96 relative">
        <MapContainer
          center={[8.4542, 124.6319]} // Default center at Divisoria
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <MapSearch 
            onSelectLocation={(location) => {
              // Validate coordinates
              const lat = parseFloat(location.lat);
              const lon = parseFloat(location.lon);
              
              if (isNaN(lat) || isNaN(lon)) {
                setError('Invalid location coordinates received');
                return;
              }

              // Validate coordinates are within CDO bounds
              if (lat < 8.3542 || lat > 8.5542 || lon < 124.5319 || lon > 124.7319) {
                setError('Selected location is outside CDO bounds');
                return;
              }

              const validatedLocation = {
                lat,
                lon,
                name: location.name || 'Selected Location'
              };

              if (!fromCoords || (fromCoords && toCoords)) {
                // Reset route when changing locations
                setRoute(null);
                setRoutePoints([]);
                setError(null);
                
                // If no locations set or both are set, set as from location
                setFromCoords(validatedLocation);
                setFromLocation(validatedLocation.name);
                setToCoords(null);
                setToLocation('');
              } else {
                // If only from is set, set as to location
                setToCoords(validatedLocation);
                setToLocation(validatedLocation.name);
              }
            }} 
          />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {fromCoords && (
            <Marker position={[fromCoords.lat, fromCoords.lon]}>
              <Popup>{fromLocation || 'Start Location'}</Popup>
            </Marker>
          )}
          
          {toCoords && (
            <Marker position={[toCoords.lat, toCoords.lon]}>
              <Popup>{toLocation || 'Destination'}</Popup>
            </Marker>
          )}

          {routePoints.length > 0 && (
            <Polyline
              positions={routePoints}
              color="blue"
              weight={3}
              opacity={0.7}
            />
          )}

          {fromCoords && toCoords && (
            <MapUpdater points={[[fromCoords.lat, fromCoords.lon], [toCoords.lat, toCoords.lon]]} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}