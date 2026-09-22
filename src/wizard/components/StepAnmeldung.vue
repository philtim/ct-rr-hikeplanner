<script setup lang="ts">
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
            hinzu. Die Anmeldefelder stehen dir dort zur Datenpflege zur Verfügung.
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
                :max="form.dateFrom || undefined"
                :aria-describedby="errors.signupDeadline ? 'hp-deadline-error' : undefined"
            />
            <p v-if="errors.signupDeadline" id="hp-deadline-error" class="hp-error-text">
                {{ errors.signupDeadline }}
            </p>
        </div>

        <div v-if="form.mode === 'self'" class="hp-standalone-box">
            <label class="hp-check-row hp-check-row--standalone">
                <input v-model="form.publicSignup" type="checkbox" data-testid="public-signup" />
                <span class="hp-check-label">Anmeldung ohne ChurchTools-Konto ermöglichen</span>
                <span class="hp-check-sub"
                    >Öffnet die Anmeldung für alle, die den Link haben — z. B. Eltern, die ihr Kind
                    anmelden. Ohne Häkchen können sich nur Personen mit ChurchTools-Konto
                    anmelden.</span
                >
            </label>
            <label v-if="form.publicSignup" class="hp-check-row hp-check-row--standalone">
                <input v-model="form.publishNow" type="checkbox" data-testid="publish-now" />
                <span class="hp-check-label">Veranstaltung sofort veröffentlichen</span>
                <span class="hp-check-sub"
                    >Der Anmelde-Link funktioniert erst, wenn die Gruppe veröffentlicht ist. Ohne
                    Häkchen bleibt sie ein Entwurf, den du später selbst veröffentlichst.</span
                >
            </label>
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

        <!-- Felder sind bewusst nicht wählbar: CT erlaubt Leitern kein
             Feld-Schreiben in der neuen Gruppe (docs/PERMISSIONS.md). -->
        <div class="hp-field" data-testid="fields-info">
            <span class="hp-fields-label">Anmeldefelder</span>
            <ul v-if="fields.length" class="hp-fields-list">
                <li v-for="f in fields" :key="f.id">
                    {{ f.name
                    }}<span v-if="f.requiredInRegistrationForm" class="hp-hint">
                        · Pflichtfeld</span
                    >
                </li>
            </ul>
            <p v-else class="hp-hint">Keine Felder in der Vorlage hinterlegt.</p>
            <p class="hp-hint">
                Die Felder kommen automatisch aus der Vorlage — Änderungen daran macht die
                Stammleitung.
            </p>
        </div>

        <div class="hp-actions">
            <button type="button" class="hp-btn" data-testid="back" @click="emit('back')">
                ← Zurück
            </button>
            <button type="submit" class="hp-btn hp-btn--primary">Weiter →</button>
        </div>
    </form>
</template>
