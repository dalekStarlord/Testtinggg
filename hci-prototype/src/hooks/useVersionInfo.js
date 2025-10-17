import { useEffect, useMemo, useState } from "react";
import { getEnvVersionInfo } from "../versionInfo";

export function useVersionInfo() {
  const envInfo = useMemo(() => getEnvVersionInfo(), []);
  const [remoteInfo, setRemoteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadVersionFile() {
      try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`version.json request failed (${response.status})`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setRemoteInfo(payload);
          const shortSha = payload?.shortSha || (payload?.commitSha ? payload.commitSha.slice(0, 7) : "unknown");
          console.info(`[CDO Jeepney Planner] Running ${shortSha} deployed ${payload?.deployedAt || "unknown time"}`);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVersionFile();

    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(() => {
    const base = {
      commitSha: envInfo.commitSha,
      shortSha: envInfo.shortSha,
      commitMessage: envInfo.commitMessage,
      environment: envInfo.environment,
      deployUrl: envInfo.deployUrl,
      deployedAt: envInfo.deployedAt,
      source: envInfo.source,
    };

    if (!remoteInfo) {
      return base;
    }

    return {
      ...base,
      ...remoteInfo,
      shortSha:
        remoteInfo.shortSha ||
        base.shortSha ||
        (remoteInfo.commitSha ? remoteInfo.commitSha.slice(0, 7) : ""),
      source: remoteInfo ? "version.json" : base.source,
    };
  }, [envInfo, remoteInfo]);

  return { version: merged, loading, error, env: envInfo, remote: remoteInfo };
}
