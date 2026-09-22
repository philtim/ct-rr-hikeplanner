<script setup lang="ts">
/**
 * Ansichtswechsel Wizard ↔ Konfiguration OHNE echte Navigation: ChurchTools'
 * SPA-Router fängt URL-Änderungen auf /ccm/-Seiten ab und leitet auf die
 * Startseite um. Deshalb reiner Client-State; der Hash wird nur gespiegelt
 * (replaceState löst keinen Router aus), damit ein Reload auf der
 * Konfigurationsseite bleibt und #admin direkt verlinkbar ist.
 */
import { ref, watch } from 'vue';
import AdminView from '@/wizard/components/AdminView.vue';
import WizardShell from '@/wizard/components/WizardShell.vue';

const showAdmin = ref(
    window.location.hash === '#admin' ||
        new URLSearchParams(window.location.search).get('admin') === '1',
);

watch(showAdmin, (on) => {
    const url = new URL(window.location.href);
    url.hash = on ? '#admin' : '';
    window.history.replaceState(window.history.state, '', url);
});
</script>

<template>
    <AdminView v-if="showAdmin" @back="showAdmin = false" />
    <WizardShell v-else @admin="showAdmin = true" />
</template>
