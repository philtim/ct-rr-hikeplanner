import { describe, expect, it } from 'vitest';
import { buildEventText, formatDuration } from '@/wizard/eventText';

describe('formatDuration', () => {
    it('counts days inclusively and nights between', () => {
        expect(formatDuration('2027-04-10', '2027-04-12')).toBe('3 Tage / 2 Nächte');
    });

    it('uses singular forms', () => {
        expect(formatDuration('2027-04-10', '2027-04-11')).toBe('2 Tage / 1 Nacht');
        expect(formatDuration('2027-04-10', '2027-04-10')).toBe('1 Tag / 0 Nächte');
    });

    it('is empty for missing or inverted dates', () => {
        expect(formatDuration('', '2027-04-12')).toBe('');
        expect(formatDuration('2027-04-12', '2027-04-10')).toBe('');
    });
});

describe('buildEventText', () => {
    it('assembles the funding-relevant data in a fixed structure', () => {
        const text = buildEventText({
            dateFrom: '2027-04-10',
            dateTo: '2027-04-12',
            location: '  Zeltplatz Nagold ',
            description: 'Wandern, Feuer machen',
            dailySchedule: '08:00 Frühstück\n09:00 Aufbruch',
        });
        expect(text).toBe(
            [
                'Zeitraum: 10.04.–12.04.2027 (3 Tage / 2 Nächte)',
                'Ort / Treffpunkt: Zeltplatz Nagold',
                '',
                'Programm:',
                'Wandern, Feuer machen',
                '',
                'Ungefährer Tagesablauf:',
                '08:00 Frühstück\n09:00 Aufbruch',
            ].join('\n'),
        );
    });
});
