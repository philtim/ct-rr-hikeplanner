import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StepReview from '@/wizard/components/StepReview.vue';
import ProgressList from '@/wizard/components/ProgressList.vue';
import type {
    FormState,
    ProvisionOutcome,
    ProvisionProgress,
    TeamOption,
    WizardContext,
} from '@/wizard/types';

const team: TeamOption = {
    groupId: 2156,
    name: 'RR Kundschafterteam Eisbären',
    shortName: 'Eisbären',
    stufe: 'Kundschafter',
    sammelgruppeId: 2612,
    sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
};

const context: WizardContext = {
    user: { id: 42, firstName: 'Christoph', lastName: 'Cremer' },
    leader: { kind: 'teamleiter', teams: [team] },
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
};

const form: FormState = {
    teamId: 2156,
    dateFrom: '2027-04-10',
    dateTo: '2027-04-12',
    location: 'Gemeindehaus Altensteig',
    description: 'Wochenend-Hajk im Schwarzwald',
    mode: 'self',
    signupDeadline: '2027-04-03',
    maxMembers: '20',
    selectedFieldIds: [3508, 3502],
};

const idleProgress: ProvisionProgress[] = [];

function makeWrapper(props: Record<string, unknown> = {}) {
    return mount(StepReview, {
        props: {
            form,
            context,
            team,
            groupName: 'RR Hajk Eisbären 10.04.–12.04.2027',
            sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
            phase: 'form',
            progress: idleProgress,
            failedOutcome: null,
            groupUrl: (id: number) => `https://x.tools/groups/${id}`,
            ...props,
        },
    });
}

describe('StepReview summary', () => {
    it('shows the generated name, mode line, fields and organisators', () => {
        const w = makeWrapper();
        const text = w.text();
        expect(text).toContain('RR Hajk Eisbären 10.04.–12.04.2027');
        expect(text).toContain('Selbstanmeldung bis 03.04.2027');
        expect(text).toContain('(2 Nächte)');
        expect(text).toContain('Vegetarisch · T-Shirt-Größe');
        expect(text).toContain('Irma Betz, Julia Timmalog');
        expect(text).toContain('Du (Christoph Cremer)');
        expect(text).toContain('RR | Camps und Aktionen - Kundschafter');
    });

    it('shows the manual mode line without deadline', () => {
        const w = makeWrapper({ form: { ...form, mode: 'manual' } });
        expect(w.text()).toContain('Du trägst die Teilnehmer selbst ein');
        expect(w.text()).not.toContain('Selbstanmeldung bis');
    });

    it('emits edit with the step number', async () => {
        const w = makeWrapper();
        const editLinks = w.findAll('[data-testid^="edit-"]');
        await editLinks[0].trigger('click');
        await editLinks[1].trigger('click');
        expect(w.emitted('edit')).toEqual([[1], [2]]);
    });

    it('emits submit once and disables during provisioning', async () => {
        const w = makeWrapper();
        await w.find('[data-testid="submit"]').trigger('click');
        expect(w.emitted('submit')).toHaveLength(1);

        const busy = makeWrapper({ phase: 'provisioning' });
        expect(busy.find('[data-testid="submit"]').exists()).toBe(false);
        expect(busy.text()).toContain('Dein Hajk wird angelegt');
    });
});

describe('StepReview failure card', () => {
    const failedRollback: Extract<ProvisionOutcome, { ok: false }> = {
        ok: false,
        failedStep: 'parents',
        message: 'boom',
        rollback: 'done',
    };

    it('shows rollback confirmation and retry', async () => {
        const w = makeWrapper({ phase: 'failed', failedOutcome: failedRollback });
        expect(w.find('[role="alert"]').text()).toContain('wieder entfernt');
        await w.find('[data-testid="retry"]').trigger('click');
        expect(w.emitted('retry')).toHaveLength(1);
    });

    it('links the existing group on name collision', () => {
        const w = makeWrapper({
            phase: 'failed',
            failedOutcome: {
                ok: false,
                failedStep: 'precheck',
                message: 'Es gibt bereits eine Gruppe mit diesem Namen.',
                rollback: 'not-needed',
                existingGroupId: 55,
            },
        });
        expect(w.find('[role="alert"]').text()).toContain('bereits eine Gruppe');
        expect(w.find('a[href="https://x.tools/groups/55"]').exists()).toBe(true);
    });

    it('links the orphan group when rollback failed', () => {
        const w = makeWrapper({
            phase: 'failed',
            failedOutcome: { ...failedRollback, rollback: 'failed', orphanGroupId: 99 },
        });
        expect(w.find('[role="alert"]').text()).toContain('konnte nicht gelöscht werden');
        expect(w.find('a[href="https://x.tools/groups/99"]').exists()).toBe(true);
    });
});

describe('ProgressList', () => {
    it('renders one line per step with status symbols', () => {
        const progress: ProvisionProgress[] = [
            { step: 'duplicate', status: 'done' },
            { step: 'configure', status: 'done' },
            { step: 'fields', status: 'running' },
            { step: 'parents', status: 'pending' },
            { step: 'members', status: 'pending' },
            { step: 'calendar', status: 'pending' },
        ];
        const w = mount(ProgressList, { props: { progress } });
        const items = w.findAll('li');
        expect(items).toHaveLength(6);
        expect(items[0].text()).toContain('✓');
        expect(items[0].text()).toContain('Vorlage dupliziert');
        expect(items[2].text()).toContain('◌');
        expect(items[3].text()).toContain('·');
        expect(w.find('[aria-live="polite"]').exists()).toBe(true);
    });

    it('marks failed steps', () => {
        const w = mount(ProgressList, {
            props: { progress: [{ step: 'parents', status: 'failed' } as ProvisionProgress] },
        });
        expect(w.text()).toContain('✗');
    });
});
