<script setup lang="ts">
import type { FormState, TemplateField } from '@/wizard/types';

const props = defineProps<{
    form: FormState;
    fields: TemplateField[];
}>();

/** Sekundärtext je Feld: kurze Aufzählung, Zähler ab 4 Optionen, sonst Freitext. */
function summary(field: TemplateField): string {
    if (field.options.length === 0) return '(Freitext)';
    if (field.options.length > 3) return `(${field.options.length} Optionen)`;
    return `(${field.options.join(' / ')})`;
}

function toggle(fieldId: number, checked: boolean) {
    const set = new Set(props.form.selectedFieldIds);
    if (checked) set.add(fieldId);
    else set.delete(fieldId);
    props.form.selectedFieldIds = [...set];
}
</script>

<template>
    <fieldset class="hp-checklist">
        <legend>Welche Angaben brauchst du von den Teilnehmern?</legend>
        <p class="hp-hint">
            <template v-if="form.mode === 'self'">Diese Felder fragt das Anmeldeformular ab.</template>
            <template v-else>Diese Felder kannst du je Teilnehmer pflegen.</template>
        </p>

        <p v-if="fields.length === 0" class="hp-info-box">
            Die Vorlage enthält aktuell keine Anmeldefelder. Der Feldkatalog wird in der
            Vorlagengruppe gepflegt.
        </p>

        <label v-for="field in fields" :key="field.id" class="hp-check-row">
            <input
                type="checkbox"
                :checked="form.selectedFieldIds.includes(field.id)"
                @change="toggle(field.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ field.name }}</span>
            <span class="hp-check-sub" :title="field.options.join(', ')">
                {{ summary(field) }}
                <template v-if="field.requiredInRegistrationForm"> · Pflicht</template>
            </span>
        </label>
    </fieldset>
</template>
