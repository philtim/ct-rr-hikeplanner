<script setup lang="ts">
import type { ProvisionProgress, ProvisionStepId, StepStatus } from '@/wizard/types';

defineProps<{ progress: ProvisionProgress[] }>();

const labels: Record<ProvisionStepId, string> = {
    duplicate: 'Vorlage dupliziert',
    configure: 'Eckdaten gesetzt',
    fields: 'Anmeldefelder eingerichtet',
    parents: 'Gruppe einsortiert',
    members: 'Organisatoren und Leiter eingetragen',
    calendar: 'Kalendertermin angelegt',
};

const symbols: Record<StepStatus, string> = {
    done: '✓',
    running: '◌',
    pending: '·',
    failed: '✗',
};
</script>

<template>
    <ul class="hp-progress" aria-live="polite">
        <li v-for="p in progress" :key="p.step" :class="`hp-status--${p.status}`">
            {{ symbols[p.status] }} {{ labels[p.step]
            }}<template v-if="p.status === 'running'"> …</template>
        </li>
    </ul>
</template>
