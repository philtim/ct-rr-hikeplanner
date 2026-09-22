/**
 * Namensschema und Datums-Helfer. Der Gruppenname wird ausschließlich
 * generiert (PRD US-2): `RR Hajk <TeamKurzname> <DD.MM.–DD.MM.YYYY>`,
 * bei Jahreswechsel `DD.MM.YYYY–DD.MM.YYYY`.
 */
import { TEAM_PATTERN } from './config';

export function teamShortName(fullName: string): string {
    const m = fullName.match(TEAM_PATTERN);
    return m ? m[2] : fullName;
}

function parts(iso: string): { d: string; m: string; y: string } | null {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y: m[1], m: m[2], d: m[3] } : null;
}

export function formatDateRange(fromIso: string, toIso: string): string {
    const f = parts(fromIso);
    const t = parts(toIso);
    if (!f || !t) return '';
    if (f.y === t.y) return `${f.d}.${f.m}.–${t.d}.${t.m}.${t.y}`;
    return `${f.d}.${f.m}.${f.y}–${t.d}.${t.m}.${t.y}`;
}

/**
 * Freitext-Zusatz des Leiters: nur Buchstaben (inkl. Umlaute), Ziffern,
 * Leerzeichen und Bindestrich; mehrfache Leerzeichen zusammengefasst,
 * maximal 40 Zeichen.
 */
export function sanitizeSuffix(raw: string): string {
    return raw
        .replace(/[^A-Za-zÄÖÜäöüß0-9 -]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40)
        .trim();
}

export function buildGroupName(
    teamFullName: string,
    fromIso: string,
    toIso: string,
    suffix = '',
): string {
    const base = `RR Hajk ${teamShortName(teamFullName)} ${formatDateRange(fromIso, toIso)}`;
    const clean = sanitizeSuffix(suffix);
    return clean ? `${base} ${clean}` : base;
}

/** Kalendernächte zwischen den Daten; 0 bei leerer/ungültiger/invertierter Eingabe. */
export function countNights(fromIso: string, toIso: string): number {
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
    return Math.round((to - from) / 86_400_000);
}
