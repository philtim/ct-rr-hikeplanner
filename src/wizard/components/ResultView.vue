<script setup lang="ts">
import { onMounted, ref } from 'vue';

defineProps<{
    groupName: string;
    groupHref: string;
    summary: string[];
    calendarWarning: boolean;
}>();
const emit = defineEmits<{ restart: [] }>();

// Fokus auf den Erfolgstitel, damit Screenreader den Ausgang mitbekommen.
const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus());
</script>

<template>
    <section>
        <h2 ref="heading" tabindex="-1">✓ Dein Hajk ist angelegt!</h2>
        <p>
            <strong>{{ groupName }}</strong>
        </p>

        <ul class="hp-result-list">
            <li v-for="line in summary" :key="line" class="hp-status--done">✓ {{ line }}</li>
        </ul>

        <p v-if="calendarWarning" class="hp-warning-box">
            ⚠ Wichtig: Kalendertermin konnte nicht angelegt werden — bitte trage ihn manuell im
            Kalender „Royal Rangers“ ein.
        </p>

        <div class="hp-actions hp-actions--single">
            <a class="hp-btn hp-btn--primary" :href="groupHref">Zur Gruppe in ChurchTools →</a>
        </div>
        <p>
            <button type="button" class="hp-btn" data-testid="restart" @click="emit('restart')">
                Weiteren Hajk anlegen
            </button>
        </p>
    </section>
</template>
