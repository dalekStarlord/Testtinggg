import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { gqlFetch } from "../lib/gql";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

interface RouteSummary {
  gtfsId: string;
  shortName: string | null;
  longName: string | null;
  mode: string;
}

interface RoutePatternStop {
  gtfsId: string;
  name: string;
  lat: number;
  lon: number;
}

interface RoutePattern {
  name: string;
  stops: RoutePatternStop[];
}

interface RouteDetailResponse {
  route: {
    gtfsId: string;
    patterns: RoutePattern[];
  } | null;
}

const ROUTES_QUERY = `
  query RoutesBrowser {
    routes {
      gtfsId
      shortName
      longName
      mode
    }
  }
`;

const ROUTE_DETAILS_QUERY = `
  query RouteDetails($id: String!) {
    route(id: $id) {
      gtfsId
      patterns {
        name
        stops {
          gtfsId
          name
          lat
          lon
        }
      }
    }
  }
`;

const RouteStopsBounds = ({ stops }: { stops: RoutePatternStop[] }) => {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = L.latLngBounds(stops.map((stop) => [stop.lat, stop.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [stops, map]);
  return null;
};

const collectUniqueStops = (patterns: RoutePattern[]): RoutePatternStop[] => {
  const seen = new Map<string, RoutePatternStop>();
  patterns.forEach((pattern) => {
    pattern.stops.forEach((stop) => {
      if (!seen.has(stop.gtfsId)) {
        seen.set(stop.gtfsId, stop);
      }
    });
  });
  return Array.from(seen.values());
};

const badgeColor = (mode: string) => {
  switch (mode) {
    case "BUS":
      return "bg-blue-500/10 text-blue-600";
    case "RAIL":
    case "TRAIN":
      return "bg-emerald-500/10 text-emerald-600";
    case "TRAM":
      return "bg-purple-500/10 text-purple-600";
    case "FERRY":
      return "bg-cyan-500/10 text-cyan-600";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const RoutesBrowser = () => {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteSummary | null>(null);
  const [routeDetail, setRouteDetail] = useState<RoutePattern[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const loadRoutes = async () => {
      setLoadingRoutes(true);
      setError(null);
      try {
        const data = await gqlFetch<{ routes: RouteSummary[] }>(ROUTES_QUERY);
        setRoutes(data.routes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch routes");
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, []);

  const filteredRoutes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return routes;
    return routes.filter((route) => {
      const values = [route.gtfsId, route.shortName ?? "", route.longName ?? "", route.mode];
      return values.some((value) => value.toLowerCase().includes(term));
    });
  }, [routes, search]);

  const handleSelectRoute = async (route: RouteSummary) => {
    setSelectedRoute(route);
    setLoadingDetail(true);
    setRouteDetail(null);
    try {
      const data = await gqlFetch<RouteDetailResponse>(ROUTE_DETAILS_QUERY, { id: route.gtfsId });
      setRouteDetail(data.route?.patterns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch route details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const stops = routeDetail ? collectUniqueStops(routeDetail) : [];

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Card className="border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Routes Browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search routes by name, ID, or mode"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {loadingRoutes ? <p className="text-sm text-muted-foreground">Loading routes…</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-3">
              {filteredRoutes.map((route) => {
                const isActive = route.gtfsId === selectedRoute?.gtfsId;
                return (
                  <button
                    key={route.gtfsId}
                    type="button"
                    onClick={() => handleSelectRoute(route)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      isActive ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {route.shortName ?? route.longName ?? route.gtfsId}
                        </p>
                        {route.longName ? (
                          <p className="text-xs text-muted-foreground">{route.longName}</p>
                        ) : null}
                      </div>
                      <Badge variant="outline" className={badgeColor(route.mode)}>
                        {route.mode}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {!loadingRoutes && filteredRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No routes match your search.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {selectedRoute ? (
          <Card className="border-muted-foreground/20">
            <CardHeader>
              <CardTitle>{selectedRoute.shortName ?? selectedRoute.longName ?? selectedRoute.gtfsId}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {loadingDetail ? <p className="text-muted-foreground">Loading route detail…</p> : null}
              {!loadingDetail && routeDetail && routeDetail.length === 0 ? (
                <p className="text-muted-foreground">No patterns found for this route.</p>
              ) : null}
              {routeDetail?.map((pattern) => (
                <div key={pattern.name} className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <p className="font-medium">{pattern.name}</p>
                  <p className="text-xs text-muted-foreground">Stops: {pattern.stops.length}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="border-muted-foreground/20">
        <CardHeader>
          <CardTitle>Route Stops Map</CardTitle>
        </CardHeader>
        <CardContent className="h-[520px]">
          <MapContainer
            center={[8.4795, 124.6272]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {stops.map((stop) => (
              <CircleMarker
                key={stop.gtfsId}
                center={[stop.lat, stop.lon]}
                radius={6}
                weight={1}
                color="#2563eb"
                fillColor="#2563eb"
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">{stop.gtfsId}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            <RouteStopsBounds stops={stops} />
          </MapContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoutesBrowser;
