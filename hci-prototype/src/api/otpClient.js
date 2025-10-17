const OTP_URL = import.meta.env.VITE_OTP_URL || 'https://8f2a63eb4d94.ngrok-free.app';

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
    modes = ['TRANSIT', 'WALK'],
    maxWalkDistance = 1000,
    wheelchair = false,
    time = new Date().toISOString(),
    arriveBy = false
  } = options;

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
          modes: modes.map(mode => ({ mode })),
          maxWalkDistance,
          wheelchair,
          time,
          arriveBy
        }
      }),
      signal
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
