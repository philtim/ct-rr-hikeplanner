/**
 * Instanz-Konventionen — die einzige Stelle mit konkreten Namen und Mustern.
 * Vorlage und Kalender werden zur LAUFZEIT über ihre Namen aufgelöst
 * (docs/CONVENTIONS.md), damit derselbe Build auf Demo- und Live-Instanz
 * läuft (IDs unterscheiden sich je Instanz). Die env-Overrides sind nur für
 * lokale Tests gedacht.
 */

/** Name der Hajk-Vorlagengruppe (auf beiden Instanzen identisch). */
export const TEMPLATE_GROUP_NAME = import.meta.env.VITE_TEMPLATE_GROUP_NAME || '=== Vorlage Hajks';

/** Name des Zielkalenders für Hajk-Termine. */
export const CALENDAR_NAME = import.meta.env.VITE_CALENDAR_NAME || 'Royal Rangers';

export const ROOT_GROUP_NAME = 'RR Gesamt-Stammleitung';
export const STAMM_MA_PATTERN =
    /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)stamm-MA$/;
export const TEAM_PATTERN = /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)team (.+)$/;
export const SAMMELGRUPPE_MARKER = 'Camps und Aktionen';
