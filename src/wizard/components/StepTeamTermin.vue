<script setup lang="ts">
import { computed } from 'vue';
import type { Step1Errors } from '@/wizard/validation';
import type { FormState, Stufe, TeamOption } from '@/wizard/types';

const props = defineProps<{
    form: FormState;
    teams: TeamOption[];
    singleTeam: boolean;
    errors: Step1Errors;
    nightsWarning: string | null;
    groupName: string;
}>();
const emit = defineEmits<{ next: [] }>();

const teamsByStufe = computed(() => {
    const groups = new Map<Stufe, TeamOption[]>();
    for (const team of props.teams) {
        const list = groups.get(team.stufe) ?? [];
        list.push(team);
        groups.set(team.stufe, list);
    }
    return [...groups.entries()];
});

const singleTeamName = computed(
    () => props.teams.find((t) => t.groupId === props.form.teamId)?.name ?? '',
);
</script>

<template>
    <form novalidate @submit.prevent="emit('next')">
        <h2>Team &amp; Termin</h2>

        <div class="hp-field" :class="{ 'hp-field--invalid': errors.teamId }">
            <label v-if="!singleTeam" for="hp-team">Team</label>
            <template v-if="singleTeam">
                <span class="hp-field-label">Team</span>
                <p data-testid="single-team">{{ singleTeamName }}</p>
            </template>
            <select
                v-else
                id="hp-team"
                v-model="form.teamId"
                :aria-describedby="errors.teamId ? 'hp-team-error' : undefined"
            >
                <option :value="null" disabled>Bitte wählen …</option>
                <optgroup v-for="[stufe, list] in teamsByStufe" :key="stufe" :label="stufe">
                    <option v-for="t in list" :key="t.groupId" :value="t.groupId">
                        {{ t.shortName }}
                    </option>
                </optgroup>
            </select>
            <p v-if="errors.teamId" id="hp-team-error" class="hp-error-text">{{ errors.teamId }}</p>
        </div>

        <div class="hp-field" :class="{ 'hp-field--invalid': errors.dateFrom }">
            <label for="hp-date-from">Von</label>
            <input
                id="hp-date-from"
                v-model="form.dateFrom"
                type="date"
                :aria-describedby="errors.dateFrom ? 'hp-date-from-error' : undefined"
            />
            <p v-if="errors.dateFrom" id="hp-date-from-error" class="hp-error-text">
                {{ errors.dateFrom }}
            </p>
        </div>

        <div class="hp-field" :class="{ 'hp-field--invalid': errors.dateTo }">
            <label for="hp-date-to">Bis</label>
            <input
                id="hp-date-to"
                v-model="form.dateTo"
                type="date"
                :aria-describedby="errors.dateTo ? 'hp-date-to-error' : undefined"
            />
            <p v-if="errors.dateTo" id="hp-date-to-error" class="hp-error-text">
                {{ errors.dateTo }}
            </p>
        </div>

        <p v-if="nightsWarning" class="hp-warning-box">⚠ {{ nightsWarning }}</p>

        <div class="hp-field">
            <label for="hp-location">Treffpunkt / Ort (optional)</label>
            <input id="hp-location" v-model="form.location" type="text" />
        </div>

        <div class="hp-field" :class="{ 'hp-field--invalid': errors.description }">
            <label for="hp-description">Kurzbeschreibung *</label>
            <textarea
                id="hp-description"
                v-model="form.description"
                placeholder="Was ist geplant? Bitte auch die Anzahl der Nächte nennen (wichtig für Förderung)."
                :aria-describedby="errors.description ? 'hp-description-error' : undefined"
            ></textarea>
            <p v-if="errors.description" id="hp-description-error" class="hp-error-text">
                {{ errors.description }}
            </p>
        </div>

        <p class="hp-hint">* Pflichtfeld</p>

        <div class="hp-info-box" aria-live="polite">
            <span class="hp-hint">Name der Gruppe (wird automatisch vergeben)</span><br />
            ⓘ
            <template v-if="groupName">{{ groupName }}</template>
            <template v-else>RR Hajk … (Team und Datum wählen)</template>
        </div>

        <div class="hp-actions hp-actions--single">
            <button type="submit" class="hp-btn hp-btn--primary">Weiter →</button>
        </div>
    </form>
</template>
