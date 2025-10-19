import callOtp from './graphqlClient';

const ROUTES_QUERY = `
  query Routes($modes: [Mode!]!) {
    routes(filterByModes: $modes) {
      id
      shortName
      longName
      mode
    }
  }
`;

const PLAN_QUERY = `
  query PlanTrip(
    $from: InputCoordinates!
    $to: InputCoordinates!
    $numItineraries: Int!
    $modes: [TransportMode!]
    $maxWalkDistance: Float
    $wheelchair: Boolean
    $time: TimeInput!
    $arriveBy: Boolean
  ) {
    plan(
      from: { coordinates: $from }
      to: { coordinates: $to }
      numItineraries: $numItineraries
      transportModes: $modes
      maxWalkDistance: $maxWalkDistance
      wheelchair: $wheelchair
      dateTime: $time
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
          steps {
            lat
            lon
            distance
            streetName
            relativeDirection
            absoluteDirection
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

export async function fetchRoutes(modes = ['BUS']) {
  const normalizedModes = Array.isArray(modes) ? modes : [modes];
  const data = await callOtp(ROUTES_QUERY, { modes: normalizedModes });
  return data?.routes ?? [];
}

function buildTransportModes(modes = []) {
  const normalized = Array.isArray(modes) ? modes : [modes];
  return normalized
    .map((mode) => {
      if (typeof mode === 'string') {
        return { mode: mode.toUpperCase() };
      }
      return mode;
    })
    .filter(Boolean);
}

function resolveTimezone() {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
  } catch (error) {
    // Ignore and fall back to UTC.
  }
  return 'UTC';
}

function toTimeInput(time) {
  if (time && time.date && time.time) {
    return {
      date: time.date,
      time: time.time,
      timezone: time.timezone || resolveTimezone(),
    };
  }

  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    timezone: resolveTimezone(),
  };
}

export async function planTrip(from, to, options = {}) {
  const {
    numItineraries = 3,
    modes = ['BUS', 'TRAM'],
    maxWalkDistance = 1000,
    wheelchair = false,
    time,
    arriveBy = false,
  } = options;

  const variables = {
    from,
    to,
    numItineraries,
    modes: buildTransportModes(modes),
    maxWalkDistance,
    wheelchair,
    time: toTimeInput(time),
    arriveBy,
  };

  return callOtp(PLAN_QUERY, variables);
}

export async function searchRoute(fromLat, fromLon, toLat, toLon, options = {}) {
  const from = { lat: Number(fromLat), lon: Number(fromLon) };
  const to = { lat: Number(toLat), lon: Number(toLon) };

  if (Number.isNaN(from.lat) || Number.isNaN(from.lon) || Number.isNaN(to.lat) || Number.isNaN(to.lon)) {
    throw new Error('Invalid coordinates supplied to searchRoute');
  }

  return planTrip(from, to, options);
}

export const queries = {
  ROUTES_QUERY,
  PLAN_QUERY,
};

export default {
  fetchRoutes,
  planTrip,
  searchRoute,
};
