import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Gast, Buchung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [gast, setGast] = useState<Gast[]>([]);
  const [buchung, setBuchung] = useState<Buchung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [gastData, buchungData] = await Promise.all([
        LivingAppsService.getGast(),
        LivingAppsService.getBuchung(),
      ]);
      setGast(gastData);
      setBuchung(buchungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [gastData, buchungData] = await Promise.all([
          LivingAppsService.getGast(),
          LivingAppsService.getBuchung(),
        ]);
        setGast(gastData);
        setBuchung(buchungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const gastMap = useMemo(() => {
    const m = new Map<string, Gast>();
    gast.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gast]);

  return { gast, setGast, buchung, setBuchung, loading, error, fetchAll, gastMap };
}