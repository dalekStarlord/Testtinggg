import React from "react";

const navigation = [
  { name: "Plan a Trip", href: "#plan" },
  { name: "Features", href: "#features" },
  { name: "Popular Routes", href: "#popular-routes" },
  { name: "Updates", href: "#updates" },
];

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#plan" className="flex items-center gap-2 text-xl font-semibold text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 font-bold">
            CDO
          </span>
          <span>Transit Planner</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          {navigation.map((item) => (
            <a key={item.name} href={item.href} className="transition-colors hover:text-white">
              {item.name}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white md:flex"
          >
            Launch web app
          </button>
          <button
            type="button"
            className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
          >
            Download beta
          </button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
