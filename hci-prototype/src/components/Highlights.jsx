import React from "react";
import { MapIcon, BellAlertIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

const features = [
  {
    name: "Multi-leg routing",
    description: "Seamless transfers between jeepney lines with walking guidance and ETA tracking.",
    icon: MapIcon,
  },
  {
    name: "Service alerts",
    description: "Stay informed about re-routes, road works, and peak hour congestion advisories.",
    icon: BellAlertIcon,
  },
  {
    name: "Fare transparency",
    description: "Instant fare estimates with cash-ready reminders for standard and discounted riders.",
    icon: CurrencyDollarIcon,
  },
];

function Highlights() {
  return (
    <section id="features" className="bg-slate-950 py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Ride smarter</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Built for daily commuters in Cagayan de Oro</h2>
          <p className="mt-4 text-base text-slate-300">
            Inspired by Sakay.ph, the planner combines jeepney expertise with modern design. View every transfer, walking leg,
            and fare estimate without leaving the map.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.name} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/30">
              <feature.icon className="h-8 w-8 text-blue-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">{feature.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Highlights;
