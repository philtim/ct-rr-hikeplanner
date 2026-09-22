<script setup lang="ts">
defineProps<{
    state: 'loading' | 'no-access' | 'error';
    message?: string;
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
    <div v-if="state === 'loading'" class="hp-card" role="status" aria-label="Wird geladen">
        <div class="hp-skeleton" style="width: 40%"></div>
        <div class="hp-skeleton" style="width: 100%"></div>
        <div class="hp-skeleton" style="width: 100%"></div>
        <div class="hp-skeleton" style="width: 65%"></div>
    </div>

    <div v-else-if="state === 'no-access'" class="hp-card" role="status">
        <h2>ⓘ Dieser Assistent ist für Team-Leiter</h2>
        <p>Hajks anlegen können Leiter und Co-Leiter eines Stufenteams sowie die Stammleitung.</p>
        <p>Du planst einen Hajk? Wende dich an die Leiter deines Teams oder an die Stammleitung.</p>
    </div>

    <div v-else class="hp-card" role="alert">
        <h2>✗ Der Assistent kann gerade nicht starten</h2>
        <p>{{ message }}</p>
        <div class="hp-actions hp-actions--single">
            <button type="button" class="hp-btn" @click="emit('retry')">Erneut versuchen</button>
        </div>
    </div>
</template>
