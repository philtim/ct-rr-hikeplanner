<script setup lang="ts">
import FieldChecklist from './FieldChecklist.vue';
import type { Step2Errors } from '@/wizard/validation';
import type { FormState, TemplateField } from '@/wizard/types';

defineProps<{
    form: FormState;
    fields: TemplateField[];
    errors: Step2Errors;
}>();
const emit = defineEmits<{ next: []; back: [] }>();
</script>

<template>
    <form novalidate @submit.prevent="emit('next')">
        <h2>Anmeldung</h2>

        <fieldset class="hp-checklist">
            <legend>Wie kommen die Teilnehmer in die Gruppe?</legend>
            <label class="hp-check-row">
                <input v-model="form.mode" type="radio" name="hp-mode" value="self" />
                <span>Teilnehmer melden sich selbst an</span>
            </label>
            <label class="hp-check-row">
                <input v-model="form.mode" type="radio" name="hp-mode" value="manual" />
                <span>Ich trage die Teilnehmer selbst ein</span>
            </label>
        </fieldset>

        <p v-if="form.mode === 'manual'" class="hp-info-box">
            ⓘ Es gibt keine Selbstanmeldung. Du fügst die Teilnehmer nach dem Anlegen in der Gruppe
            hinzu. Die gewählten Felder stehen dir dort zur Datenpflege zur Verfügung.
        </p>

        <div
            v-if="form.mode === 'self'"
            class="hp-field"
            :class="{ 'hp-field--invalid': errors.signupDeadline }"
        >
            <label for="hp-deadline">Anmeldeschluss</label>
            <input
                id="hp-deadline"
                v-model="form.signupDeadline"
                type="date"
                :aria-describedby="errors.signupDeadline ? 'hp-deadline-error' : undefined"
            />
            <p v-if="errors.signupDeadline" id="hp-deadline-error" class="hp-error-text">
                {{ errors.signupDeadline }}
            </p>
        </div>

        <div class="hp-field" :class="{ 'hp-field--invalid': errors.maxMembers }">
            <label for="hp-max-members">Max. Teilnehmer (optional)</label>
            <input
                id="hp-max-members"
                v-model="form.maxMembers"
                type="number"
                min="1"
                inputmode="numeric"
                :aria-describedby="errors.maxMembers ? 'hp-max-members-error' : undefined"
            />
            <p v-if="errors.maxMembers" id="hp-max-members-error" class="hp-error-text">
                {{ errors.maxMembers }}
            </p>
        </div>

        <FieldChecklist :form="form" :fields="fields" />

        <div class="hp-actions">
            <button type="button" class="hp-btn" data-testid="back" @click="emit('back')">
                ← Zurück
            </button>
            <button type="submit" class="hp-btn hp-btn--primary">Weiter →</button>
        </div>
    </form>
</template>
