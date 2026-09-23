import { describe, expect, it } from 'vitest';
import { fewNightsWarning, validateStep1, validateStep2 } from '@/wizard/validation';
import type { FormState } from '@/wizard/types';

const base: FormState = {
    teamId: 2156,
    dateFrom: '2027-04-10',
    dateTo: '2027-04-12',
    location: 'Zeltplatz',
    description: 'Wandern, Lagerfeuer',
    dailySchedule: '8 Uhr Frühstück, dann Wanderung',
    mode: 'self',
    signupDeadline: '2027-04-03',
    maxMembers: '',
    titleSuffix: '',
    publicSignup: false,
    publishNow: true,
};

describe('validateStep1', () => {
    it('passes a valid form', () => {
        expect(validateStep1(base)).toEqual({});
    });
    it('rejects end before start', () => {
        expect(validateStep1({ ...base, dateTo: '2027-04-09' }).dateTo).toBe(
            'Das Enddatum muss nach dem Startdatum liegen.',
        );
    });
    it('requires program, daily schedule and location (funding data)', () => {
        const e = validateStep1({ ...base, description: '  ', dailySchedule: '', location: ' ' });
        expect(e.description).toBe('Bitte beschreibe, was beim Hajk gemacht wird.');
        expect(e.dailySchedule).toBe('Bitte beschreibe den ungefähren Tagesablauf.');
        expect(e.location).toBe('Bitte gib den Ort bzw. Treffpunkt an.');
    });
    it('requires team and dates', () => {
        const e = validateStep1({ ...base, teamId: null, dateFrom: '', dateTo: '' });
        expect(e.teamId).toBe('Bitte wähle ein Team.');
        expect(e.dateFrom).toBe('Bitte ein Datum wählen.');
        expect(e.dateTo).toBe('Bitte ein Datum wählen.');
    });
});

describe('fewNightsWarning', () => {
    it('warns below two nights', () => {
        expect(fewNightsWarning({ ...base, dateTo: '2027-04-11' })).toContain(
            'zwei Übernachtungen',
        );
    });
    it('is silent from two nights on and on empty or invalid dates', () => {
        expect(fewNightsWarning(base)).toBeNull();
        expect(fewNightsWarning({ ...base, dateFrom: '', dateTo: '' })).toBeNull();
        expect(fewNightsWarning({ ...base, dateTo: '2027-04-01' })).toBeNull();
    });
});

describe('validateStep2', () => {
    it('passes valid input', () => {
        expect(validateStep2(base)).toEqual({});
        expect(validateStep2({ ...base, maxMembers: '20' })).toEqual({});
        expect(validateStep2({ ...base, signupDeadline: '' })).toEqual({});
    });
    it('rejects deadline on or after start', () => {
        expect(validateStep2({ ...base, signupDeadline: '2027-04-11' }).signupDeadline).toBe(
            'Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.',
        );
        expect(validateStep2({ ...base, signupDeadline: '2027-04-10' }).signupDeadline).toBe(
            'Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.',
        );
    });
    it('ignores deadline in manual mode', () => {
        expect(validateStep2({ ...base, mode: 'manual', signupDeadline: '2027-04-11' })).toEqual(
            {},
        );
    });
    it('rejects non-positive or non-numeric maxMembers', () => {
        const msg = 'Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.';
        expect(validateStep2({ ...base, maxMembers: '0' }).maxMembers).toBe(msg);
        expect(validateStep2({ ...base, maxMembers: 'abc' }).maxMembers).toBe(msg);
        expect(validateStep2({ ...base, maxMembers: '2.5' }).maxMembers).toBe(msg);
    });
});
