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
      legs {
        mode
        route { shortName longName color textColor }
        legGeometry { points }
      }
    }
  }
}
```

`src/api/otpClient.js` normalises the OTP base URL, posts the GraphQL payload, surfaces parse errors, and returns the decoded response for the map to consume.

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
