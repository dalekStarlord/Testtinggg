const OTP_URL = import.meta.env.VITE_OTP_URL || "https://8f2a63eb4d94.ngrok-free.app";

const VALID_TRANSIT_MODES = new Set([
  "BUS",
  "TRAM",
  "RAIL",
  "SUBWAY",
  "FERRY",
  "CABLE_CAR",
  "GONDOLA",
  "FUNICULAR",
]);

const VALID_MODE_QUALIFIERS = new Set([
  "LOCAL_BUS",
  "REGIONAL_BUS",
  "INTERCITY_BUS",
  "EXPRESS_BUS",
]);

const DEFAULT_TRANSIT_MODES = [
  { mode: "BUS", qualifier: "LOCAL_BUS" },
];

function normalizeTransitModes(modes) {
  const candidates = Array.isArray(modes) && modes.length > 0 ? modes : DEFAULT_TRANSIT_MODES;

  const normalized = candidates
    .map((entry) => {
      if (typeof entry === "string") {
        const [modePart, qualifierPart] = entry.toUpperCase().split(":");
        if (!VALID_TRANSIT_MODES.has(modePart)) {
          return null;
        }

        const normalizedMode = { mode: modePart };
        if (qualifierPart && VALID_MODE_QUALIFIERS.has(qualifierPart)) {
          normalizedMode.qualifier = qualifierPart;
        }
        return normalizedMode;
      }

      if (entry && typeof entry === "object") {
        const modeValue = typeof entry.mode === "string" ? entry.mode.toUpperCase() : null;
        if (!modeValue || !VALID_TRANSIT_MODES.has(modeValue)) {
          return null;
        }

        const normalizedMode = { mode: modeValue };
        if (entry.qualifier && typeof entry.qualifier === "string") {
          const qualifierValue = entry.qualifier.toUpperCase();
          if (VALID_MODE_QUALIFIERS.has(qualifierValue)) {
            normalizedMode.qualifier = qualifierValue;
          }
        }
        return normalizedMode;
      }

      return null;
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_TRANSIT_MODES;
}

// Search for locations (autocomplete)
export async function searchLocations(searchText) {
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
      })
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
export async function getNearbyStops(lat, lon, radius = 500) {
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
      })
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
export async function searchRoute(fromLat, fromLon, toLat, toLon, options = {}) {
  const {
    numItineraries = 3,
    transitModes,
    maxWalkDistance = 1000,
    wheelchair = false,
    time = new Date().toISOString(),
    arriveBy = false,
  } = options;

  const normalizedTransitModes = normalizeTransitModes(transitModes);

  const query = `
    query planTrip(
      $from: InputCoordinates!, 
      $to: InputCoordinates!,
      $numItineraries: Int!,
      $modes: [TransitMode!],
      $maxWalkDistance: Float,
      $wheelchair: Boolean,
      $time: String!,
      $arriveBy: Boolean
    ) {
      plan(
        from: $from
        to: $to
        numItineraries: $numItineraries
        transportModes: $modes
        maxWalkDistance: $maxWalkDistance
        wheelchair: $wheelchair
        time: $time
        arriveBy: $arriveBy
      ) {
        itineraries {
          duration
          walkTime
          transitTime
          waitingTime
          distance
          legs {
            mode
            startTime
            endTime
            duration
            distance
            route {
              shortName
              longName
              type
              color
              textColor
            }
            from {
              name
              lat
              lon
              stop {
                gtfsId
                code
                platformCode
              }
            }
            to {
              name
              lat
              lon
              stop {
                gtfsId
                code
                platformCode
              }
            }
            legGeometry {
              length
              points
            }
            steps {
              distance
              streetName
              relativeDirection
              absoluteDirection
              stayOn
              bogusName
              lon
              lat
            }
            alerts {
              alertHeaderText
              alertDescriptionText
              effectiveStartDate
              effectiveEndDate
            }
          }
          fare {
            type
            currency
            cents
          }
          fares {
            type
            currency
            cents
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
          from: {
            lat: fromLat,
            lon: fromLon
          },
          to: {
            lat: toLat,
            lon: toLon
          },
          numItineraries,
          modes: normalizedTransitModes,
          maxWalkDistance,
          wheelchair,
          time,
          arriveBy
        }
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();

    if (Array.isArray(result?.errors) && result.errors.length > 0) {
      const message = result.errors
        .map((error) => error?.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(message || 'The OTP server returned an unknown error.');
    }

    return result;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}
