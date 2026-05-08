import type { Buchung } from './app';

export type EnrichedBuchung = Buchung & {
  gastName: string;
};
