import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { buttonVariants } from "./ui/button";

export interface PlanLeg {
  mode: string;
  from: { name: string; lat: number; lon: number };
  to: { name: string; lat: number; lon: number };
  route?: { gtfsId: string; shortName: string; longName: string | null } | null;
  legGeometry?: { points: string | null } | null;
}

export interface PlanItinerary {
  duration: number;
  startTime: number;
  endTime: number;
  legs: PlanLeg[];
}

interface ItineraryListProps {
  itineraries: PlanItinerary[];
  loading: boolean;
  error: string | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${minutes} min`;
  return `${hrs} hr ${mins.toString().padStart(2, "0")} min`;
};

const ItineraryList = ({ itineraries, loading, error, selectedIndex, onSelect }: ItineraryListProps) => {
  return (
    <Card className="border-muted-foreground/20">
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Planning trip…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && itineraries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No itineraries yet. Choose locations and plan a trip.</p>
        ) : null}

        {itineraries.length > 0 ? (
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-4">
            {itineraries.map((itinerary, index) => {
              const start = format(new Date(itinerary.startTime), "HH:mm");
              const end = format(new Date(itinerary.endTime), "HH:mm");
              const transfers = Math.max(itinerary.legs.length - 1, 0);
              const isActive = index === selectedIndex;
              return (
                <button
                  type="button"
                  key={`itinerary-${index}`}
                  onClick={() => onSelect(index)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    isActive ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>
                      {start} → {end}
                    </span>
                    <span>{formatDuration(itinerary.duration)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {transfers === 0 ? "No transfers" : `${transfers} transfer${transfers > 1 ? "s" : ""}`}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedIndex !== null && itineraries[selectedIndex] ? (
          <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Itinerary details</h3>
            <div className="space-y-2 text-sm">
              {itineraries[selectedIndex].legs.map((leg, legIndex) => (
                <div key={`leg-${legIndex}`} className="rounded-md border border-border/60 bg-background p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{leg.mode}</span>
                    {leg.route?.shortName ? <span>{leg.route.shortName}</span> : null}
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {leg.from.name || `${leg.from.lat.toFixed(4)}, ${leg.from.lon.toFixed(4)}`} → {leg.to.name || `${leg.to.lat.toFixed(4)}, ${leg.to.lon.toFixed(4)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <a
          href="https://91e22e78a863.ngrok-free.app/otp/gtfs/v1"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Inspect GraphQL Schema
        </a>
      </CardContent>
    </Card>
  );
};

export default ItineraryList;
