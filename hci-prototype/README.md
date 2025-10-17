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
        fromPlace {
          name
          location { latitude longitude }
          quay {
            id
            name
            latitude
            longitude
            stopPlace { id name latitude longitude }
          }
        }
        toPlace {
          name
          location { latitude longitude }
          quay {
            id
            name
            latitude
            longitude
            stopPlace { id name latitude longitude }
          }
        }
        pointsOnLink { points }
      }
    }
  }
}
```

`src/api/otpClient.js` normalises the OTP base URL, posts the GraphQL payload, surfaces parse errors, and returns the decoded response for the map to consume. OTP 2.8's Transmodel schema no longer exposes `lat`/`lon` directly on `Place`, so the query requests the `location { latitude longitude }` object and also fetches quay metadata. During normalisation each leg decodes the returned `legGeometry.points` polyline so the first and last vertices can act as a fallback when the schema omits explicit endpoint coordinates.

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

Replace `InspectPlace` with other types such as `Leg` or `TripPattern` to discover their supported fields. Two other helpful snippets when validating leg endpoint structures:

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
   `VITE_OTP_URL` with the absolute OTP base, e.g. `https://2b36aa1affb0.ngrok-free.app`.
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
