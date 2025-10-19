import { useEffect, useMemo, useState } from 'react';
import { fetchRoutes } from '../api/otpClient';

function normalizeModes(modes) {
  if (Array.isArray(modes)) {
    return modes.length ? modes : ['BUS'];
  }
  if (typeof modes === 'string' && modes.trim()) {
    return modes.split(',').map((mode) => mode.trim()).filter(Boolean);
  }
  return ['BUS'];
}

export function useOtpRoutes(modes) {
  const normalizedModes = useMemo(() => normalizeModes(modes), [modes]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchRoutes(normalizedModes)
      .then((routes) => {
        if (active) {
          setData({ routes });
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [normalizedModes]);

  return { data, error, loading };
}

export default useOtpRoutes;
