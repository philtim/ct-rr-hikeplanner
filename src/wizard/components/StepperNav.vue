<script setup lang="ts">
const props = defineProps<{
    current: 1 | 2 | 3;
    maxVisited: 1 | 2 | 3;
    locked: boolean;
}>();
const emit = defineEmits<{ goto: [step: 1 | 2 | 3] }>();

const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: 'Team & Termin' },
    { n: 2, label: 'Anmeldung' },
    { n: 3, label: 'Prüfen & Anlegen' },
];

function onClick(n: 1 | 2 | 3) {
    if (props.locked || n > props.maxVisited || n === props.current) return;
    emit('goto', n);
}
</script>

<template>
    <nav aria-label="Schritte">
        <ol class="hp-stepper">
            <li
                v-for="s in steps"
                :key="s.n"
                :class="{
                    'hp-step--active': s.n === current,
                    'hp-step--done': s.n < current,
                }"
            >
                <button
                    type="button"
                    :disabled="locked || s.n > maxVisited"
                    :aria-current="s.n === current ? 'step' : undefined"
                    @click="onClick(s.n)"
                >
                    Schritt {{ s.n }}/3<span class="hp-step-label">: {{ s.label }}</span>
                </button>
            </li>
        </ol>
    </nav>
</template>
