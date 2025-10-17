import React from "react";

function SuggestionsList({ suggestions, onSelect }) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-xl">
      {suggestions.map((item) => (
        <li key={`${item.lat}-${item.lon}-${item.label}`}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full flex-col items-start gap-1 px-4 py-2 text-left text-slate-200 transition-colors hover:bg-slate-800"
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-slate-400">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LocationField({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  suggestions,
  onFocus = () => {},
  isUsingMap,
  onClear,
  onUseMap,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {isUsingMap ? <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-300">Tap map</span> : null}
          {onUseMap ? (
            <button
              type="button"
              onClick={onUseMap}
              className="rounded-full border border-slate-700 px-3 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              {isUsingMap ? "Stop map" : "Use map"}
            </button>
          ) : null}
          {value ? (
            <button type="button" onClick={onClear} className="text-slate-400 transition-colors hover:text-white">
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <SuggestionsList suggestions={suggestions} onSelect={onSelect} />
      </div>
    </div>
  );
}

function JeepneyLegDetails({ leg }) {
  return (
    <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Jeepney line</p>
          <p className="text-lg font-semibold text-white">{leg.routeName}</p>
          <p className="text-xs text-slate-400">{leg.fromName} ➜ {leg.toName}</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-200">
          <span>{Math.round(leg.distanceKm * 10) / 10} km</span>
          <span>{Math.round(leg.durationMinutes)} mins</span>
        </div>
      </div>
      {leg.alerts.length ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="font-semibold">Service alerts</p>
          <ul className="mt-1 space-y-1">
            {leg.alerts.map((alert, index) => (
              <li key={index}>{alert.alertHeaderText || "Check operator advisory"}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

const COMMON_PITFALLS = [
  {
    title: "Double /otp prefix",
    detail: "If VITE_OTP_URL already ends with /otp, keep fetch paths short (e.g., /transmodel/v3).",
  },
  {
    title: "CORS blocks",
    detail: "Confirm the Vite dev proxy or ngrok tunnel allows POST and OPTIONS requests from your origin.",
  },
  {
    title: "Bad coordinates",
    detail: "OTP returns empty itineraries if lat/lon are flipped or outside CDO. Use map selection to verify order.",
  },
  {
    title: "Missing fields",
    detail: "GraphQL shape changed from REST—read legs[*].legGeometry.points and legs[*].route for names/colors.",
  },
  {
    title: "Network timeouts",
    detail: "Surface fetch errors in the UI so commuters know when OTP is unreachable or still booting.",
  },
];

function SearchBar({
  onSwap,
  onReset,
  origin,
  destination,
  mapStatus,
  routeState,
}) {
  return (
    <aside className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-2xl md:sticky md:top-8 md:max-w-md lg:max-w-lg">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Jeepney planner</p>
          <h2 className="text-xl font-semibold text-white">Plan your ride</h2>
        </div>
        <button
          type="button"
          onClick={onSwap}
          className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
        >
          Swap
        </button>
      </header>

      <div className="space-y-5">
        <LocationField
          label="Origin"
          placeholder="Search barangay, landmark, or stop"
          value={origin.query}
          onChange={origin.onChange}
          onSelect={origin.onSelect}
          suggestions={origin.suggestions}
          isUsingMap={mapStatus.activeTarget === "origin"}
          onClear={origin.onClear}
          onUseMap={origin.onUseMap}
        />

        <LocationField
          label="Destination"
          placeholder="Where do you want to go?"
          value={destination.query}
          onChange={destination.onChange}
          onSelect={destination.onSelect}
          suggestions={destination.suggestions}
          isUsingMap={mapStatus.activeTarget === "destination"}
          onClear={destination.onClear}
          onUseMap={destination.onUseMap}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            {mapStatus.activeTarget
              ? `Tap the map to set your ${mapStatus.activeTarget}`
              : "Use the buttons above to pick a point from the map"}
          </p>
          {mapStatus.activeTarget ? (
            <button
              type="button"
              onClick={mapStatus.onCancel}
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Cancel map pick
            </button>
          ) : null}
        </div>

        {routeState.loading ? (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            Searching jeepney routes…
          </div>
        ) : null}

        {routeState.error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {routeState.error}
          </div>
        ) : null}

        {routeState.summary && routeState.legs.length ? (
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h3 className="text-lg font-semibold text-white">Trip overview</h3>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-sm text-slate-300">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Total time</dt>
                  <dd className="text-lg font-semibold text-white">{routeState.summary.totalDurationMinutes} mins</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Transfers</dt>
                  <dd className="text-lg font-semibold text-white">{routeState.summary.transfers}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Walking</dt>
                  <dd>{routeState.summary.walkMinutes} mins</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated fare</dt>
                  <dd>{routeState.summary.fare ? `₱${routeState.summary.fare}` : "Check with driver"}</dd>
                </div>
              </dl>
            </div>

            <ul className="space-y-3">
              {routeState.legs.map((leg, index) => (
                <JeepneyLegDetails key={`${leg.routeName}-${index}`} leg={leg} />
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-full bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Reset planner
        </button>

        <details className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Troubleshooting checklist</summary>
          <ul className="mt-3 space-y-2">
            {COMMON_PITFALLS.map((item) => (
              <li key={item.title}>
                <p className="font-semibold text-slate-200">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  );
}

export default SearchBar;
