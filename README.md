# OTP GTFS Trip Planner

A production-ready React + Vite + TypeScript application that plans trips and inspects routes using your OpenTripPlanner (OTP2) GTFS GraphQL API at [`https://91e22e78a863.ngrok-free.app/otp/gtfs/v1`](https://91e22e78a863.ngrok-free.app/otp/gtfs/v1).

## Scaffold & install commands

```bash
npm create vite@latest otp-gtfs-planner -- --template react-ts
cd otp-gtfs-planner
npm install tailwindcss postcss autoprefixer class-variance-authority clsx tailwind-merge react-router-dom react-leaflet leaflet lucide-react date-fns
npx tailwindcss init -p
```

_All of the above steps have already been applied to this repository._

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Features

- **Trip Planner** — enter coordinates or pick them directly on the map (first click = From, second = To). Supports draggable origin/destination markers, swapping endpoints, and configurable departure date/time.
- **GraphQL-backed planning** — all itineraries and geometry come from OTP via POST requests to `https://91e22e78a863.ngrok-free.app/otp/gtfs/v1` using the mandated `plan` query and variables.
- **Itinerary details & map** — view itineraries with transfer counts, inspect leg sequences, and visualize decoded polylines and stops on an interactive map.
- **Routes Browser** — search OTP routes, inspect their patterns and stops, and view the stops on a dedicated leaflet map.
- **Modern UI** — Tailwind CSS with shadcn/ui primitives for a clean, responsive layout.

## Notes

- Ensure the OTP instance behind `https://91e22e78a863.ngrok-free.app/otp/gtfs/v1` is running with your GTFS-derived graph (`graph.obj`).
- All GraphQL traffic uses POST with `Content-Type: application/json` and surfaces both HTTP and GraphQL errors in the UI.
- If you expose the app publicly, confirm that your OTP CORS configuration whitelists the deployed origin.
