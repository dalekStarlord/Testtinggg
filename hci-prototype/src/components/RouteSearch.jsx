import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { searchRoute } from '../api/otpClient';
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
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
}

export default function RouteSearch() {
  const [fromCoords, setFromCoords] = useState({ lat: 8.4542, lon: 124.6319 }); // CDO coordinates
  const [connectionStatus, setConnectionStatus] = useState('');

  const testConnection = async () => {
    try {
      setConnectionStatus('Testing OTP connection...');
      // Test coordinates in CDO (Divisoria to Centrio Mall)
      const result = await searchRoute(
        8.4542, 124.6319,  // Divisoria
        8.4577, 124.6286,  // Centrio Mall
        {
          mode: 'TRANSIT,WALK',
          time: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      );
      console.log('OTP Response:', result);
      if (result) {
        setConnectionStatus('✅ Connection successful! Check browser console (F12) for response details.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus(`❌ Connection failed: ${error.message}. Check browser console (F12) for details.`);
    }
  };
  const [toCoords, setToCoords] = useState({ lat: 14.5995, lon: 120.9842 });
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await searchRoute(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon
      );
      setRoute(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        <button
          onClick={testConnection}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          Test OTP Connection
        </button>
        {connectionStatus && (
          <div className={`p-4 mb-4 rounded ${
            connectionStatus.includes('failed') 
              ? 'bg-red-100 text-red-700' 
              : connectionStatus.includes('successful')
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
          }`}>
            {connectionStatus}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold">From:</h3>
          <input
            type="number"
            placeholder="Latitude"
            value={fromCoords.lat}
            onChange={(e) => setFromCoords(prev => ({ ...prev, lat: e.target.value }))}
            className="mr-2 p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={fromCoords.lon}
            onChange={(e) => setFromCoords(prev => ({ ...prev, lon: e.target.value }))}
            className="p-2 border rounded"
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">To:</h3>
          <input
            type="number"
            placeholder="Latitude"
            value={toCoords.lat}
            onChange={(e) => setToCoords(prev => ({ ...prev, lat: e.target.value }))}
            className="mr-2 p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={toCoords.lon}
            onChange={(e) => setToCoords(prev => ({ ...prev, lon: e.target.value }))}
            className="p-2 border rounded"
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Searching...' : 'Search Route'}
        </button>

        {error && (
          <div className="text-red-500 p-2 bg-red-50 rounded">
            Error: {error}
          </div>
        )}

        {route && (
          <div className="mt-4">
            {/* Test Connection Section */}
            <div className="mb-4 p-4 bg-gray-100 rounded">
              <button
                onClick={testConnection}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2"
              >
                Test OTP Connection
              </button>
              {connectionStatus && (
                <div className={`mt-2 p-2 rounded ${
                  connectionStatus.includes('✅') ? 'bg-green-100' : 
                  connectionStatus.includes('❌') ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {connectionStatus}
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold mb-2">Routes Found:</h2>
            <div className="bg-gray-50 p-4 rounded shadow">
              {route.plan?.itineraries?.map((itinerary, i) => (
                <div key={i} className="mb-4 p-2 border-b">
                  <p>Duration: {Math.round(itinerary.duration / 60)} minutes</p>
                  <p>Walk time: {Math.round(itinerary.walkTime / 60)} minutes</p>
                  <p>Transit time: {Math.round(itinerary.transitTime / 60)} minutes</p>
                  {itinerary.legs.map((leg, j) => (
                    <div key={j} className="ml-4 mt-2">
                      <p>Mode: {leg.mode}</p>
                      <p>From: {leg.from.name}</p>
                      <p>To: {leg.to.name}</p>
                      {leg.route && (
                        <p>Route: {leg.route.shortName || leg.route.longName}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}