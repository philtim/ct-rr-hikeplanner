import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/shared/api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
    fetchAllPages: vi.fn(),
    getOriginUrl: () => 'https://rr-demo.church.tools',
    ChurchToolsApiError: class ChurchToolsApiError extends Error {},
}));

import * as api from '@/shared/api';
import { loadWizardContext, provisionApi } from '@/wizard/wizard.api';
const T = 2587;

const roles = [
    { id: 9, groupTypeId: 1, isLeader: true, name: 'Leiter', type: 'leader' },
    { id: 8, groupTypeId: 1, isLeader: false, name: 'Teilnehmer', type: 'participant' },
    { id: 22, groupTypeId: 3, isLeader: false, name: 'Teilnehmer', type: 'participant' },
    { id: 23, groupTypeId: 3, isLeader: true, name: 'Leiter', type: 'leader' },
    { id: 26, groupTypeId: 3, isLeader: false, name: 'Organisator', type: 'participant' },
];

const hierarchies = [
    { groupId: 999, group: null, parents: [], children: [] }, // unsichtbare Gruppe
    { groupId: 950, group: { title: 'RR Gesamt-Stammleitung' }, parents: [], children: [123] },
    {
        groupId: 123,
        group: { title: 'RR Kundschafterstamm-MA' },
        parents: [950],
        children: [2156, 2612],
    },
    {
        groupId: 2156,
        group: { title: 'RR Kundschafterteam Eisbären' },
        parents: [123],
        children: [],
    },
    {
        groupId: 2612,
        group: { title: 'RR | Camps und Aktionen - Kundschafter' },
        parents: [123],
        children: [],
    },
];

const templateMembers = [
    {
        personId: 1050,
        groupTypeRoleId: 26,
        person: { domainAttributes: { firstName: 'Irma', lastName: 'Betz' } },
    },
    {
        personId: 2223,
        groupTypeRoleId: 23,
        person: { domainAttributes: { firstName: 'Philipp', lastName: 'T' } },
    },
];

const templateFields = [
    {
        type: 'group',
        field: {
            id: 3508,
            name: 'Vegetarisch',
            fieldTypeCode: 'radioselect',
            options: [
                { id: 1, name: 'Ja' },
                { id: 2, name: 'Nein' },
            ],
            requiredInRegistrationForm: true,
        },
    },
    {
        type: 'group',
        field: {
            id: 3502,
            name: 'Bemerkung',
            fieldTypeCode: 'text',
            options: null,
            requiredInRegistrationForm: false,
        },
    },
];

