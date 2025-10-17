const OTP_URL = import.meta.env.VITE_OTP_URL || 'https://2b36aa1affb0.ngrok-free.app';

// Search for locations (autocomplete)
export async function searchLocations(searchText, signal) {
  const query = `
    query locationSearch($text: String!) {
      geocode(searchText: $text) {
        features {
          properties {
            name
            label
          }
          geometry {
            coordinates
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`${OTP_URL}/otp/routers/default/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          text: searchText
        }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    return result.data?.geocode?.features || [];
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

// Get nearby stops
export async function getNearbyStops(lat, lon, radius = 500, signal) {
  const query = `
    query stopsNearby($lat: Float!, $lon: Float!, $radius: Int!) {
      stopsByRadius(lat: $lat, lon: $lon, radius: $radius) {
        edges {
          node {
            stop {
              gtfsId
              name
              lat
              lon
              routes {
                shortName
                longName
              }
            }
            distance
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`${OTP_URL}/otp/routers/default/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          lat,
          lon,
          radius
        }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    return result.data?.stopsByRadius?.edges || [];
  } catch (error) {
    console.error('Error fetching nearby stops:', error);
    throw error;
  }
}

// Enhanced route search with more options
export async function searchRoute(fromLat, fromLon, toLat, toLon, options = {}, signal) {
  const {
    numItineraries = 3,
    maxWalkDistance = 1000,
    wheelchair = false,
    time = new Date(),
    arriveBy = false,
    allowedTransitModes = ['BUS']
  } = options;

  const searchParams = new URLSearchParams({
    fromPlace: `${fromLat},${fromLon}`,
    toPlace: `${toLat},${toLon}`,
    numItineraries: String(numItineraries),
    maxWalkDistance: String(maxWalkDistance),
    wheelchair: String(Boolean(wheelchair)),
    arriveBy: String(Boolean(arriveBy)),
    mode: 'TRANSIT',
    locale: 'en',
    showIntermediateStops: 'false',
    allowedTransitModes: allowedTransitModes.join(','),
  });

  if (time instanceof Date) {
    searchParams.set('date', time.toISOString().split('T')[0]);
    searchParams.set('time', time.toTimeString().split(' ')[0].slice(0, 5));
  } else if (typeof time === 'string') {
    const parsed = new Date(time);
    if (!Number.isNaN(parsed.getTime())) {
      searchParams.set('date', parsed.toISOString().split('T')[0]);
      searchParams.set('time', parsed.toTimeString().split(' ')[0].slice(0, 5));
    }
  }

  try {
    const response = await fetch(`${OTP_URL}/otp/routers/default/plan?${searchParams.toString()}`, {
      method: 'GET',
      signal,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}
