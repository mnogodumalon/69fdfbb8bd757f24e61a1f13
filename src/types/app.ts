// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Gast {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
  };
}

export interface Buchung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    notizen?: string;
    abreise?: string; // Format: YYYY-MM-DD oder ISO String
    naechte?: number;
    einzelpreis_pro_nacht?: number;
    anreise?: string; // Format: YYYY-MM-DD oder ISO String
    gesamtpreis?: number;
    gast?: string; // applookup -> URL zu 'Gast' Record
    buchungsnummer?: string;
    status?: LookupValue;
    mwst?: number;
    brutto?: number;
  };
}

export const APP_IDS = {
  GAST: '69fdfba4d263fdb57bdc8894',
  BUCHUNG: '69fdfba922f9c14bc17cc80f',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'buchung': {
    status: [{ key: "storniert", label: "Storniert" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "offen", label: "Offen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'gast': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/text',
  },
  'buchung': {
    'notizen': 'string/textarea',
    'abreise': 'date/date',
    'naechte': 'number',
    'einzelpreis_pro_nacht': 'number',
    'anreise': 'date/date',
    'gesamtpreis': 'number',
    'gast': 'applookup/select',
    'buchungsnummer': 'string/text',
    'status': 'lookup/radio',
    'mwst': 'number',
    'brutto': 'number',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateGast = StripLookup<Gast['fields']>;
export type CreateBuchung = StripLookup<Buchung['fields']>;