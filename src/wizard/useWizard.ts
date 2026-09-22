/**
 * Zustandsmaschine des Wizards: Gate → 3 Formular-Schritte → Provisionierung
 * → Ergebnis. Besitzt den kompletten Formular- und Fortschrittszustand;
 * die Komponenten sind dünne Ansichten darüber. `load` und `execute` sind
 * für Tests injizierbar (Default: echte Implementierung).
 */
import { computed, reactive, ref } from 'vue';
import { ChurchToolsApiError, getOriginUrl } from '@/shared/api';
import { buildGroupName } from './naming';
import { executeProvisioning } from './provisioning';
import { fewNightsWarning, validateStep1, validateStep2 } from './validation';
import type { Step1Errors, Step2Errors } from './validation';
import { loadWizardContext, provisionApi } from './wizard.api';
import type {
    FormState,
    ProvisionOutcome,
    ProvisionProgress,
    ProvisionStepId,
    TeamOption,
    WizardContext,
} from './types';

export type WizardPhase =
    | { phase: 'loading' }
    | { phase: 'no-access' }
    | { phase: 'gate-error'; message: string }
    | { phase: 'form'; step: 1 | 2 | 3 }
    | { phase: 'provisioning' }
    | { phase: 'failed'; outcome: Extract<ProvisionOutcome, { ok: false }> }
    | { phase: 'done'; outcome: Extract<ProvisionOutcome, { ok: true }>; groupName: string };

// Reihenfolge = Provisionierungs-Reihenfolge: Der Leiter wird direkt nach dem
// Duplizieren eingetragen, damit die Folgeschritte mit Gruppenleiter-Rechten
// laufen können.
const ALL_STEPS: ProvisionStepId[] = ['duplicate', 'members', 'configure', 'parents', 'calendar'];

function emptyForm(): FormState {
    return {
        teamId: null,
        dateFrom: '',
        dateTo: '',
        location: '',
        description: '',
        mode: 'self',
        signupDeadline: '',
        maxMembers: '',
        titleSuffix: '',
        publicSignup: false,
        publishNow: true,
    };
}

export interface UseWizardDeps {
    load?: typeof loadWizardContext;
    execute?: typeof executeProvisioning;
}

export function useWizard(deps: UseWizardDeps = {}) {
    const load = deps.load ?? loadWizardContext;
    const execute = deps.execute ?? executeProvisioning;

    const state = ref<WizardPhase>({ phase: 'loading' });
    const context = ref<WizardContext | null>(null);
    const form = reactive<FormState>(emptyForm());
    const maxVisited = ref<1 | 2 | 3>(1);
    const step1Errors = ref<Step1Errors>({});
    const step2Errors = ref<Step2Errors>({});
    const progress = ref<ProvisionProgress[]>([]);

    const selectedTeam = computed<TeamOption | null>(
        () => context.value?.leader.teams.find((t) => t.groupId === form.teamId) ?? null,
    );
    const groupName = computed(() =>
        selectedTeam.value && form.dateFrom && form.dateTo
            ? buildGroupName(selectedTeam.value.name, form.dateFrom, form.dateTo, form.titleSuffix)
            : '',
    );
    const nightsWarning = computed(() => fewNightsWarning(form));

    async function start(): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            const ctx = await load();
            context.value = ctx;
            if (ctx.leader.kind === 'none') {
                state.value = { phase: 'no-access' };
                return;
            }
            if (ctx.leader.teams.length === 1) {
                form.teamId = ctx.leader.teams[0].groupId;
            }
            state.value = { phase: 'form', step: 1 };
        } catch (e) {
            const raw = e instanceof Error ? e.message : String(e);
            let message: string;
            if (raw.startsWith('template-invalid: ')) {
                message = `Die Vorlagengruppe ist nicht nutzbar: ${raw.replace('template-invalid: ', '')}. Bitte melde das der Stammleitung.`;
            } else if (e instanceof ChurchToolsApiError && e.status > 0) {
                // Konkreten Endpoint + Status nennen — meist fehlt ein Recht
                // (siehe docs/PERMISSIONS.md), und ohne diese Info ist der
                // Fehler aus der Ferne nicht diagnostizierbar.
                message = `ChurchTools hat eine Anfrage abgelehnt (HTTP ${e.status} bei ${e.endpoint}). Vermutlich fehlt eine Berechtigung — bitte melde das der Stammleitung.`;
            } else {
                message = 'ChurchTools ist gerade nicht erreichbar. Bitte versuche es erneut.';
            }
            console.error('[rr-hikeplanner] Gate-Fehler:', e);
            state.value = { phase: 'gate-error', message };
        }
    }

    function validateCurrentStep(step: 1 | 2 | 3): boolean {
        if (step === 1) {
            const errors = validateStep1(form);
            if (
                !errors.teamId &&
                selectedTeam.value &&
                selectedTeam.value.sammelgruppeId === null
            ) {
                errors.teamId =
                    'Für dieses Team fehlt die Sammelgruppe „Camps und Aktionen“. Bitte melde das der Stammleitung.';
            }
            step1Errors.value = errors;
            return Object.keys(errors).length === 0;
        }
        if (step === 2) {
            const errors = validateStep2(form);
            step2Errors.value = errors;
            return Object.keys(errors).length === 0;
        }
        return true;
    }

    function goNext(): void {
        if (state.value.phase !== 'form' || state.value.step === 3) return;
        const step = state.value.step;
        if (!validateCurrentStep(step)) return;
        const next = (step + 1) as 2 | 3;
        state.value = { phase: 'form', step: next };
        if (next > maxVisited.value) maxVisited.value = next;
    }

    function goBack(): void {
        if (state.value.phase !== 'form' || state.value.step === 1) return;
        state.value = { phase: 'form', step: (state.value.step - 1) as 1 | 2 };
    }

    function goToStep(n: 1 | 2 | 3): void {
        if (state.value.phase !== 'form' && state.value.phase !== 'failed') return;
        if (n > maxVisited.value) return;
        state.value = { phase: 'form', step: n };
    }

    async function submit(): Promise<void> {
        if (!context.value || !selectedTeam.value) return;
        progress.value = ALL_STEPS.map((step) => ({ step, status: 'pending' as const }));
        state.value = { phase: 'provisioning' };
        const outcome = await execute(
            {
                form,
                team: selectedTeam.value,
                context: context.value,
                calendarId: context.value.calendarId,
                groupUrl: (id) => `${getOriginUrl()}/groups/${id}`,
            },
            provisionApi,
            (p) => {
                progress.value = progress.value.map((entry) => (entry.step === p.step ? p : entry));
            },
        );
        if (outcome.ok) {
            state.value = { phase: 'done', outcome, groupName: groupName.value };
        } else {
            state.value = { phase: 'failed', outcome };
        }
    }

    async function retry(): Promise<void> {
        if (state.value.phase !== 'failed') return;
        await submit();
    }

    function reset(): void {
        const teams = context.value?.leader.teams ?? [];
        Object.assign(form, emptyForm());
        if (teams.length === 1) form.teamId = teams[0].groupId;
        step1Errors.value = {};
        step2Errors.value = {};
        progress.value = [];
        maxVisited.value = 1;
        state.value = { phase: 'form', step: 1 };
    }

    return {
        state,
        context,
        form,
        maxVisited,
        progress,
        selectedTeam,
        groupName,
        nightsWarning,
        step1Errors,
        step2Errors,
        start,
        goNext,
        goBack,
        goToStep,
        submit,
        retry,
        reset,
    };
}
