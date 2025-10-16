const OTP_URL = import.meta.env.VITE_OTP_URL || 'https://4d0ea4f3ab9a.ngrok-free.app';

export async function searchRoute(fromLat, fromLon, toLat, toLon) {
  const query = `
    query planTrip($from: InputCoordinates!, $to: InputCoordinates!) {
      plan(
        from: $from
        to: $to
        numItineraries: 3
        transportModes: [{ mode: TRANSIT }]
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
            }
            from {
              name
              lat
              lon
            }
            to {
              name
              lat
              lon
            }
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
          }
        }
      })
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