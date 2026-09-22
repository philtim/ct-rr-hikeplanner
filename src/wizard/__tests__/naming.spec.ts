import { describe, expect, it } from 'vitest';
import {
    buildGroupName,
    countNights,
    formatDateRange,
    sanitizeSuffix,
    teamShortName,
} from '@/wizard/naming';

describe('teamShortName', () => {
    it('strips the RR <Stufe>team prefix', () => {
        expect(teamShortName('RR Kundschafterteam Eisbären')).toBe('Eisbären');
        expect(teamShortName('RR Pfadrangerteam Die Wilden Hühner')).toBe('Die Wilden Hühner');
    });
    it('returns unknown patterns unchanged', () => {
        expect(teamShortName('RR Projektrangers')).toBe('RR Projektrangers');
    });
});

describe('formatDateRange', () => {
    it('formats a same-year range', () => {
        expect(formatDateRange('2027-04-10', '2027-04-12')).toBe('10.04.–12.04.2027');
    });
    it('formats a cross-year range with both years', () => {
        expect(formatDateRange('2026-12-28', '2027-01-02')).toBe('28.12.2026–02.01.2027');
    });
    it('returns empty string for invalid input', () => {
        expect(formatDateRange('', '2027-04-12')).toBe('');
    });
});

describe('buildGroupName', () => {
    it('follows the RR Hajk <Team> <Datum> schema', () => {
        expect(buildGroupName('RR Kundschafterteam Eisbären', '2027-04-10', '2027-04-12')).toBe(
            'RR Hajk Eisbären 10.04.–12.04.2027',
        );
    });
});

describe('sanitizeSuffix', () => {
    it('keeps letters, digits, umlauts, spaces and hyphens', () => {
        expect(sanitizeSuffix('Wildnis-Tour 2')).toBe('Wildnis-Tour 2');
        expect(sanitizeSuffix('Überquerung')).toBe('Überquerung');
    });
    it('strips special characters and collapses whitespace', () => {
        expect(sanitizeSuffix('Tour! <script> & Co.')).toBe('Tour script Co');
        expect(sanitizeSuffix('  viel   Platz  ')).toBe('viel Platz');
    });
    it('caps the length at 40 characters', () => {
        expect(sanitizeSuffix('x'.repeat(60))).toHaveLength(40);
    });
});

describe('buildGroupName with suffix', () => {
    it('appends the sanitized suffix after the date', () => {
        expect(
            buildGroupName(
                'RR Kundschafterteam Eisbären',
                '2027-04-10',
                '2027-04-12',
                'Wildnis-Tour!',
            ),
        ).toBe('RR Hajk Eisbären 10.04.–12.04.2027 Wildnis-Tour');
    });
    it('changes nothing for an empty suffix', () => {
        expect(
            buildGroupName('RR Kundschafterteam Eisbären', '2027-04-10', '2027-04-12', '  '),
        ).toBe('RR Hajk Eisbären 10.04.–12.04.2027');
    });
});

describe('countNights', () => {
    it('counts calendar nights', () => {
        expect(countNights('2027-04-10', '2027-04-12')).toBe(2);
        expect(countNights('2027-04-10', '2027-04-10')).toBe(0);
    });
    it('returns 0 for missing or inverted input', () => {
        expect(countNights('', '2027-04-12')).toBe(0);
        expect(countNights('2027-04-12', '2027-04-10')).toBe(0);
    });
});
