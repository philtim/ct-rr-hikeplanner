// @vitest-environment node
/**
 * End-to-End-Integrationstest gegen die Demo-Instanz (rr-demo).
 * Läuft NUR mit RUN_E2E=1 (z. B. `RUN_E2E=1 npx vitest run e2e-demo`):
 * er schreibt echte Daten (und räumt sie wieder auf) und braucht die
 * Seed-Struktur aus `npm run seed:demo` plus IDs in .env.
 *
 * Getestet werden die ECHTEN Module (loadWizardContext, provisionApi,
 * executeProvisioning) — nur der HTTP-Layer (@/shared/api) ist durch eine
 * fetch-Implementierung mit Cookie-Login ersetzt, weil der offizielle
 * Client im Browser läuft.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const BASE = import.meta.env.VITE_BASE_URL as string;
const RUN = !!process.env.RUN_E2E;

const cookies = new Map<string, string>();
let csrf = '';

async function call<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}/api${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(cookies.size ? { Cookie: [...cookies.values()].join('; ') } : {}),
            ...(csrf ? { 'CSRF-Token': csrf } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
        const pair = c.split(';')[0];
        cookies.set(pair.slice(0, pair.indexOf('=')), pair);
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${endpoint} -> ${res.status}: ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text).data : undefined) as T;
}

vi.mock('@/shared/api', () => ({
    apiGet: <T>(e: string) => call<T>('GET', e),
    apiPost: <T>(e: string, d?: unknown) => call<T>('POST', e, d),
    apiPut: <T>(e: string, d?: unknown) => call<T>('PUT', e, d),
    apiPatch: <T>(e: string, d?: unknown) => call<T>('PATCH', e, d),
    apiDelete: <T>(e: string, d?: unknown) => call<T>('DELETE', e, d),
    fetchAllPages: async <T>(url: string, options: { limit?: number } = {}) => {
        const limit = options.limit ?? 100;
        const results: T[] = [];
        for (let page = 1; page <= 50; page++) {
            const sep = url.includes('?') ? '&' : '?';
            const items = await call<T[]>('GET', `${url}${sep}page=${page}&limit=${limit}`);
            if (!items || items.length === 0) break;
            results.push(...items);
            if (items.length < limit) break;
        }
        return results;
    },
    getOriginUrl: () => BASE,
    ChurchToolsApiError: class ChurchToolsApiError extends Error {},
}));

import { loadWizardContext, provisionApi } from '@/wizard/wizard.api';
import { executeProvisioning } from '@/wizard/provisioning';
import type { FormState, ProvisionProgress } from '@/wizard/types';

const form: FormState = {
    teamId: 0, // wird nach dem Context-Load gesetzt
    dateFrom: '2027-06-18',
    dateTo: '2027-06-20',
    location: 'Testplatz',
    description: 'E2E-Testhajk, 2 Nächte',
    mode: 'self',
    signupDeadline: '2027-06-11',
    maxMembers: '12',
    titleSuffix: 'E2E-Lauf',
    publicSignup: true,
    publishNow: true,
    selectedFieldIds: [],
};
const EXPECTED_NAME = 'RR Hajk Testbären 18.06.–20.06.2027 E2E-Lauf';

let createdGroupId: number | null = null;

async function deleteGroupByName(name: string) {
    const groups = await call<{ id: number; name: string }[]>(
        'GET',
        `/groups?query=${encodeURIComponent(name)}&limit=200`,
    );
    for (const g of groups.filter((g) => g.name === name)) {
        await call('DELETE', `/groups/${g.id}`);
    }
}

async function getCalendarId(): Promise<number> {
    const calendars = await call<{ id: number; name: string }[]>('GET', '/calendars');
    const cal = calendars.find((c) => c.name === 'Royal Rangers');
    if (!cal) throw new Error('Kalender "Royal Rangers" fehlt auf der Demo-Instanz');
    return cal.id;
}

async function deleteE2eAppointments() {
    const calId = await getCalendarId();
    const appts = await call<{ base: { id: number; title: string } }[]>(
        'GET',
        `/calendars/${calId}/appointments?from=2027-06-01&to=2027-06-30`,
    );
    for (const a of appts) {
        if (a.base.title === EXPECTED_NAME) {
            await call('DELETE', `/calendars/${calId}/appointments/${a.base.id}`);
        }
    }
}

describe.runIf(RUN)('E2E gegen rr-demo', () => {
    beforeAll(async () => {
        await call('POST', '/login', {
            username: import.meta.env.VITE_USERNAME,
            password: import.meta.env.VITE_PASSWORD,
        });
        csrf = await call<string>('GET', '/csrftoken');
        await deleteGroupByName(EXPECTED_NAME); // Reste früherer Läufe
        await deleteE2eAppointments();
    }, 30_000);

    afterAll(async () => {
        if (createdGroupId) await call('DELETE', `/groups/${createdGroupId}`).catch(() => {});
        await deleteE2eAppointments();
    }, 30_000);

    it('lädt den echten Wizard-Context', async () => {
        const ctx = await loadWizardContext();
        expect(ctx.leader.kind).not.toBe('none');
        const team = ctx.leader.teams.find((t) => t.shortName === 'Testbären');
        expect(team).toBeDefined();
        expect(team?.sammelgruppeId).not.toBeNull();
        expect(ctx.template.fields.map((f) => f.name)).toEqual(
            expect.arrayContaining(['Vegetarisch', 'T-Shirt-Größe', 'Bemerkung']),
        );
        expect(ctx.template.organisators.length).toBeGreaterThan(0);
        expect(ctx.calendarId).not.toBeNull();

        form.teamId = team!.groupId;
        form.selectedFieldIds = [ctx.template.fields.find((f) => f.name === 'Vegetarisch')!.id];
    }, 30_000);

    it('provisioniert einen echten Hajk end-to-end', async () => {
        const ctx = await loadWizardContext();
        const team = ctx.leader.teams.find((t) => t.shortName === 'Testbären')!;
        form.teamId = team.groupId;
        form.selectedFieldIds = [ctx.template.fields.find((f) => f.name === 'Vegetarisch')!.id];

        const progress: ProvisionProgress[] = [];
        const outcome = await executeProvisioning(
            {
                form,
                team,
                context: ctx,
                calendarId: ctx.calendarId,
                groupUrl: (id) => `${BASE}/groups/${id}`,
            },
            provisionApi,
            (p) => progress.push(p),
        );

        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        createdGroupId = outcome.groupId;
        expect(outcome.calendarWarning).toBe(false);
        expect(outcome.fieldsWarning).toBe(false);

        // Gruppe: Name, Settings, Beschreibung
        const group = await call<{
            name: string;
            information: { note: string; dateOfFoundation: string; endDate: string };
            settings: {
                isOpenForMembers: boolean;
                signUpClosingDate: string | null;
                maxMembers: number;
            };
        }>('GET', `/groups/${outcome.groupId}`);
        expect(group.name).toBe(EXPECTED_NAME);
        expect(group.information.note).toContain('Treffpunkt: Testplatz');
        expect(group.information.dateOfFoundation).toBe('2027-06-18');
        expect(group.information.endDate).toBe('2027-06-20');
        expect(group.settings.isOpenForMembers).toBe(true);
        expect(group.settings.maxMembers).toBe(12);

        // Öffentliche Anmeldung: Flags gesetzt und Link ohne Login erreichbar
        const pub = await call<{ settings: { visibility: string; isPublic: boolean } }>(
            'GET',
            `/groups/${outcome.groupId}`,
        );
        expect(pub.settings.visibility).toBe('public');
        expect(pub.settings.isPublic).toBe(true);
        const anon = await fetch(`${BASE}/groups/${outcome.groupId}/signup`);
        expect(anon.status).toBe(200);

        // Felder: genau das gewählte
        const fields = await call<{ field: { name: string } }[]>(
            'GET',
            `/groups/${outcome.groupId}/memberfields`,
        );
        expect(fields.map((f) => f.field.name)).toEqual(['Vegetarisch']);

        // Eltern: genau die Sammelgruppe
        const parents = await call<{ domainIdentifier: string }[]>(
            'GET',
            `/groups/${outcome.groupId}/parents`,
        );
        expect(parents.map((p) => Number(p.domainIdentifier))).toEqual([team.sammelgruppeId]);

        // Mitglieder: Seed-User ist Organisator UND anfragender Leiter →
        // der Leiter-Put gewinnt (auf live sind das verschiedene Personen).
        const members = await call<{ personId: number; groupTypeRoleId: number }[]>(
            'GET',
            `/groups/${outcome.groupId}/members`,
        );
        expect(members).toEqual([
            expect.objectContaining({
                personId: ctx.user.id,
                groupTypeRoleId: ctx.eventLeaderRoleId,
            }),
        ]);

        // Kalendertermin existiert
        const appts = await call<{ base: { title: string; allDay?: boolean } }[]>(
            'GET',
            `/calendars/${ctx.calendarId}/appointments?from=2027-06-01&to=2027-06-30`,
        );
        expect(appts.map((a) => a.base.title)).toContain(EXPECTED_NAME);

        // Namenskollision beim zweiten Lauf
        const second = await executeProvisioning(
            {
                form,
                team,
                context: ctx,
                calendarId: ctx.calendarId,
                groupUrl: (id) => `${BASE}/groups/${id}`,
            },
            provisionApi,
            () => {},
        );
        expect(second).toMatchObject({
            ok: false,
            failedStep: 'precheck',
            existingGroupId: outcome.groupId,
        });
    }, 60_000);
});
