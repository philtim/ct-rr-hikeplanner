import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import StepTeamTermin from '@/wizard/components/StepTeamTermin.vue';
import type { FormState, TeamOption } from '@/wizard/types';

const teams: TeamOption[] = [
    {
        groupId: 2156,
        name: 'RR Kundschafterteam Eisbären',
        shortName: 'Eisbären',
        stufe: 'Kundschafter',
        sammelgruppeId: 2612,
        sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
    },
    {
        groupId: 1930,
        name: 'RR Kundschafterteam Löwen',
        shortName: 'Löwen',
        stufe: 'Kundschafter',
        sammelgruppeId: 2612,
        sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
    },
    {
        groupId: 1015,
        name: 'RR Pfadfinderteam Schneeleoparden',
        shortName: 'Schneeleoparden',
        stufe: 'Pfadfinder',
        sammelgruppeId: 2615,
        sammelgruppeName: 'RR | Camps und Aktionen - Pfadfinder',
    },
];

function makeForm(overrides: Partial<FormState> = {}): FormState {
    return reactive({
        teamId: null,
        dateFrom: '',
        dateTo: '',
        location: '',
        description: '',
        dailySchedule: 'Frühstück, Wanderung, Lagerfeuer',
        mode: 'self',
        signupDeadline: '',
        maxMembers: '',
        titleSuffix: '',
        publicSignup: false,
        publishNow: true,
        ...overrides,
    }) as FormState;
}

function makeWrapper(props: Partial<InstanceType<typeof StepTeamTermin>['$props']> = {}) {
    return mount(StepTeamTermin, {
        props: {
            form: makeForm(),
            teams,
            singleTeam: false,
            errors: {},
            nightsWarning: null,
            groupName: '',
            ...props,
        },
    });
}

describe('StepTeamTermin', () => {
    it('groups the team select by Stufe', () => {
        const w = makeWrapper();
        const optgroups = w.findAll('optgroup');
        expect(optgroups.map((o) => o.attributes('label'))).toEqual(['Kundschafter', 'Pfadfinder']);
        expect(optgroups[0].findAll('option')).toHaveLength(2);
    });

    it('renders a plain text team for single-team leaders (no select)', () => {
        const w = makeWrapper({
            singleTeam: true,
            teams: [teams[0]],
            form: makeForm({ teamId: 2156 }),
        });
        expect(w.find('select').exists()).toBe(false);
        expect(w.text()).toContain('Eisbären');
    });

    it('shows placeholder preview until name is available, then the name', async () => {
        const w = makeWrapper();
        expect(w.text()).toContain('Team und Datum wählen');
        await w.setProps({ groupName: 'RR Hajk Eisbären 10.04.–12.04.2027' });
        expect(w.text()).toContain('RR Hajk Eisbären 10.04.–12.04.2027');
    });

    it('shows errors for the funding fields', () => {
        const w = makeWrapper({
            errors: {
                location: 'Bitte gib den Ort bzw. Treffpunkt an.',
                description: 'Bitte beschreibe, was beim Hajk gemacht wird.',
                dailySchedule: 'Bitte beschreibe grob den Tagesablauf.',
            },
        });
        expect(w.find('#hp-location-error').text()).toContain('Ort bzw. Treffpunkt');
        expect(w.find('#hp-description-error').text()).toContain('was beim Hajk gemacht wird');
        expect(w.find('#hp-daily-schedule-error').text()).toContain('Tagesablauf');
    });

    it('shows the computed duration once both dates are set', async () => {
        const w = makeWrapper({ form: makeForm({ dateFrom: '', dateTo: '' }) });
        expect(w.find('[data-testid="duration"]').exists()).toBe(false);
        const withDates = makeWrapper({
            form: makeForm({ dateFrom: '2027-04-10', dateTo: '2027-04-12' }),
        });
        expect(withDates.find('[data-testid="duration"]').text()).toContain('3 Tage / 2 Nächte');
    });

    it('shows the non-blocking nights warning', () => {
        const w = makeWrapper({
            nightsWarning:
                'Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.',
        });
        expect(w.find('.hp-warning-box').text()).toContain('zwei Übernachtungen');
    });

    it('emits next on submit', async () => {
        const w = makeWrapper();
        await w.find('form').trigger('submit');
        expect(w.emitted('next')).toHaveLength(1);
    });

    it('constrains the end date picker to dates from the start date on', async () => {
        const w = makeWrapper({ form: makeForm({ dateFrom: '2027-04-10' }) });
        expect(w.find('#hp-date-to').attributes('min')).toBe('2027-04-10');
    });

    it('sanitizes the title suffix on blur', async () => {
        const form = makeForm();
        const w = makeWrapper({ form });
        const input = w.find('#hp-title-suffix');
        await input.setValue('Wildnis! & Tour');
        await input.trigger('blur');
        expect(form.titleSuffix).toBe('Wildnis Tour');
    });

    it('binds inputs to the form state', async () => {
        const form = makeForm();
        const w = makeWrapper({ form });
        await w.find('#hp-date-from').setValue('2027-04-10');
        await w.find('#hp-description').setValue('Toller Hajk');
        expect(form.dateFrom).toBe('2027-04-10');
        expect(form.description).toBe('Toller Hajk');
    });
});
