import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import StepAnmeldung from '@/wizard/components/StepAnmeldung.vue';
import type { FormState, TemplateField } from '@/wizard/types';

const fields: TemplateField[] = [
    {
        id: 3508,
        name: 'Vegetarisch',
        fieldTypeCode: 'radioselect',
        options: ['Ja', 'Nein'],
        requiredInRegistrationForm: true,
    },
    {
        id: 3505,
        name: 'Mitfahrgelegenheit',
        fieldTypeCode: 'radioselect',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        requiredInRegistrationForm: true,
    },
    {
        id: 3502,
        name: 'Bemerkung',
        fieldTypeCode: 'text',
        options: [],
        requiredInRegistrationForm: false,
    },
];

function makeForm(overrides: Partial<FormState> = {}): FormState {
    return reactive({
        teamId: 2156,
        dateFrom: '2027-04-10',
        dateTo: '2027-04-12',
        location: '',
        description: 'x',
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

describe('StepAnmeldung', () => {
    function makeWrapper(form = makeForm()) {
        return mount(StepAnmeldung, {
            props: { form, fields, errors: {} },
        });
    }

    it('shows deadline in self mode and hides it in manual mode with info box', async () => {
        const form = makeForm();
        const w = makeWrapper(form);
        expect(w.find('#hp-deadline').exists()).toBe(true);
        expect(w.find('.hp-info-box').exists()).toBe(false);

        await w.find('input[value="manual"]').setValue();
        expect(form.mode).toBe('manual');
        expect(w.find('#hp-deadline').exists()).toBe(false);
        expect(w.find('.hp-info-box').text()).toContain('keine Selbstanmeldung');
    });

    it('constrains the deadline picker to dates before the hike start', () => {
        const w = makeWrapper();
        expect(w.find('#hp-deadline').attributes('max')).toBe('2027-04-10');
    });

    it('keeps a previously entered deadline when toggling modes', async () => {
        const form = makeForm({ signupDeadline: '2027-04-03' });
        const w = makeWrapper(form);
        await w.find('input[value="manual"]').setValue();
        await w.find('input[value="self"]').setValue();
        expect((w.find('#hp-deadline').element as HTMLInputElement).value).toBe('2027-04-03');
    });

    it('offers public signup only in self mode and binds it', async () => {
        const form = makeForm();
        const w = makeWrapper(form);
        await w.find('[data-testid="public-signup"]').setValue(true);
        expect(form.publicSignup).toBe(true);
        await w.find('input[value="manual"]').setValue();
        expect(w.find('[data-testid="public-signup"]').exists()).toBe(false);
    });

    it('asks about publishing only when public signup is chosen', async () => {
        const form = makeForm();
        const w = makeWrapper(form);
        expect(w.find('[data-testid="publish-now"]').exists()).toBe(false);
        await w.find('[data-testid="public-signup"]').setValue(true);
        expect((w.find('[data-testid="publish-now"]').element as HTMLInputElement).checked).toBe(
            true,
        );
        await w.find('[data-testid="publish-now"]').setValue(false);
        expect(form.publishNow).toBe(false);
    });

    it('lists the template fields read-only with required markers', () => {
        const w = makeWrapper();
        const info = w.find('[data-testid="fields-info"]');
        expect(info.text()).toContain('Vegetarisch');
        expect(info.text()).toContain('Pflichtfeld');
        expect(info.text()).toContain('kommen automatisch aus der Vorlage');
        expect(info.find('input').exists()).toBe(false);
    });

    it('shows a hint when the template has no fields', () => {
        const w = mount(StepAnmeldung, { props: { form: makeForm(), fields: [], errors: {} } });
        expect(w.find('[data-testid="fields-info"]').text()).toContain(
            'Keine Felder in der Vorlage hinterlegt',
        );
    });

    it('emits next and back', async () => {
        const w = makeWrapper();
        await w.find('form').trigger('submit');
        expect(w.emitted('next')).toHaveLength(1);
        await w.find('[data-testid="back"]').trigger('click');
        expect(w.emitted('back')).toHaveLength(1);
    });
});