function mockContextEndpoints(overrides: Record<string, unknown> = {}) {
    const responses: Record<string, unknown> = {
        '/whoami': { id: 42, firstName: 'Christoph', lastName: 'Cremer' },
        '/groups': [{ id: T, name: '=== Vorlage Hajks' }],
        '/calendars': [
            { id: 4, name: 'Gemeindeleitung' },
            { id: 69, name: 'Royal Rangers' },
        ],
        '/groups/hierarchies': hierarchies,
        '/group/roles': roles,
        [`/groups/${T}`]: { id: T, name: '=== Vorlage Hajks', information: { groupTypeId: 3 } },
        [`/groups/${T}/memberfields`]: templateFields,
        [`/groups/${T}/parents`]: [{ domainIdentifier: '2612', title: 'RR | Camps…' }],
        ...overrides,
    };
    (api.apiGet as Mock).mockImplementation((url: string) => {
        for (const [k, v] of Object.entries(responses)) {
            if (url === k || url.startsWith(`${k}?`)) return Promise.resolve(v);
        }
        return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    (api.fetchAllPages as Mock).mockImplementation((url: string) => {
        if (url.startsWith('/persons/42/groups'))
            return Promise.resolve([
                { group: null, groupTypeRoleId: 29 }, // unsichtbare Gruppe
                {
                    group: { domainIdentifier: '2156', title: 'RR Kundschafterteam Eisbären' },
                    groupTypeRoleId: 9,
                },
            ]);
        if (url.startsWith(`/groups/${T}/members`)) return Promise.resolve(templateMembers);
        return Promise.reject(new Error(`unmocked pages ${url}`));
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('loadWizardContext', () => {
    it('assembles the full wizard context', async () => {
        mockContextEndpoints();
        const ctx = await loadWizardContext();
        expect(ctx.user).toEqual({ id: 42, firstName: 'Christoph', lastName: 'Cremer' });
        expect(ctx.leader.kind).toBe('teamleiter');
        expect(ctx.leader.teams[0]).toMatchObject({ groupId: 2156, sammelgruppeId: 2612 });
        expect(ctx.template.id).toBe(T);
        expect(ctx.template.parentIds).toEqual([2612]);
        expect(ctx.template.fields).toEqual([
            {
                id: 3508,
                name: 'Vegetarisch',
                fieldTypeCode: 'radioselect',
                options: ['Ja', 'Nein'],
                requiredInRegistrationForm: true,
            },
            {
                id: 3502,
                name: 'Bemerkung',
                fieldTypeCode: 'text',
                options: [],
                requiredInRegistrationForm: false,
            },
        ]);
        expect(ctx.template.organisators).toEqual([{ personId: 1050, name: 'Irma Betz' }]);
        expect(ctx.eventLeaderRoleId).toBe(23);
        expect(ctx.organisatorRoleId).toBe(26);
        expect(ctx.calendarId).toBe(69);
    });

    it('tolerates an unreadable member list (organisators empty, no error)', async () => {
        mockContextEndpoints();
        (api.fetchAllPages as Mock).mockImplementation((url: string) => {
            if (url.startsWith('/persons/42/groups')) return Promise.resolve([]);
            if (url.startsWith(`/groups/${T}/members`)) return Promise.resolve([]);
            return Promise.reject(new Error(`unmocked pages ${url}`));
        });
        const ctx = await loadWizardContext();
        expect(ctx.template.organisators).toEqual([]);
    });
});

describe('loadWizardContext with english default role names', () => {
    it('falls back to the first isLeader role when no role is named Leiter', async () => {
        const englishRoles = [
            { id: 9, groupTypeId: 1, isLeader: true, name: 'Leiter', type: 'leader' },
            { id: 49, groupTypeId: 7, isLeader: false, name: 'participant', type: 'participant' },
            { id: 52, groupTypeId: 7, isLeader: true, name: 'leader', type: 'leader' },
            { id: 55, groupTypeId: 7, isLeader: true, name: 'Co-Leiter', type: 'leader' },
            { id: 58, groupTypeId: 7, isLeader: false, name: 'Organisator', type: 'participant' },
        ];
        mockContextEndpoints({
            '/group/roles': englishRoles,
            [`/groups/${T}`]: { id: T, name: '=== Vorlage Hajks', information: { groupTypeId: 7 } },
        });
        (api.fetchAllPages as Mock).mockImplementation((url: string) => {
            if (url.startsWith('/persons/42/groups')) return Promise.resolve([]);
            if (url.startsWith(`/groups/${T}/members`))
                return Promise.resolve([
                    {
                        personId: 1050,
                        groupTypeRoleId: 58,
                        person: { domainAttributes: { firstName: 'Irma', lastName: 'Betz' } },
                    },
                ]);
            return Promise.reject(new Error(`unmocked pages ${url}`));
        });
        const ctx = await loadWizardContext();
        expect(ctx.eventLeaderRoleId).toBe(52);
        expect(ctx.organisatorRoleId).toBe(58);
    });
});

describe('provisionApi', () => {
    it('findGroupIdByName matches exact names only', async () => {
        (api.apiGet as Mock).mockResolvedValue([
            { id: 1, name: 'RR Hajk Eisbären 10.04.–12.04.2027 ALT' },
            { id: 2, name: 'RR Hajk Eisbären 10.04.–12.04.2027' },
        ]);
        expect(await provisionApi.findGroupIdByName('RR Hajk Eisbären 10.04.–12.04.2027')).toBe(2);
        (api.apiGet as Mock).mockResolvedValue([]);
        expect(await provisionApi.findGroupIdByName('RR Hajk X')).toBeNull();
    });

    it('duplicateGroup url-encodes the new name and returns the new id', async () => {
        (api.apiPost as Mock).mockResolvedValue({ id: 99 });
        const id = await provisionApi.duplicateGroup(T, 'RR Hajk Eisbären 10.04.–12.04.2027', false);
        expect(id).toBe(99);
        const url = (api.apiPost as Mock).mock.calls[0][0] as string;
        expect(url).toBe(
            `/groups/${T}/duplicate?newName=${encodeURIComponent('RR Hajk Eisbären 10.04.–12.04.2027')}`,
        );
    });

    it('configureGroup sends flat keys and derives signup settings from the mode', async () => {
        (api.apiPatch as Mock).mockResolvedValue({});
        await provisionApi.configureGroup(99, {
            teamId: 2156,
            dateFrom: '2027-04-10',
            dateTo: '2027-04-12',
            location: 'Gemeindehaus',
            description: 'Toller Hajk',
            mode: 'self',
            signupDeadline: '2027-04-03',
            maxMembers: '20',
            selectedFieldIds: [],
        });
        const [url, body] = (api.apiPatch as Mock).mock.calls[0] as [
            string,
            Record<string, unknown>,
        ];
        expect(url).toBe('/groups/99');
        expect(body.dateOfFoundation).toBe('2027-04-10');
        expect(body.endDate).toBe('2027-04-12');
        expect(body.maxMembers).toBe(20);
        expect(body.note).toBe('Toller Hajk\n\nTreffpunkt: Gemeindehaus');
        expect(body.signUpClosingDate).toBe('2027-04-03T23:59:59Z');
        expect(typeof body.signUpOpeningDate).toBe('string');
    });

    it('configureGroup disables signup in manual mode and omits limits when empty', async () => {
        (api.apiPatch as Mock).mockResolvedValue({});
        await provisionApi.configureGroup(99, {
            teamId: 2156,
            dateFrom: '2027-04-10',
            dateTo: '2027-04-12',
            location: '',
            description: 'Toller Hajk',
            mode: 'manual',
            signupDeadline: '2027-04-03',
            maxMembers: '',
            selectedFieldIds: [],
        });
        const body = (api.apiPatch as Mock).mock.calls[0][1] as Record<string, unknown>;
        expect(body.signUpOpeningDate).toBeNull();
        expect(body.signUpClosingDate).toBeNull();
        expect(body.maxMembers).toBeNull();
        expect(body.note).toBe('Toller Hajk');
    });

    it('listParentIds parses domainIdentifier strings', async () => {
        (api.apiGet as Mock).mockResolvedValue([
            { domainIdentifier: '2612', title: 'A' },
            { domainIdentifier: '2600', title: 'B' },
        ]);
        expect(await provisionApi.listParentIds(99)).toEqual([2612, 2600]);
    });

    it('createAppointment sends the verified minimal payload', async () => {
        (api.apiPost as Mock).mockResolvedValue({ id: 7 });
        await provisionApi.createAppointment(69, {
            caption: 'RR Hajk Eisbären 10.04.–12.04.2027',
            startDate: '2027-04-10',
            endDate: '2027-04-12',
            description: 'Info + Link',
        });
        const [url, body] = (api.apiPost as Mock).mock.calls[0] as [
            string,
            Record<string, unknown>,
        ];
        expect(url).toBe('/calendars/69/appointments');
        expect(body).toMatchObject({
            allDay: true,
            isInternal: false,
            caption: 'RR Hajk Eisbären 10.04.–12.04.2027',
        });
    });
});
