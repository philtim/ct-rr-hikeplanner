<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { getOriginUrl } from '@/shared/api';
import { useWizard } from '@/wizard/useWizard';
import GateView from './GateView.vue';
import StepperNav from './StepperNav.vue';
import StepTeamTermin from './StepTeamTermin.vue';
import StepAnmeldung from './StepAnmeldung.vue';
import StepReview from './StepReview.vue';
import ResultView from './ResultView.vue';
import '../wizard.css';

const w = useWizard();
onMounted(() => void w.start());

// Build-Provenienz aus vite.config (define) — im Footer sichtbar wie im Organigram.
const appVersion = __APP_VERSION__;
const appCommit = __APP_COMMIT__;

const groupUrl = (id: number) => `${getOriginUrl()}/groups/${id}`;

const currentStep = computed(() => (w.state.value.phase === 'form' ? w.state.value.step : 3));
const showStepper = computed(() =>
    ['form', 'provisioning', 'failed'].includes(w.state.value.phase),
);
const reviewPhase = computed(() =>
    w.state.value.phase === 'provisioning'
        ? 'provisioning'
        : w.state.value.phase === 'failed'
          ? 'failed'
          : 'form',
);
const failedOutcome = computed(() =>
    w.state.value.phase === 'failed' ? w.state.value.outcome : null,
);

const resultSummary = computed(() => {
    const team = w.selectedTeam.value;
    const ctx = w.context.value;
    if (!team || !ctx) return [];
    const fieldNames = ctx.template.fields
        .filter((f) => w.form.selectedFieldIds.includes(f.id))
        .map((f) => f.name);
    const modus =
        w.form.mode === 'manual'
            ? 'Du trägst die Teilnehmer selbst ein'
            : `Selbstanmeldung${w.form.signupDeadline ? ` bis ${w.form.signupDeadline.split('-').reverse().join('.')}` : ''}${w.form.maxMembers ? `, max. ${w.form.maxMembers}` : ''}`;
    return [
        `Abgelegt in „${team.sammelgruppeName}“`,
        `Anmeldefelder: ${fieldNames.length ? fieldNames.join(', ') : 'keine'}`,
        modus,
        `Organisatoren: ${ctx.template.organisators.length ? ctx.template.organisators.map((o) => o.name).join(', ') : 'aus der Vorlage übernommen'}`,
        'Du bist als Leiter eingetragen',
    ];
});
</script>

<template>
    <div class="rr-hikeplanner-root" lang="de">
        <h1>Neuen Hajk anlegen</h1>

        <GateView v-if="w.state.value.phase === 'loading'" state="loading" />
        <GateView v-else-if="w.state.value.phase === 'no-access'" state="no-access" />
        <GateView
            v-else-if="w.state.value.phase === 'gate-error'"
            state="error"
            :message="w.state.value.message"
            @retry="w.start()"
        />

        <template v-else-if="w.context.value">
            <StepperNav
                v-if="showStepper"
                :current="currentStep"
                :max-visited="w.maxVisited.value"
                :locked="w.state.value.phase === 'provisioning'"
                @goto="w.goToStep($event)"
            />

            <StepTeamTermin
                v-if="w.state.value.phase === 'form' && w.state.value.step === 1"
                :form="w.form"
                :teams="w.context.value.leader.teams"
                :single-team="w.context.value.leader.teams.length === 1"
                :errors="w.step1Errors.value"
                :nights-warning="w.nightsWarning.value"
                :group-name="w.groupName.value"
                @next="w.goNext()"
            />

            <StepAnmeldung
                v-else-if="w.state.value.phase === 'form' && w.state.value.step === 2"
                :form="w.form"
                :fields="w.context.value.template.fields"
                :errors="w.step2Errors.value"
                @next="w.goNext()"
                @back="w.goBack()"
            />

            <StepReview
                v-else-if="
                    (w.state.value.phase === 'form' && w.state.value.step === 3) ||
                    w.state.value.phase === 'provisioning' ||
                    w.state.value.phase === 'failed'
                "
                :form="w.form"
                :context="w.context.value"
                :team="w.selectedTeam.value!"
                :group-name="w.groupName.value"
                :sammelgruppe-name="w.selectedTeam.value?.sammelgruppeName ?? ''"
                :phase="reviewPhase"
                :progress="w.progress.value"
                :failed-outcome="failedOutcome"
                :group-url="groupUrl"
                @back="w.goBack()"
                @edit="w.goToStep($event)"
                @submit="w.submit()"
                @retry="w.retry()"
            />

            <ResultView
                v-else-if="w.state.value.phase === 'done'"
                :group-name="w.state.value.groupName"
                :group-href="groupUrl(w.state.value.outcome.groupId)"
                :summary="resultSummary"
                :calendar-warning="w.state.value.outcome.calendarWarning"
                :fields-warning="w.state.value.outcome.fieldsWarning"
                :signup-url="
                    w.form.mode === 'self' && w.form.publicSignup
                        ? `${groupUrl(w.state.value.outcome.groupId)}/signup`
                        : null
                "
                @restart="w.reset()"
            />
        </template>

        <footer class="hp-footer" :title="`RR HikePlanner v${appVersion} (build ${appCommit})`">
            v{{ appVersion }} · {{ appCommit }} · <a href="?admin=1">Konfiguration</a>
        </footer>
    </div>
</template>
