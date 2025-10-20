import { ChangeEvent } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";

export interface CoordinateInput {
  latitude: number;
  longitude: number;
}

interface TripPlannerPanelProps {
  from: CoordinateInput | null;
  to: CoordinateInput | null;
  date: string;
  time: string;
  loading: boolean;
  error: string | null;
  nextClickTarget: "from" | "to";
  onPlanTrip: () => Promise<void>;
  onSetFrom: (value: CoordinateInput | null) => void;
  onSetTo: (value: CoordinateInput | null) => void;
  onSetDate: (value: string) => void;
  onSetTime: (value: string) => void;
  onSetNextClickTarget: (target: "from" | "to") => void;
  onSwap: () => void;
}

const parseCoordinate = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const TripPlannerPanel = ({
  from,
  to,
  date,
  time,
  loading,
  error,
  nextClickTarget,
  onPlanTrip,
  onSetFrom,
  onSetTo,
  onSetDate,
  onSetTime,
  onSetNextClickTarget,
  onSwap,
}: TripPlannerPanelProps) => {
  const handleCoordinateChange = (
    event: ChangeEvent<HTMLInputElement>,
    key: "latitude" | "longitude",
    update: (value: CoordinateInput | null) => void,
    current: CoordinateInput | null
  ) => {
    const value = parseCoordinate(event.target.value);
    if (value === null) {
      update(null);
      return;
    }

    const next = { ...(current ?? { latitude: Number.NaN, longitude: Number.NaN }), [key]: value } as CoordinateInput;
    update(next);
  };

  const disablePlan =
    loading ||
    !from ||
    !to ||
    Number.isNaN(from.latitude) ||
    Number.isNaN(from.longitude) ||
    Number.isNaN(to.latitude) ||
    Number.isNaN(to.longitude);

  return (
    <Card className="border-muted-foreground/20">
      <CardHeader>
        <CardTitle>Plan a Trip</CardTitle>
        <CardDescription>
          Choose coordinates manually or by clicking the map. All requests use the OTP GTFS GraphQL API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="from-lat">From Latitude</Label>
            <Input
              id="from-lat"
              inputMode="decimal"
              value={from?.latitude?.toString() ?? ""}
              placeholder="e.g. 8.47215"
              onChange={(event) => handleCoordinateChange(event, "latitude", onSetFrom, from)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-lon">From Longitude</Label>
            <Input
              id="from-lon"
              inputMode="decimal"
              value={from?.longitude?.toString() ?? ""}
              placeholder="e.g. 124.6163"
              onChange={(event) => handleCoordinateChange(event, "longitude", onSetFrom, from)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-lat">To Latitude</Label>
            <Input
              id="to-lat"
              inputMode="decimal"
              value={to?.latitude?.toString() ?? ""}
              placeholder="e.g. 8.48703"
              onChange={(event) => handleCoordinateChange(event, "latitude", onSetTo, to)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-lon">To Longitude</Label>
            <Input
              id="to-lon"
              inputMode="decimal"
              value={to?.longitude?.toString() ?? ""}
              placeholder="e.g. 124.63809"
              onChange={(event) => handleCoordinateChange(event, "longitude", onSetTo, to)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(event) => onSetDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(event) => onSetTime(event.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Next map click sets:</span>
          {(["from", "to"] as const).map((target) => (
            <Button
              key={target}
              type="button"
              variant={target === nextClickTarget ? "default" : "outline"}
              size="sm"
              onClick={() => onSetNextClickTarget(target)}
              className={cn(target === nextClickTarget && "shadow")}
            >
              {target === "from" ? "From" : "To"}
            </Button>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={onSwap}>
            Swap
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            void onPlanTrip();
          }}
          disabled={disablePlan}
        >
          {loading ? "Planning..." : "Plan Trip"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TripPlannerPanel;
