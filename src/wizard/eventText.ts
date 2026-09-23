/**
 * Förderrelevante Angaben (Dauer, Ort, Programm, Tagesablauf) als fester
 * Textblock — landet in Gruppenbeschreibung und Kalendertermin, damit die
 * Stammleitung Förderanträge ohne Rückfragen daraus befüllen kann.
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
        'Ungefährer Tagesablauf:',
        f.dailySchedule.trim(),
    ].join('\n');
}
