<script setup lang="ts">
import { computed } from 'vue';
import ProgressList from './ProgressList.vue';
import { countNights, formatDateRange } from '@/wizard/naming';
import type {
    FormState,
    ProvisionOutcome,
    ProvisionProgress,
    TeamOption,
    WizardContext,
} from '@/wizard/types';

const props = defineProps<{
    form: FormState;
    context: WizardContext;
    team: TeamOption;
    groupName: string;
    sammelgruppeName: string;
    phase: 'form' | 'provisioning' | 'failed';
    progress: ProvisionProgress[];
    failedOutcome: Extract<ProvisionOutcome, { ok: false }> | null;
    groupUrl: (groupId: number) => string;
}>();
const emit = defineEmits<{ back: []; edit: [step: 1 | 2]; submit: []; retry: [] }>();

function formatDateDe(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

const zeitraum = computed(
    () =>
        `${formatDateRange(props.form.dateFrom, props.form.dateTo)} (${countNights(props.form.dateFrom, props.form.dateTo)} Nächte)`,
);
const modusLine = computed(() => {
    if (props.form.mode === 'manual') return 'Du trägst die Teilnehmer selbst ein';
    return props.form.signupDeadline
        ? `Selbstanmeldung bis ${formatDateDe(props.form.signupDeadline)}`
        : 'Selbstanmeldung (ohne Anmeldeschluss)';
});
const felderLine = computed(() => {
    const names = props.context.template.fields
        .filter((f) => props.form.selectedFieldIds.includes(f.id))
        .map((f) => f.name);
    return names.length > 0 ? names.join(' · ') : 'keine';
});
const organisatorenLine = computed(() =>
    props.context.template.organisators.map((o) => o.name).join(', '),
);
</script>

<template>
    <section>
        <h2>Prüfen &amp; Anlegen</h2>
        <p>
            <strong>{{ groupName }}</strong>
        </p>

        <template v-if="phase === 'form'">
            <div class="hp-summary">
                <div class="hp-summary-head">
                    <h3>Team &amp; Termin</h3>
                    <button
                        type="button"
                        class="hp-btn"
                        data-testid="edit-1"
                        @click="emit('edit', 1)"
                    >
                        Ändern
                    </button>
                </div>
                <dl>
                    <dt>Team</dt>
                    <dd>{{ team.name }}</dd>
                    <dt>Zeitraum</dt>
                    <dd>{{ zeitraum }}</dd>
                    <dt>Treffpunkt</dt>
                    <dd>{{ form.location || '—' }}</dd>
                    <dt>Beschreibung</dt>
                    <dd>{{ form.description }}</dd>
                </dl>

                <div class="hp-summary-head">
                    <h3>Anmeldung</h3>
                    <button
                        type="button"
                        class="hp-btn"
                        data-testid="edit-2"
                        @click="emit('edit', 2)"
                    >
                        Ändern
                    </button>
                </div>
                <dl>
                    <dt>Modus</dt>
                    <dd>{{ modusLine }}</dd>
                    <dt>Teilnehmer</dt>
                    <dd>{{ form.maxMembers ? `max. ${form.maxMembers}` : 'unbegrenzt' }}</dd>
                    <dt>Felder</dt>
                    <dd>{{ felderLine }}</dd>
                </dl>

                <h3>Automatisch eingerichtet</h3>
                <dl>
                    <dt>Ablage</dt>
                    <dd>{{ sammelgruppeName }}</dd>
                    <dt>Organisatoren</dt>
                    <dd>{{ organisatorenLine }}</dd>
                    <dt>Leiter</dt>
                    <dd>Du ({{ context.user.firstName }} {{ context.user.lastName }})</dd>
                    <dt>Kalender</dt>
                    <dd>„Royal Rangers“ (öffentlich)</dd>
                </dl>
            </div>

            <div class="hp-actions">
                <button type="button" class="hp-btn" data-testid="back" @click="emit('back')">
                    ← Zurück
                </button>
                <button
                    type="button"
                    class="hp-btn hp-btn--primary"
                    data-testid="submit"
                    @click="emit('submit')"
                >
                    Hajk anlegen ✓
                </button>
            </div>
        </template>

        <template v-else-if="phase === 'provisioning'">
            <p>Dein Hajk wird angelegt …</p>
            <ProgressList :progress="progress" />
            <p class="hp-hint">(Bitte das Fenster geöffnet lassen)</p>
        </template>

        <template v-else>
            <div class="hp-card" role="alert">
                <h3>✗ Das hat leider nicht geklappt</h3>
                <template v-if="failedOutcome?.failedStep === 'precheck'">
                    <p>
                        Es gibt bereits eine Gruppe mit diesem Namen:
                        <a
                            v-if="failedOutcome?.existingGroupId"
                            :href="groupUrl(failedOutcome.existingGroupId)"
                            >{{ groupName }}</a
                        >. Ändere Team oder Datum, um einen neuen Hajk anzulegen.
                    </p>
                </template>
                <template v-else>
                    <p>{{ failedOutcome?.message }}</p>
                    <p v-if="failedOutcome?.rollback === 'done'">
                        Die angelegte Gruppe wurde wieder entfernt — es ist kein halbfertiger Hajk
                        zurückgeblieben.
                    </p>
                    <p v-else-if="failedOutcome?.rollback === 'failed'">
                        Die unfertige Gruppe konnte nicht gelöscht werden. Bitte melde das der
                        Stammleitung:
                        <a
                            v-if="failedOutcome?.orphanGroupId"
                            :href="groupUrl(failedOutcome.orphanGroupId)"
                            >zur unfertigen Gruppe</a
                        >.
                    </p>
                    <p>Deine Eingaben sind noch da.</p>
                </template>
                <div class="hp-actions">
                    <button
                        type="button"
                        class="hp-btn"
                        data-testid="back-to-form"
                        @click="emit('edit', 1)"
                    >
                        Zurück zu den Eingaben
                    </button>
                    <button
                        v-if="failedOutcome?.failedStep !== 'precheck'"
                        type="button"
                        class="hp-btn hp-btn--primary"
                        data-testid="retry"
                        @click="emit('retry')"
                    >
                        Erneut versuchen
                    </button>
                </div>
            </div>
        </template>
    </section>
</template>
