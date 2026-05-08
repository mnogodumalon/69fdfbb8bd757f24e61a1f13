import type { EnrichedBuchung } from '@/types/enriched';
import type { Buchung, Gast } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BuchungMaps {
  gastMap: Map<string, Gast>;
}

export function enrichBuchung(
  buchung: Buchung[],
  maps: BuchungMaps
): EnrichedBuchung[] {
  return buchung.map(r => ({
    ...r,
    gastName: resolveDisplay(r.fields.gast, maps.gastMap, 'vorname', 'nachname'),
  }));
}
