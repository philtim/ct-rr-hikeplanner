/**
 * Instanz-Konfiguration — die einzige Stelle mit konkreten IDs und
 * Namensmustern. Defaults gelten für die Live-Instanz (jms-altensteig);
 * auf der Demo-Instanz per .env überschreiben (siehe .env-example).
 */

/** Vorlagengruppe "=== Vorlage Hajks" (live: 2587). */
export const TEMPLATE_GROUP_ID = Number(import.meta.env.VITE_TEMPLATE_GROUP_ID || 2587);

/** Öffentlicher Kalender "Royal Rangers" (live: 69). */
export const CALENDAR_ID = Number(import.meta.env.VITE_CALENDAR_ID || 69);

export const ROOT_GROUP_NAME = 'RR Gesamt-Stammleitung';
export const STAMM_MA_PATTERN =
    /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)stamm-MA$/;
export const TEAM_PATTERN = /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)team (.+)$/;
export const SAMMELGRUPPE_MARKER = 'Camps und Aktionen';
