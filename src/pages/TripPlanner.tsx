import { useCallback, useMemo, useState } from "react";
import TripPlannerPanel, { type CoordinateInput } from "../components/TripPlannerPanel";
import MapView from "../components/MapView";
import ItineraryList, { type PlanItinerary } from "../components/ItineraryList";
import { gqlFetch } from "../lib/gql";

const PLAN_QUERY = `
  query Plan($from: InputCoordinates!, $to: InputCoordinates!, $date: String!, $time: String!) {
    plan(
      from: { lat: $from.latitude, lon: $from.longitude }
      to: { lat: $to.latitude, lon: $to.longitude }
      date: $date
      time: $time
      transportModes: [{ mode: WALK }, { mode: TRANSIT }]
    ) {
      itineraries {
        duration
        startTime
        endTime
        legs {
          mode
          from { name lat lon }
          to { name lat lon }
          route { gtfsId shortName longName }
          legGeometry { points }
        }
      }
    }
  }
`;

const DEFAULT_FROM: CoordinateInput = {
  latitude: 8.4721517,
  longitude: 124.6162955,
};

const DEFAULT_TO: CoordinateInput = {
  latitude: 8.4870328,
  longitude: 124.6380917,
};

const TripPlannerPage = () => {
  const [from, setFrom] = useState<CoordinateInput | null>(DEFAULT_FROM);
  const [to, setTo] = useState<CoordinateInput | null>(DEFAULT_TO);
  const [date, setDate] = useState("2025-10-19");
  const [time, setTime] = useState("13:45");
  const [nextClickTarget, setNextClickTarget] = useState<"from" | "to">("from");
  const [itineraries, setItineraries] = useState<PlanItinerary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanTrip = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const data = await gqlFetch<{ plan: { itineraries: PlanItinerary[] } | null }>(PLAN_QUERY, {
        from,
        to,
        date,
        time,
      });

      const nextItineraries = data.plan?.itineraries ?? [];
      setItineraries(nextItineraries);
      setSelectedIndex(nextItineraries.length > 0 ? 0 : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  }, [from, to, date, time]);

  const handleMapClick = useCallback(
    (coordinate: CoordinateInput) => {
      if (nextClickTarget === "from") {
        setFrom(coordinate);
        setNextClickTarget("to");
      } else {
        setTo(coordinate);
        setNextClickTarget("from");
      }
    },
    [nextClickTarget]
  );

  const handleMarkerDrag = useCallback((target: "from" | "to", coordinate: CoordinateInput) => {
    if (target === "from") {
      setFrom(coordinate);
    } else {
      setTo(coordinate);
    }
  }, []);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const itineraryError = useMemo(() => (loading ? null : error), [error, loading]);

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <TripPlannerPanel
          from={from}
          to={to}
          date={date}
          time={time}
          loading={loading}
          error={error}
          nextClickTarget={nextClickTarget}
          onPlanTrip={handlePlanTrip}
          onSetFrom={setFrom}
          onSetTo={setTo}
          onSetDate={setDate}
          onSetTime={setTime}
          onSetNextClickTarget={setNextClickTarget}
          onSwap={handleSwap}
        />
        <ItineraryList
          itineraries={itineraries}
          loading={loading}
          error={itineraryError}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </div>
      <MapView
        from={from}
        to={to}
        itineraries={itineraries}
        selectedItineraryIndex={selectedIndex}
        nextClickTarget={nextClickTarget}
        onMapClick={handleMapClick}
        onMarkerDrag={handleMarkerDrag}
      />
    </div>
  );
};

export default TripPlannerPage;
