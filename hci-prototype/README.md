# CDO Jeepney Planner

This Vite + React + Tailwind project visualises jeepney-only itineraries for Cagayan de Oro using OpenTripPlanner (OTP) 2.8's GraphQL API. The planner renders OTP results on a Leaflet map with a responsive search panel that works on both mobile and desktop layouts.

## OTP GraphQL trip planning

The frontend posts to `/otp/transmodel/v3` (through the Vite `/otp` proxy in development) with the `PlanJeepney` query. Important implementation details:

```graphql
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
      legs {
        mode
        distance
        expectedStartTime
        expectedEndTime
        line { id publicCode name }
        serviceJourney { line { id publicCode name } }
        fromPlace { __typename name }
        toPlace { __typename name }
        pointsOnLink { points }
        legGeometry { points }
      }
    }
  }
}
```

`src/api/otpClient.js` normalises the OTP base URL, posts the GraphQL payload, surfaces parse errors, and returns the decoded response for the map to consume. OTP 2.8's Transmodel schema often omits direct latitude/longitude fields on `Place`, so the query keeps only schema-safe fields (`__typename` and `name`) while the normaliser decodes the returned `legGeometry.points` polyline. The first and last vertices of each polyline become the fallback origin/destination coordinates when the backend does not expose endpoint positions directly.

Example variables the frontend sends with that query:

```json
{
  "fromLat": 8.4847,
  "fromLon": 124.6517,
  "toLat": 8.4841,
  "toLon": 124.6579,
  "date": "2024-05-01",
  "time": "08:15",
  "arriveBy": false,
  "numItineraries": 3
}
```

To confirm field availability on your OTP build you can run an introspection query. This example inspects the `Place` type and is handy when fields move between releases:

```bash
curl -X POST "$OTP_URL/otp/transmodel/v3" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query InspectPlace { __type(name: \"Place\") { name fields { name type { name kind ofType { name kind } } } } }"}'
```

Replace `InspectPlace` with other types such as `Leg` or `TripPattern` to discover their supported fields. Once you know the `__typename` values returned in `fromPlace`/`toPlace`, extend the query with inline fragments that request the latitude/longitude fields relevant to those concrete types, for example:

```graphql
fromPlace {
  __typename
  name
  ... on PlaceAtStop {
    quay {
      latitude
      longitude
    }
  }
  ... on Quay {
    latitude
    longitude
  }
}
```

If no coordinate fields are available, rely on the decoded polyline vertices—the frontend already takes the first/last point from `legGeometry.points` as marker positions. Two other helpful snippets when validating leg endpoint structures:

```bash
curl -X POST "$OTP_URL/otp/transmodel/v3" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query InspectLeg { __type(name: \\"Leg\\") { fields { name type { name kind ofType { name kind } } } } }"}'

curl -X POST "$OTP_URL/otp/transmodel/v3" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query InspectPlaceVariants { __type(name: \\"Quay\\") { fields { name type { name kind ofType { name kind } } } } __type(name: \\"StopPlace\\") { fields { name type { name kind ofType { name kind } } } } }"}'
```

Armed with the introspection results you can adjust the inline fragments or fallbacks if your deployment exposes coordinate data through a different field.

## Responsive search experience

`src/components/Map.jsx` renders the Leaflet canvas alongside `src/components/SearchBar.jsx` in a two-column desktop layout (stacked on mobile). The search bar offers:

- Autocomplete suggestions via OTP's `/routers/default/geocode` endpoint.
- "Use map" toggles that let riders pick origin/destination pins directly on the map.
- Loading, error, and empty states for GraphQL requests.
- A troubleshooting checklist covering common 404/GraphQL pitfalls (double `/otp` prefix, CORS blocks, invalid coordinates, etc.).

The map draws jeepney legs by decoding `legGeometry.points` with a Mapbox polyline-compatible decoder (aliased to `@mapbox/polyline`).

## Version stamping & deployment verification

Run `npm run generate-version` (automatically executed before `npm run dev` and `npm run build`) to:

