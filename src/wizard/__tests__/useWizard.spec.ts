import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizard } from '@/wizard/useWizard';
import type { ProvisionOutcome, WizardContext } from '@/wizard/types';

const teamEisbaeren = {
    groupId: 2156,
    name: 'RR Kundschafterteam Eisbären',
    shortName: 'Eisbären',
    stufe: 'Kundschafter' as const,
    sammelgruppeId: 2612,
    sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
};
const teamLoewen = {
    groupId: 1930,
    name: 'RR Kundschafterteam Löwen',
    shortName: 'Löwen',
    stufe: 'Kundschafter' as const,
    sammelgruppeId: 2612,
    sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
};

function makeContext(overrides: Partial<WizardContext['leader']> = {}): WizardContext {
    return {
        user: { id: 42, firstName: 'Christoph', lastName: 'Cremer' },
        leader: { kind: 'teamleiter', teams: [teamEisbaeren], ...overrides },
        template: {
            id: 2587,
            parentIds: [2612],
            fields: [
                {
                    id: 3508,
                    name: 'Vegetarisch',
                    fieldTypeCode: 'radioselect',
                    options: ['Ja', 'Nein'],
                    requiredInRegistrationForm: true,
                },
            ],
            organisators: [{ personId: 1050, name: 'Irma Betz' }],
        },
        eventLeaderRoleId: 23,
        organisatorRoleId: 26,
        calendarId: 69,
    };
}

function fillValidForm(w: ReturnType<typeof useWizard>) {
    w.form.teamId = 2156;
    w.form.dateFrom = '2027-04-10';
    w.form.dateTo = '2027-04-12';
    w.form.description = 'Toller Hajk, 2 Nächte';
}

const okOutcome: ProvisionOutcome = { ok: true, groupId: 99, calendarWarning: false };

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useWizard gate', () => {
    it('loads context and enters the form with preselected single team', async () => {
        const w = useWizard({ load: vi.fn().mockResolvedValue(makeContext()) });
        await w.start();
        expect(w.state.value).toEqual({ phase: 'form', step: 1 });
        expect(w.form.teamId).toBe(2156);
    });

    it('does not preselect with multiple teams', async () => {
        const w = useWizard({
            load: vi
                .fn()
                .mockResolvedValue(
                    makeContext({ kind: 'stammleiter', teams: [teamEisbaeren, teamLoewen] }),
                ),
        });
        await w.start();
        expect(w.form.teamId).toBeNull();
    });

    it('shows no-access for non-leaders', async () => {
        const w = useWizard({
            load: vi.fn().mockResolvedValue(makeContext({ kind: 'none', teams: [] })),
        });
        await w.start();
        expect(w.state.value).toEqual({ phase: 'no-access' });
    });

    it('maps template-invalid to a gate error with hint', async () => {
        const w = useWizard({
            load: vi.fn().mockRejectedValue(new Error('template-invalid: kein Organisator')),
        });
        await w.start();
        expect(w.state.value.phase).toBe('gate-error');
        if (w.state.value.phase === 'gate-error') {
            expect(w.state.value.message).toContain('kein Organisator');
            expect(w.state.value.message).toContain('Stammleitung');
        }
    });
});

describe('useWizard navigation', () => {
    async function startedWizard() {
        const w = useWizard({ load: vi.fn().mockResolvedValue(makeContext()) });
        await w.start();
        return w;
    }

    it('blocks goNext on step 1 until valid and focuses errors', async () => {
        const w = await startedWizard();
        w.goNext();
        expect(w.state.value).toEqual({ phase: 'form', step: 1 });
        expect(Object.keys(w.step1Errors.value)).toContain('description');

        fillValidForm(w);
        w.goNext();
        expect(w.state.value).toEqual({ phase: 'form', step: 2 });
        expect(w.step1Errors.value).toEqual({});
    });

    it('rejects a team without Sammelgruppe', async () => {
        const noSammel = { ...teamEisbaeren, sammelgruppeId: null, sammelgruppeName: null };
        const w = useWizard({
            load: vi.fn().mockResolvedValue(makeContext({ teams: [noSammel] })),
        });
        await w.start();
        fillValidForm(w);
        w.goNext();
        expect(w.state.value).toEqual({ phase: 'form', step: 1 });
        expect(w.step1Errors.value.teamId).toContain('Sammelgruppe');
    });

    it('computes the generated group name live', async () => {
        const w = await startedWizard();
        fillValidForm(w);
        expect(w.groupName.value).toBe('RR Hajk Eisbären 10.04.–12.04.2027');
    });

    it('allows going back without losing input', async () => {
        const w = await startedWizard();
        fillValidForm(w);
        w.goNext();
        w.form.signupDeadline = '2027-04-03';
        w.goBack();
        expect(w.state.value).toEqual({ phase: 'form', step: 1 });
        expect(w.form.signupDeadline).toBe('2027-04-03');
    });
});

describe('useWizard submit', () => {
    async function wizardOnStep3(execute = vi.fn().mockResolvedValue(okOutcome)) {
        const w = useWizard({ load: vi.fn().mockResolvedValue(makeContext()), execute });
        await w.start();
        fillValidForm(w);
        w.goNext();
        w.goNext();
        expect(w.state.value).toEqual({ phase: 'form', step: 3 });
        return { w, execute };
    }

    it('submits and reaches done with the group name', async () => {
        const { w } = await wizardOnStep3();
        await w.submit();
        expect(w.state.value.phase).toBe('done');
        if (w.state.value.phase === 'done') {
            expect(w.state.value.groupName).toBe('RR Hajk Eisbären 10.04.–12.04.2027');
            expect(w.state.value.outcome.groupId).toBe(99);
        }
    });

    it('enters failed state on provisioning failure and retries', async () => {
        const failed: ProvisionOutcome = {
            ok: false,
            failedStep: 'parents',
            message: 'boom',
            rollback: 'done',
        };
        const execute = vi.fn().mockResolvedValueOnce(failed).mockResolvedValueOnce(okOutcome);
        const { w } = await wizardOnStep3(execute);
        await w.submit();
        expect(w.state.value.phase).toBe('failed');
        await w.retry();
        expect(w.state.value.phase).toBe('done');
        expect(execute).toHaveBeenCalledTimes(2);
    });

    it('reset returns to an empty step 1', async () => {
        const { w } = await wizardOnStep3();
        await w.submit();
        w.reset();
        expect(w.state.value).toEqual({ phase: 'form', step: 1 });
        expect(w.form.description).toBe('');
        expect(w.form.teamId).toBe(2156); // Ein-Team-Leiter: Vorauswahl bleibt
    });
});
