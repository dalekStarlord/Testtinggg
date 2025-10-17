const OTP_URL = import.meta.env.VITE_OTP_URL || 'https://2b36aa1affb0.ngrok-free.app';

// Search for locations (autocomplete)
export async function searchLocations(searchText, signal) {
  const trimmed = searchText?.trim();
  if (!trimmed) {
    return [];
  }

  const url = new URL(`${OTP_URL}/otp/routers/default/geocode`);
  url.searchParams.set('text', trimmed);
  url.searchParams.set('size', '20');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    if (Array.isArray(result)) {
      return result;
    }

    if (result?.features && Array.isArray(result.features)) {
      return result.features;
    }

    return [];
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

// Get nearby stops
export async function getNearbyStops(lat, lon, radius = 500, signal) {
  const url = new URL(`${OTP_URL}/otp/routers/default/index/stops`);

  const toRadians = (value) => (value * Math.PI) / 180;
  const distanceBetween = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000; // metres
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  try {
    const response = await fetch(url.toString(), { signal });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const stops = await response.json();
    if (!Array.isArray(stops)) {
      return [];
    }

    return stops
      .map((stop) => {
        if (typeof stop?.lat !== 'number' || typeof stop?.lon !== 'number') {
          return null;
        }

        const distance = distanceBetween(lat, lon, stop.lat, stop.lon);
        if (distance > radius) {
          return null;
        }

        return {
          node: {
            stop: {
              gtfsId: stop.id || stop.gtfsId,
              name: stop.name,
              lat: stop.lat,
              lon: stop.lon,
              routes: stop.routes || [],
            },
            distance,
          },
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error fetching nearby stops:', error);
    throw error;
  }
}

const ROUTE_PLAN_QUERY = `
  query PlanJeepney(
    $fromLat: Float!
    $fromLon: Float!
    $toLat: Float!
    $toLon: Float!
    $date: String!
    $time: String!
    $arriveBy: Boolean!
    $numItineraries: Int!
    $maxWalkDistance: Int!
    $wheelchair: Boolean!
    $transportModes: [TransportMode!]!
  ) {
    plan(
      from: { lat: $fromLat, lon: $fromLon }
      to: { lat: $toLat, lon: $toLon }
      date: $date
      time: $time
      arriveBy: $arriveBy
      wheelchair: $wheelchair
      maxWalkDistance: $maxWalkDistance
      numItineraries: $numItineraries
      transportModes: $transportModes
    ) {
      itineraries {
        duration
        walkTime
        walkDistance
        fares {
          type
          currency
          cents
        }
        fareProducts {
          id
          name
          amount {
            currency
            cents
          }
        }
        legs {
          mode
          distance
          duration
          realtime
          aimedStartTime
          aimedEndTime
          startTime
          endTime
          from {
            name
            lat
            lon
            stop {
              gtfsId
            }
          }
          to {
            name
            lat
            lon
            stop {
              gtfsId
            }
          }
          line {
            id
            publicCode
            name
            colour
            textColour
          }
          serviceJourney {
            line {
              id
              publicCode
              name
              colour
              textColour
            }
          }
          route {
            id
            shortName
            longName
            color
            textColor
          }
          alerts {
            alertHeaderText
          }
          legGeometry {
            length
            points
          }
        }
      }
    }
  }
`;

// Enhanced route search with more options
export async function searchRoute(fromLat, fromLon, toLat, toLon, options = {}, signal) {
  const {
    numItineraries = 3,
    maxWalkDistance = 1000,
    wheelchair = false,
    time = new Date(),
    arriveBy = false,
    allowedTransitModes = ['BUS'],
  } = options;

  const dateTime =
    time instanceof Date && !Number.isNaN(time.getTime())
      ? time
      : new Date(time);

  const dateSource = Number.isNaN(dateTime.getTime()) ? new Date() : dateTime;

  const date = dateSource.toISOString().split('T')[0];
  const timeString = dateSource.toTimeString().split(' ')[0].slice(0, 5);

  const transportModes = allowedTransitModes.map((mode) => ({ mode }));

  try {
    const response = await fetch(`${OTP_URL}/otp/transmodel/v3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        query: ROUTE_PLAN_QUERY,
        variables: {
          fromLat,
          fromLon,
          toLat,
          toLon,
          date,
          time: timeString,
          arriveBy,
          wheelchair,
          maxWalkDistance,
          numItineraries,
          transportModes,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const json = await response.json();

    if (json.errors && json.errors.length) {
      const message = json.errors.map((error) => error.message).join('; ');
      throw new Error(message || 'GraphQL response contained errors');
    }

    return json.data ?? {};
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}
