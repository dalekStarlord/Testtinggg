import React from "react";
import { ArrowRightIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { popularRoutes } from "../data/popularRoutes";

function PopularRoutesSection() {
  return (
    <section id="popular-routes" className="bg-slate-950 py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Commute presets</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Popular jeepney paths</h2>
            <p className="mt-2 max-w-2xl text-base text-slate-300">
              Quickly load tried-and-tested itineraries. Tap on a card to center the map and pre-fill your planner with origins
              and destinations inspired by Sakay.ph-style suggestions.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            View full route catalog
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {popularRoutes.map((route) => (
            <article
              key={route.id}
              className="group flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/30 transition-transform hover:-translate-y-1 hover:border-slate-500"
            >
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <MapPinIcon className="h-4 w-4" />
                  {route.transfer}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">{route.name}</h3>
                <p className="mt-3 text-sm text-slate-300">{route.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-slate-200">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Typical duration</p>
                  <p className="text-lg font-semibold text-white">{route.duration}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Estimated fare</p>
                  <p className="text-lg font-semibold text-white">{route.fare}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-blue-500/80 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-400"
                >
                  Load route
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularRoutesSection;