1. Capture Vercel build metadata (`VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, etc.).
2. Emit `public/version.json` for runtime inspection.
3. Update `.env.local` with `VITE_APP_*` variables that surface in the UI footer and the browser console.

At runtime the footer fetches `/version.json` and displays the commit SHA, environment, deploy URL, and build time. You can confirm which revision is live with:

```bash
curl https://your-app-url.vercel.app/version.json
```

The console also logs messages such as:

```
[CDO Jeepney Planner] Build abc1234 | env=production | built=2025-01-01T12:34:56.000Z
[CDO Jeepney Planner] Running abc1234 deployed 2025-01-01T12:34:56.000Z
```

## Development

```bash
npm install
npm run dev   # runs generate-version automatically
```

Configure `VITE_OTP_URL` to point at your OTP instance if you are not using the dev proxy.
You can enter the bare host (`https://<host>`), the OTP root (`https://<host>/otp`), or the
full GraphQL endpoint (`https://<host>/otp/transmodel/v3`)—the client normalises each form
to the correct REST and GraphQL targets.

## Vercel deployment checklist

1. In the Vercel dashboard (Project → Settings → Environment Variables) add
   `VITE_OTP_URL` with the absolute OTP base, e.g. `https://5d511c6dedd2.ngrok-free.app`.
   Values ending in `/otp` or `/otp/transmodel/v3` are also accepted and will be
   normalised automatically.
2. Trigger a new deployment. The build step runs `npm run generate-version`, which emits
   `public/version.json` and writes version metadata consumed by the footer banner.
3. After the deployment completes, verify the running revision:
   - Visit the app and confirm the footer displays the short commit SHA and build time.
   - Run `curl https://<your-app>.vercel.app/version.json` and check the SHA matches the
     latest Git commit.
   - In the browser dev tools network tab ensure GraphQL POST requests target the ngrok
     host rather than `/otp/...` on the Vercel domain.
4. If the map or planner fails to load, work through the troubleshooting card inside the
   planner or use this condensed list:
   - ✅ Check `VITE_OTP_URL` is set on the correct Vercel environment (Production vs Preview).
   - ✅ Confirm the ngrok tunnel is active and reachable from the internet.
   - ✅ Watch for `GraphQL request failed (404)` errors, which indicate the app is still
     pointing at the Vercel origin instead of ngrok.

### Minimal quoting-safe GraphQL probes

When you just need to verify connectivity (or rule out quoting issues) start with the
smallest possible request:

```powershell
Invoke-RestMethod -Method Post -Uri "https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3" `
  -ContentType "application/json" `
  -Body '{"query":"{ __typename }"}'
```

```cmd
curl -X POST "https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"{ __typename }\"}"
```

If those succeed you can move on to the trip planner query. The examples below use the
minimal Transmodel fields you mentioned and show JSON quoting that PowerShell, CMD, and
fetch all accept.

#### PowerShell here-string + `ConvertTo-Json`

```powershell
$Query = @'
query ($from: InputCoordinates!, $to: InputCoordinates!) {
  trip(from: $from, to: $to, modes: [bus]) {
    itineraries {
      legs {
        mode
        line { id name }
        legGeometry { points }
        fromPlace { __typename name }
        toPlace { __typename name }
      }
    }
  }
}
'@

$Variables = @{
  from = @{ latitude = 8.4847; longitude = 124.6517 }
  to   = @{ latitude = 8.4841; longitude = 124.6579 }
}

$Body = @{ query = $Query; variables = $Variables } | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post -Uri "https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3" `
  -ContentType "application/json" `
  -Body $Body
```

#### Windows CMD one-liner

```cmd
curl -X POST "https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"query ($from: InputCoordinates!, $to: InputCoordinates!) { trip(from: $from, to: $to, modes: [bus]) { itineraries { legs { mode line { id name } legGeometry { points } fromPlace { __typename name } toPlace { __typename name } } } } }\",\"variables\":{\"from\":{\"latitude\":8.4847,\"longitude\":124.6517},\"to\":{\"latitude\":8.4841,\"longitude\":124.6579}}}"
```

The `^` characters are line continuations; remove them if you prefer a single line. All
double quotes inside the JSON must be escaped as `\"` for CMD.

#### React / TypeScript fetch snippet

```ts
const TRIP_QUERY = `
  query ($from: InputCoordinates!, $to: InputCoordinates!) {
    trip(from: $from, to: $to, modes: [bus]) {
      itineraries {
        legs {
          mode
          line { id name }
          legGeometry { points }
          fromPlace { __typename name }
          toPlace { __typename name }
        }
      }
    }
  }
`;

interface InputCoordinates {
  latitude: number;
  longitude: number;
}

export async function fetchTrip(from: InputCoordinates, to: InputCoordinates) {
  const response = await fetch("https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: TRIP_QUERY, variables: { from, to } }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    console.error("GraphQL errors", payload.errors);
    throw new Error(payload.errors[0]?.message ?? "Unknown GraphQL error");
  }

  return payload.data?.trip?.itineraries ?? [];
}
```

```ts
import { decode as decodePolyline } from "@mapbox/polyline";

function extractEndpoints(points?: string) {
  const decoded = points ? decodePolyline(points) : [];
  if (!decoded.length) {
    return { start: null, end: null };
  }

  const [startLat, startLon] = decoded[0];
  const [endLat, endLon] = decoded[decoded.length - 1];

  return {
    start: { lat: startLat, lon: startLon },
    end: { lat: endLat, lon: endLon },
  };
}

// Usage inside your rendering logic:
// const { start, end } = extractEndpoints(leg.legGeometry?.points ?? "");
// Use `start` and `end` as fallbacks if the GraphQL response omits explicit coordinates.
```

After decoding each leg’s `legGeometry.points` polyline you can derive endpoint markers
from the first and last coordinates—handy when the schema omits explicit
latitude/longitude fields.

#### Formatting checklist

1. Match every `{` with a `}` in the GraphQL document—PowerShell here-strings and CMD
   literals are unforgiving about stray braces.
2. Ensure the JSON envelope is exactly `{ "query": "…", "variables": { … } }` with no
   trailing commas.
3. Use PowerShell here-strings to avoid escaping quotes; when using CMD, escape every
   inner double quote as `\"`.
4. Do not double-encode the body (e.g., running `ConvertTo-Json` on an already encoded
   JSON string) or append extra braces when concatenating strings.

#### Introspection probe

If you still get syntax errors after confirming the payload formatting, run a schema
introspection request to make sure the endpoint itself is healthy:

```powershell
Invoke-RestMethod -Method Post -Uri "https://5d511c6dedd2.ngrok-free.app/otp/transmodel/v3" `
  -ContentType "application/json" `
  -Body '{"query":"{ __schema { queryType { name } } }"}'
```

Successful introspection confirms the server is reachable and that any remaining issue is
likely payload formatting rather than schema incompatibility.
