import React from "react";

function MobileAppCTA() {
  return (
    <section id="updates" className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 text-center text-white">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Take the planner on the road</h2>
          <p className="mt-4 text-lg text-blue-50/90">
            Save your favourite jeepney combinations, receive service alerts, and download offline maps. Mobile apps are coming
            soon—join the beta waitlist to be the first to try.
          </p>
        </div>
        <form className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-full border border-white/30 bg-white/10 px-5 py-3 text-white placeholder-blue-50/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto"
          >
            Join waitlist
          </button>
        </form>
        <p className="text-sm text-blue-50/80">
          iOS and Android builds coming late 2024 • Built with a Sakay.ph-inspired interface for Northern Mindanao commuters
        </p>
      </div>
    </section>
  );
}

export default MobileAppCTA;
