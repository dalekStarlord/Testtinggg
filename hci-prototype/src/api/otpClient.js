import { decode as decodePolyline } from '../utils/polyline.js'

const rawBaseUrl = (import.meta.env.VITE_OTP_URL || '').trim()
const normalizedBase = rawBaseUrl.replace(/\/+$/, '')

const otpConfig = (() => {
  if (!normalizedBase) {
    return {
      restBase: '',
      graphqlEndpoint: '',
    }
  }

  if (/\/transmodel\/v3$/i.test(normalizedBase)) {
    const restBase = normalizedBase.replace(/\/transmodel\/v3$/i, '') || '/otp'
    return {
      restBase,
      graphqlEndpoint: normalizedBase,
    }
  }

  if (/\/otp$/i.test(normalizedBase)) {
    return {
      restBase: normalizedBase,
      graphqlEndpoint: `${normalizedBase}/transmodel/v3`,
    }
  }

  return {
    restBase: `${normalizedBase}/otp`,
    graphqlEndpoint: `${normalizedBase}/otp/transmodel/v3`,
  }
})()

const OTP_BASE_URL = otpConfig.restBase
const OTP_GRAPHQL_ENDPOINT = otpConfig.graphqlEndpoint

function buildOtpUrl(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (OTP_BASE_URL) {
    return `${OTP_BASE_URL}${cleanPath}`
  }
  return `/otp${cleanPath}`
}

function buildOtpUrlWithParams(path, params = {}) {
  const base = buildOtpUrl(path)
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')

  if (!entries.length) {
    return base
  }

  if (/^https?:\/\//i.test(base)) {
    const url = new URL(base)
    for (const [key, value] of entries) {
      url.searchParams.set(key, value)
    }
    return url.toString()
  }

  const query = new URLSearchParams(entries).toString()
  return query ? `${base}?${query}` : base
}

// Search for locations (autocomplete)
export async function searchLocations(searchText, signal) {
  const trimmed = searchText?.trim()
  if (!trimmed) {
    return []
  }

  const url = buildOtpUrlWithParams('/routers/default/geocode', {
    text: trimmed,
    size: '20',
  })

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal,
    })

    if (!response.ok) {
      throw new Error(`Location search failed (${response.status})`)
    }

    const result = await response.json()
    if (Array.isArray(result)) {
      return result
    }

    if (result?.features && Array.isArray(result.features)) {
      return result.features
    }

    return []
  } catch (error) {
    console.error('Error searching locations:', error)
    throw error
  }
}

// Get nearby stops
export async function getNearbyStops(lat, lon, radius = 500, signal) {
  const url = buildOtpUrl('/routers/default/index/stops')

  const toRadians = (value) => (value * Math.PI) / 180
  const distanceBetween = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000 // metres
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadius * c
  }

  try {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`Nearby stops request failed (${response.status})`)
    }

    const stops = await response.json()
    if (!Array.isArray(stops)) {
      return []
    }

    return stops
      .map((stop) => {
        if (typeof stop?.lat !== 'number' || typeof stop?.lon !== 'number') {
          return null
        }

        const distance = distanceBetween(lat, lon, stop.lat, stop.lon)
        if (distance > radius) {
          return null
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
        }
      })
      .filter(Boolean)
  } catch (error) {
    console.error('Error fetching nearby stops:', error)
    throw error
  }
}

export const ROUTE_PLAN_QUERY = `
  query PlanJeepney(
    $fromLat: Float!
    $fromLon: Float!
    $toLat: Float!
    $toLon: Float!
    $date: String!
    $time: String!
    $arriveBy: Boolean!
    $numItineraries: Int!
  ) {
    plan: trip(
      from: { coordinates: { latitude: $fromLat, longitude: $fromLon } }
      to: { coordinates: { latitude: $toLat, longitude: $toLon } }
      dateTime: { date: $date, time: $time }
      arriveBy: $arriveBy
      numTripPatterns: $numItineraries
    ) {
      itineraries: tripPatterns {
        startTime: expectedStartTime
        endTime: expectedEndTime
        duration
        walkTime
        walkDistance
        legs {
          mode
          transportSubmode
          distance
          duration
          expectedStartTime
          expectedEndTime
          aimedStartTime
          aimedEndTime
          line {
            id
            publicCode
            name
          }
          serviceJourney {
            line {
              id
              publicCode
              name
            }
          }
          fromPlace {
            __typename
            name
          }
          toPlace {
            __typename
            name
          }
          pointsOnLink {
            points
          }
          legGeometry {
            points
          }
        }
      }
    }
  }
`

// Enhanced route search with more options
export async function searchRoute(fromLat, fromLon, toLat, toLon, options = {}, signal) {
  const {
    numItineraries = 3,
    time = new Date(),
    arriveBy = false,
  } = options

  const dateTime =
    time instanceof Date && !Number.isNaN(time.getTime())
      ? time
      : new Date(time)

  const dateSource = Number.isNaN(dateTime.getTime()) ? new Date() : dateTime

  const date = dateSource.toISOString().split('T')[0]
  const timeString = dateSource.toTimeString().split(' ')[0].slice(0, 5)

  const graphqlUrl = OTP_GRAPHQL_ENDPOINT || buildOtpUrl('/transmodel/v3')

  try {
    const response = await fetch(graphqlUrl, {
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
          numItineraries,
        },
      }),
    })

    const rawText = await response.text()

    if (!response.ok) {
      const reason = rawText || response.statusText || 'Network response was not ok'
      throw new Error(`GraphQL request failed (${response.status}): ${reason}`)
    }

    let json
    try {
      json = rawText ? JSON.parse(rawText) : {}
    } catch (parseError) {
      throw new Error(`Failed to parse GraphQL response: ${parseError.message}`)
    }

    if (json.errors && json.errors.length) {
      const message = json.errors.map((error) => error.message).join('; ')
      throw new Error(message || 'GraphQL response contained errors')
    }

    return normaliseTripResponse(json.data)
  } catch (error) {
    console.error('Error fetching route:', error)
    throw error
  }
}

