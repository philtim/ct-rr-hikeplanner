/**
 * Schritt-Validierung des Wizards (PRD US-2). Fehlertexte wörtlich aus
 * der Design-Spec — sie erscheinen unverändert unter den Feldern.
 */
import { countNights } from './naming';
import type { FormState } from './types';

export interface Step1Errors {
    teamId?: string;
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    description?: string;
    dailySchedule?: string;
}
export interface Step2Errors {
    signupDeadline?: string;
    maxMembers?: string;
}

export function validateStep1(f: FormState): Step1Errors {
    const e: Step1Errors = {};
    if (f.teamId === null) e.teamId = 'Bitte wähle ein Team.';
    if (!f.dateFrom) e.dateFrom = 'Bitte ein Datum wählen.';
    if (!f.dateTo) e.dateTo = 'Bitte ein Datum wählen.';
    if (f.dateFrom && f.dateTo && f.dateTo < f.dateFrom)
        e.dateTo = 'Das Enddatum muss nach dem Startdatum liegen.';
    // Ort, Programm und Tagesablauf braucht die Stammleitung für Förderanträge.
    if (!f.location.trim()) e.location = 'Bitte gib den Ort bzw. Treffpunkt an.';
    if (!f.description.trim()) e.description = 'Bitte beschreibe, was beim Hajk gemacht wird.';
    if (!f.dailySchedule.trim()) e.dailySchedule = 'Bitte beschreibe den ungefähren Tagesablauf.';
    return e;
}

/** Nicht blockierender Förder-Hinweis (unter zwei Übernachtungen). */
export function fewNightsWarning(f: FormState): string | null {
    if (!f.dateFrom || !f.dateTo || f.dateTo < f.dateFrom) return null;
    if (countNights(f.dateFrom, f.dateTo) >= 2) return null;
    return 'Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.';
}

export function validateStep2(f: FormState): Step2Errors {
    const e: Step2Errors = {};
    if (f.mode === 'self' && f.signupDeadline && f.dateFrom && f.signupDeadline >= f.dateFrom)
        e.signupDeadline = 'Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.';
    if (f.maxMembers !== '' && !/^[1-9]\d*$/.test(f.maxMembers))
        e.maxMembers = 'Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.';
    return e;
}
