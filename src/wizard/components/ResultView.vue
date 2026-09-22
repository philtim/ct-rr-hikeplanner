<script setup lang="ts">
import { onMounted, ref } from 'vue';

defineProps<{
    groupName: string;
    groupHref: string;
    summary: string[];
    calendarWarning: boolean;
    fieldsWarning: boolean;
    /** Öffentlicher Anmelde-Link; null, wenn die Anmeldung nicht öffentlich ist. */
    signupUrl: string | null;
}>();
const emit = defineEmits<{ restart: [] }>();

// Fokus auf den Erfolgstitel, damit Screenreader den Ausgang mitbekommen.
const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus());

const copied = ref(false);
async function copySignupUrl(url: string) {
    try {
        await navigator.clipboard.writeText(url);
        copied.value = true;
        setTimeout(() => (copied.value = false), 2000);
    } catch {
        // Clipboard nicht verfügbar (z. B. unsicherer Kontext) — Nutzer
        // kann den Link aus dem Eingabefeld manuell kopieren.
    }
}
</script>

<template>
    <section class="hp-card hp-result">
        <h2 ref="heading" tabindex="-1">
            <span class="hp-status--done" aria-hidden="true">✓</span> Dein Hajk ist angelegt!
        </h2>
        <p class="hp-result-name">{{ groupName }}</p>

        <ul class="hp-result-list">
            <li v-for="line in summary" :key="line">
                <span class="hp-status--done" aria-hidden="true">✓</span>
                <span>{{ line }}</span>
            </li>
        </ul>

        <p v-if="fieldsWarning" class="hp-warning-box">
            ⚠ Wichtig: Nicht gewählte Anmeldefelder konnten nicht entfernt werden — bitte prüfe die
            Felder in der Gruppe oder melde es der Stammleitung.
        </p>

        <p v-if="calendarWarning" class="hp-warning-box">
            ⚠ Wichtig: Kalendertermin konnte nicht angelegt werden — bitte trage ihn manuell im
            Kalender „Royal Rangers“ ein.
        </p>

        <div v-if="signupUrl" class="hp-info-box" data-testid="signup-link">
            <span class="hp-hint">Öffentlicher Anmelde-Link (ohne ChurchTools-Login):</span>
            <div class="hp-copy-row">
                <input
                    type="text"
                    readonly
                    :value="signupUrl"
                    @focus="($event.target as HTMLInputElement).select()"
                />
                <button
                    type="button"
                    class="hp-btn"
                    data-testid="copy-signup"
                    @click="copySignupUrl(signupUrl)"
                >
                    {{ copied ? 'Kopiert ✓' : 'Link kopieren' }}
                </button>
            </div>
        </div>

        <div class="hp-result-actions">
            <a class="hp-btn hp-btn--primary" :href="groupHref">Zur Gruppe in ChurchTools →</a>
            <button
                type="button"
                class="hp-link-btn"
                data-testid="restart"
                @click="emit('restart')"
            >
                Weiteren Hajk anlegen
            </button>
        </div>
    </section>
</template>