function normaliseTripResponse(data) {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const plan = data.plan
  if (!plan || !Array.isArray(plan.itineraries)) {
    return data
  }

  const normalisedItineraries = plan.itineraries.map((pattern) => {
    const legs = Array.isArray(pattern.legs) ? pattern.legs.map(normaliseTripLeg) : []

    const fares = Array.isArray(pattern.fares)
      ? pattern.fares.map((fare) => ({
          type: fare?.type ?? null,
          currency: fare?.amount?.currency ?? fare?.currency ?? null,
          cents: fare?.amount?.cents ?? fare?.cents ?? null,
        }))
      : []

    const fareProducts = Array.isArray(pattern.fareProducts)
      ? pattern.fareProducts.map((product) => ({
          ...product,
          amount: {
            currency: product?.amount?.currency ?? null,
            cents: product?.amount?.cents ?? null,
          },
        }))
      : []

    return {
      ...pattern,
      duration: pattern?.duration ?? null,
      walkTime: pattern?.walkTime ?? null,
      walkDistance: pattern?.walkDistance ?? null,
      legs,
      fares,
      fareProducts,
    }
  })

  return {
    plan: {
      itineraries: normalisedItineraries,
    },
  }
}

function resolveCoordinate(candidateGetters) {
  for (const getter of candidateGetters) {
    try {
      const value = getter()
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value
      }
    } catch {
      // Ignore accessor failures and try the next candidate
    }
  }
  return null
}

function normaliseTripLeg(leg) {
  if (!leg || typeof leg !== 'object') {
    return {}
  }

  const geometryPoints = leg.pointsOnLink?.points ?? leg.legGeometry?.points ?? ''
  const decodedGeometry = geometryPoints ? decodePolyline(geometryPoints) : []
  const derivedFrom = decodedGeometry.length ? { lat: decodedGeometry[0][0], lon: decodedGeometry[0][1] } : null
  const derivedTo = decodedGeometry.length
    ? { lat: decodedGeometry[decodedGeometry.length - 1][0], lon: decodedGeometry[decodedGeometry.length - 1][1] }
    : null

  const from = mapTripPlace(leg.fromPlace, derivedFrom)
  const to = mapTripPlace(leg.toPlace, derivedTo)

  const startTime = leg.expectedStartTime || leg.aimedStartTime || null
  const endTime = leg.expectedEndTime || leg.aimedEndTime || null
  const duration = leg.duration ?? (startTime && endTime ? (new Date(endTime) - new Date(startTime)) / 1000 : null)

  const primaryLine = leg.line || leg.serviceJourney?.line || null

  const route = {
    id: primaryLine?.id ?? null,
    shortName: primaryLine?.publicCode ?? null,
    longName: primaryLine?.name ?? null,
    color: primaryLine?.colour ?? null,
    textColor: primaryLine?.textColour ?? null,
  }

  return {
    ...leg,
    mode: leg.mode ?? leg.transportMode ?? null,
    transportMode: leg.transportMode ?? leg.mode ?? null,
    distance: leg.distance ?? null,
    duration,
    aimedStartTime: leg.aimedStartTime ?? null,
    aimedEndTime: leg.aimedEndTime ?? null,
    startTime,
    endTime,
    from,
    to,
    line: primaryLine,
    route,
    legGeometry: {
      points: geometryPoints,
      length: leg.legGeometry?.length ?? null,
    },
    alerts: leg.alerts ?? [],
    realtime: leg.realtime ?? null,
  }
}

function mapTripPlace(place, fallback) {
  if (!place || typeof place !== 'object') {
    return null
  }

  const stopId =
    place.stopPlace?.id || place.quay?.stopPlace?.id || place.quay?.id || null

  const lat = resolveCoordinate([
    () => place.location?.latitude,
    () => place.location?.lat,
    () => place.coordinates?.latitude,
    () => place.coordinates?.lat,
    () => place.latitude,
    () => place.lat,
    () => place.quay?.latitude,
    () => place.quay?.lat,
    () => place.quay?.stopPlace?.latitude,
    () => place.quay?.stopPlace?.lat,
    () => fallback?.lat,
  ])

  const lon = resolveCoordinate([
    () => place.location?.longitude,
    () => place.location?.lon,
    () => place.coordinates?.longitude,
    () => place.coordinates?.lon,
    () => place.longitude,
    () => place.lon,
    () => place.quay?.longitude,
    () => place.quay?.lon,
    () => place.quay?.stopPlace?.longitude,
    () => place.quay?.stopPlace?.lon,
    () => fallback?.lon,
  ])

  return {
    name: place.name ?? null,
    type: place.__typename ?? null,
    lat,
    lon,
    stop: stopId
      ? {
          gtfsId: stopId,
        }
      : null,
  }
}

export function describeOtpBaseUrl() {
  if (OTP_BASE_URL) {
    return OTP_BASE_URL
  }
  return 'Vite dev proxy (/otp → target)'
}

export function describeOtpGraphqlUrl() {
  if (OTP_GRAPHQL_ENDPOINT) {
    return OTP_GRAPHQL_ENDPOINT
  }
  return 'Derived from proxy (/otp/transmodel/v3)'
}
