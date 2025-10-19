# OTP GraphQL Client Integration

## Section 1: Endpoints & env config

```ts
// src/api/otpConfig.js
const GRAPHQL_PATH = 
  import.meta.env?.VITE_OTP_GRAPHQL_PATH || process.env?.VITE_OTP_GRAPHQL_PATH || '/otp/gtfs/v1';

const LOCAL_ENDPOINT =
  import.meta.env?.VITE_OTP_DEV_ENDPOINT || process.env?.VITE_OTP_DEV_ENDPOINT || `http://localhost:8080${GRAPHQL_PATH}`;

const NGROK_BASE =
  import.meta.env?.VITE_NGROK_HTTPS_URL || process.env?.VITE_NGROK_HTTPS_URL || '';

const REMOTE_ENDPOINT = NGROK_BASE ? `${NGROK_BASE}${GRAPHQL_PATH}` : LOCAL_ENDPOINT;

const MODE = import.meta.env?.MODE || process.env?.NODE_ENV || 'development';

export const OTP_GRAPHQL_PATH = GRAPHQL_PATH;
export const OTP_DEV_ENDPOINT = LOCAL_ENDPOINT;
export const OTP_REMOTE_ENDPOINT = REMOTE_ENDPOINT;
export const OTP_ENDPOINT = MODE === 'production' ? REMOTE_ENDPOINT : LOCAL_ENDPOINT;
```

Environment example:

```env
# .env.local
VITE_NGROK_HTTPS_URL=https://example.ngrok-free.app
```

Resolved values:
- {{GRAPHQL_URL}} → `http://localhost:8080/otp/gtfs/v1`
- {{GRAPHQL_PATH}} → `/otp/gtfs/v1`
- {{NGROK_HTTPS_URL}} → `https://example.ngrok-free.app`
- {{ORIGINS}} → `["http://localhost:5173","http://localhost:3000","https://your-app.vercel.app","https://example.ngrok-free.app"]`

## Section 2: Plain fetch (routes + plan)

```js
import { fetchRoutes, planTrip } from '../api/otpClient';

async function demo() {
  try {
    const routes = await fetchRoutes(['BUS', 'TRAM']);
    console.log(routes);

    const plan = await planTrip(
      { lat: 60.1699, lon: 24.9384 },
      { lat: 60.2055, lon: 24.6559 },
      {
        modes: ['BUS', 'TRAM', 'WALK'],
        time: {
          date: '2024-06-15',
          time: '08:30',
          timezone: 'Europe/Helsinki',
        },
      },
    );

    console.log(plan.plan?.itineraries);
  } catch (error) {
    console.error('OTP error:', error);
  }
}

demo();
```

## Section 3: React hook (useEffect or React Query/SWR option)

```tsx
import { useEffect, useMemo, useState } from 'react';
import { fetchRoutes } from '../api/otpClient';

function normalizeModes(modes) {
  if (Array.isArray(modes)) {
    return modes.length ? modes : ['BUS'];
  }
  if (typeof modes === 'string' && modes.trim()) {
    return modes.split(',').map((mode) => mode.trim()).filter(Boolean);
  }
  return ['BUS'];
}

export function useOtpRoutes(modes) {
  const normalizedModes = useMemo(() => normalizeModes(modes), [modes]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchRoutes(normalizedModes)
      .then((routes) => {
        if (active) {
          setData({ routes });
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [normalizedModes]);

  return { data, error, loading };
}
```

## Section 4: graphql-request (optional)

```ts
import { GraphQLClient, gql } from 'graphql-request';
import OTP_ENDPOINT from '../api/otpConfig';

const client = new GraphQLClient(OTP_ENDPOINT, {
  headers: { 'Content-Type': 'application/json' },
});

const planQuery = gql`
  query PlanTrip($from: InputCoordinates!, $to: InputCoordinates!) {
    plan(
      from: { coordinates: $from }
      to: { coordinates: $to }
    ) {
      itineraries {
        legs {
          mode
          from { name }
          to { name }
        }
      }
    }
  }
`;

export async function planTripClient(from, to) {
  try {
    return await client.request(planQuery, { from, to });
  } catch (error) {
    if (error.response?.errors) {
      throw new Error(error.response.errors.map((e) => e.message).join('; '));
    }
    throw error;
  }
}
```

Axios variant:

```ts
import axios from 'axios';
import OTP_ENDPOINT from '../api/otpConfig';
import { queries } from '../api/otpClient';

export async function fetchRoutesViaAxios(modes = ['BUS']) {
  try {
    const response = await axios.post(
      OTP_ENDPOINT,
      {
        query: queries.ROUTES_QUERY,
        variables: { modes },
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (response.data.errors?.length) {
      throw new Error(response.data.errors.map((e) => e.message).join('; '));
    }

    return response.data.data?.routes ?? [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}
```

## Section 5: Verify via curl/PowerShell

```bash
curl -X POST "http://localhost:8080/otp/gtfs/v1" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/otp/gtfs/v1" `
  -ContentType "application/json" `
  -Body '{"query":"{ __typename }"}'
```

Success check in browser DevTools:
1. Open DevTools → Network.
2. Trigger the fetch.
3. Select the POST request to `/otp/gtfs/v1`.
4. Status 200 and JSON response with `{"data":{"__typename":"Query"}}` confirm it’s working.

## Section 6: Troubleshooting cheatsheet

- **405 Method Not Allowed** → ensure the request is POST; OTP GraphQL GET requests return 405.
- **CORS block** → add the exact frontend origin to `otp-config.json` under `cors.allowedOrigins`, e.g. `"https://your-app.vercel.app"`, then restart the OTP container (`docker restart <otp-container>`).
- **404/Network error** → verify the GraphQL path (`/otp/gtfs/v1` vs `/otp/transmodel/v3`). Check DevTools → Network → Request URL.
- **Calls from Vercel/Netlify** → remember their deploy preview domains must also be added to `allowedOrigins`.
- **Empty data / server error** → confirm `graph.obj` exists in `/var/opentripplanner`; regenerate graph if missing.
- **Mixed-content issue** → if your frontend is served over HTTPS, use the NGROK HTTPS endpoint instead of `http://localhost`.
- **Docker port not exposed** → ensure `-p 8080:8080` is present in your `docker run` or compose file.
- **GraphQL errors** → the client surfaces OTP errors via the thrown `Error`; inspect the message for details.
