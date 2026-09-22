import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeProvisioning } from '@/wizard/provisioning';
import type { ProvisionInput } from '@/wizard/provisioning';
import type { ProvisionApi } from '@/wizard/wizard.api';
import type { ProvisionProgress, WizardContext } from '@/wizard/types';

const context: WizardContext = {
    user: { id: 42, firstName: 'Christoph', lastName: 'Cremer' },
    leader: { kind: 'teamleiter', teams: [] },
    template: {
        id: 2587,
        parentIds: [2612, 2600],
        fields: [
            {
                id: 3508,
                name: 'Vegetarisch',
                fieldTypeCode: 'radioselect',
                options: ['Ja', 'Nein'],
                requiredInRegistrationForm: true,
            },
            {
                id: 3502,
                name: 'T-Shirt-Größe',
                fieldTypeCode: 'radioselect',
                options: ['S', 'M'],
                requiredInRegistrationForm: false,
            },
        ],
        organisators: [
            { personId: 1050, name: 'Irma Betz' },
            { personId: 2226, name: 'Julia Timmalog' },
        ],
    },
    eventLeaderRoleId: 23,
    organisatorRoleId: 26,
    calendarId: 69,
};

const input: ProvisionInput = {
    form: {
        teamId: 2156,
        dateFrom: '2027-04-10',
        dateTo: '2027-04-12',
        location: 'Gemeindehaus',
        description: 'Toller Hajk, 2 Nächte',
        mode: 'self',
        signupDeadline: '2027-04-03',
        maxMembers: '20',
        titleSuffix: '',
        publicSignup: false,
        publishNow: true,
    },
    team: {
        groupId: 2156,
        name: 'RR Kundschafterteam Eisbären',
        shortName: 'Eisbären',
        stufe: 'Kundschafter',
        sammelgruppeId: 2612,
        sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
    },
    context,
    calendarId: 69,
    groupUrl: (id) => `https://x.church.tools/groups/${id}`,
};

function makeApi(overrides: Partial<ProvisionApi> = {}): ProvisionApi {
    return {
        findGroupIdByName: vi.fn().mockResolvedValue(null),
        duplicateGroup: vi.fn().mockResolvedValue(99),
        configureGroup: vi.fn().mockResolvedValue(undefined),
        listParentIds: vi.fn().mockResolvedValue([2612, 2600]),
        removeParent: vi.fn().mockResolvedValue(undefined),
        addParent: vi.fn().mockResolvedValue(undefined),
        putMember: vi.fn().mockResolvedValue(undefined),
        createAppointment: vi.fn().mockResolvedValue(undefined),
        deleteGroup: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

let progress: ProvisionProgress[];
const onProgress = (p: ProvisionProgress) => progress.push(p);

beforeEach(() => {
    progress = [];
});

describe('executeProvisioning', () => {
    it('runs the happy path in order and reports done steps', async () => {
        const api = makeApi();
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toEqual({
            ok: true,
            groupId: 99,
            calendarWarning: false,
        });

        expect(api.duplicateGroup).toHaveBeenCalledWith(
            2587,
            'RR Hajk Eisbären 10.04.–12.04.2027',
            false,
        );
        expect(api.configureGroup).toHaveBeenCalledWith(99, input.form);
        // geerbte Parents raus, Ziel-Sammelgruppe rein
        expect(api.removeParent).toHaveBeenCalledWith(99, 2612);
        expect(api.removeParent).toHaveBeenCalledWith(99, 2600);
        expect(api.addParent).toHaveBeenCalledWith(99, 2612);
        // Organisatoren vor dem Leiter
        const putCalls = (api.putMember as ReturnType<typeof vi.fn>).mock.calls;
        expect(putCalls).toEqual([
            [99, 1050, 26],
            [99, 2226, 26],
            [99, 42, 23],
        ]);
        expect(api.createAppointment).toHaveBeenCalledWith(69, {
            caption: 'RR Hajk Eisbären 10.04.–12.04.2027',
            startDate: '2027-04-10',
            endDate: '2027-04-12',
            description: expect.stringContaining('https://x.church.tools/groups/99'),
        });

        const doneSteps = progress.filter((p) => p.status === 'done').map((p) => p.step);
        expect(doneSteps).toEqual(['duplicate', 'members', 'configure', 'parents', 'calendar']);
    });

    it('copies members server-side when the organisator list is unreadable', async () => {
        const api = makeApi();
        const ctx = { ...context, template: { ...context.template, organisators: [] } };
        const outcome = await executeProvisioning({ ...input, context: ctx }, api, onProgress);
        expect(outcome).toMatchObject({ ok: true });
        expect(api.duplicateGroup).toHaveBeenCalledWith(
            2587,
            'RR Hajk Eisbären 10.04.–12.04.2027',
            true,
        );
        // nur der anfragende Leiter wird noch eingetragen
        expect((api.putMember as ReturnType<typeof vi.fn>).mock.calls).toEqual([[99, 42, 23]]);
    });

    it('aborts on name collision before duplicating', async () => {
        const api = makeApi({ findGroupIdByName: vi.fn().mockResolvedValue(55) });
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toEqual({
            ok: false,
            failedStep: 'precheck',
            message: 'Es gibt bereits eine Gruppe mit diesem Namen.',
            rollback: 'not-needed',
            existingGroupId: 55,
        });
        expect(api.duplicateGroup).not.toHaveBeenCalled();
    });

    it('ignores failures when removing inherited parents', async () => {
        const api = makeApi({ removeParent: vi.fn().mockRejectedValue(new Error('403')) });
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toMatchObject({ ok: true });
        expect(api.addParent).toHaveBeenCalledWith(99, 2612);
    });

    it('rolls back the group when a step fails', async () => {
        const api = makeApi({ addParent: vi.fn().mockRejectedValue(new Error('boom')) });
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toMatchObject({ ok: false, failedStep: 'parents', rollback: 'done' });
        expect(api.deleteGroup).toHaveBeenCalledWith(99);
        expect(progress.at(-1)).toEqual({ step: 'parents', status: 'failed' });
    });

    it('reports a failed rollback with the orphan group id', async () => {
        const api = makeApi({
            configureGroup: vi.fn().mockRejectedValue(new Error('boom')),
            deleteGroup: vi.fn().mockRejectedValue(new Error('cannot delete')),
        });
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toMatchObject({
            ok: false,
            failedStep: 'configure',
            rollback: 'failed',
            orphanGroupId: 99,
        });
    });

    it('warns without api call when the calendar is missing on the instance', async () => {
        const api = makeApi();
        const outcome = await executeProvisioning({ ...input, calendarId: null }, api, onProgress);
        expect(outcome).toEqual({
            ok: true,
            groupId: 99,
            calendarWarning: true,
        });
        expect(api.createAppointment).not.toHaveBeenCalled();
        expect(progress.at(-1)).toEqual({ step: 'calendar', status: 'failed' });
    });

    it('treats a calendar failure as success with warning and keeps the group', async () => {
        const api = makeApi({
            createAppointment: vi.fn().mockRejectedValue(new Error('no rights')),
        });
        const outcome = await executeProvisioning(input, api, onProgress);
        expect(outcome).toEqual({
            ok: true,
            groupId: 99,
            calendarWarning: true,
        });
        expect(api.deleteGroup).not.toHaveBeenCalled();
        expect(progress.at(-1)).toEqual({ step: 'calendar', status: 'failed' });
    });
});
