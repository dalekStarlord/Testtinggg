import React from "react";

function SiteFooter() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">CDO Transit Planner</p>
          <p className="mt-2 text-sm text-slate-500">
            Crafted by commuters for commuters. Modeled after the beloved Sakay.ph experience.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:text-right">
          <a href="#plan" className="transition-colors hover:text-white">Launch planner</a>
          <a href="#popular-routes" className="transition-colors hover:text-white">Popular jeepney routes</a>
          <a href="#updates" className="transition-colors hover:text-white">Product updates</a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl px-6 text-xs text-slate-600">
        © {new Date().getFullYear()} CDO Transit Planner. All rights reserved. Data sources include LTFRB route releases and
        community mapping volunteers.
      </div>
    </footer>
  );
}

export default SiteFooter;
