<script setup lang="ts">
import AdminView from '@/wizard/components/AdminView.vue';
import WizardShell from '@/wizard/components/WizardShell.vue';

// Mini-Routing wie im Organigram: ?admin=1 zeigt die Konfigurationsseite.
const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
</script>

<template>
    <AdminView v-if="isAdmin" />
    <WizardShell v-else />
</template>
