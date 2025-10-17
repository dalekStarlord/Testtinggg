import React from "react";
import { useVersionInfo } from "../hooks/useVersionInfo";

function formatDeployedAt(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function SiteFooter() {
  const { version, loading, error } = useVersionInfo();
  const deployedText = formatDeployedAt(version.deployedAt);

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
          <a href="#plan" className="transition-colors hover:text-white">
            Launch planner
          </a>
          <a href="#popular-routes" className="transition-colors hover:text-white">
            Popular jeepney routes
          </a>
          <a href="#updates" className="transition-colors hover:text-white">
            Product updates
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl px-6 text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} CDO Transit Planner. All rights reserved. Data sources include LTFRB route releases and
          community mapping volunteers.
        </p>
        <p className="mt-2 text-slate-600">
          {loading ? "Loading deployment info…" : null}
          {!loading && version.shortSha ? (
            <span>
              Deployed {deployedText ? `on ${deployedText}` : "recently"} · commit {version.shortSha}
              {version.environment ? ` · ${version.environment}` : ""}
              {version.deployUrl ? (
                <>
                  {" "}
                  · <a href={version.deployUrl} className="underline-offset-2 hover:underline">{version.deployUrl}</a>
                </>
              ) : null}
            </span>
          ) : null}
          {!loading && !version.shortSha ? (
            <span>
              Version info unavailable{error ? ` – ${error.message}` : ""}. Ensure version.json is deployed and VITE_APP_* env
              vars are configured.
            </span>
          ) : null}
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
