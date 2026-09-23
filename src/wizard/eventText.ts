/**
 * Förderrelevante Angaben (Dauer, Ort, Programm, Tagesablauf) in fester
 * Struktur, damit die Stammleitung Förderanträge ohne Rückfragen daraus
 * befüllen kann. Die Gruppenbeschreibung rendert CT als Markdown (auch auf
 * der öffentlichen Anmeldeseite); Kalendertermine bekommen Klartext.
 */
import { countNights, formatDateRange } from './naming';
import type { FormState } from './types';

/** „3 Tage / 2 Nächte“; leer, solange der Zeitraum unvollständig/ungültig ist. */
export function formatDuration(fromIso: string, toIso: string): string {
    if (!fromIso || !toIso || toIso < fromIso) return '';
    const nights = countNights(fromIso, toIso);
    const days = nights + 1;
    return `${days} ${days === 1 ? 'Tag' : 'Tage'} / ${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}`;
}

export function buildEventText(
    f: Pick<FormState, 'dateFrom' | 'dateTo' | 'location' | 'description' | 'dailySchedule'>,
): string {
    return [
        `Zeitraum: ${formatDateRange(f.dateFrom, f.dateTo)} (${formatDuration(f.dateFrom, f.dateTo)})`,
        `Ort / Treffpunkt: ${f.location.trim()}`,
        '',
        'Programm:',
        f.description.trim(),
        '',
        'Tagesablauf:',
        f.dailySchedule.trim(),
    ].join('\n');
}

/** Einzelne Zeilenumbrüche des Leiters erhalten (Markdown würde sie zusammenziehen). */
function hardBreaks(text: string): string {
    const lines = text
        .trim()
        .split('\n')
        .map((l) => l.trimEnd());
    return lines.map((line, i) => (line && lines[i + 1] ? `${line}  ` : line)).join('\n');
}

export function buildGroupNote(
    f: Pick<FormState, 'dateFrom' | 'dateTo' | 'location' | 'description' | 'dailySchedule'>,
): string {
    return [
        '### Wann & Wo',
        `**Zeitraum:** ${formatDateRange(f.dateFrom, f.dateTo)} · ${formatDuration(f.dateFrom, f.dateTo)}  `,
        `**Ort / Treffpunkt:** ${f.location.trim()}`,
        '',
        '---',
        '',
        '### Programm',
        hardBreaks(f.description),
        '',
        '### Tagesablauf',
        hardBreaks(f.dailySchedule),
    ].join('\n');
}
