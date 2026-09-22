<script setup lang="ts">
/**
 * Konfigurationsseite (Footer-Link): legt fest, welche Gruppe als
 * Hajk-Vorlage dient und wer bei jeder Veranstaltung als Organisator
 * eingetragen wird. Wer speichern darf, entscheidet ChurchTools — ohne
 * Admin-Rechte liefert der KV-Store 403, und die Seite erklärt das.
 */
import { onMounted, ref } from 'vue';
import { ChurchToolsApiError } from '@/shared/api';
import { TEMPLATE_GROUP_NAME } from '@/wizard/config';
import {
    getGroupName,
    loadSettings,
    saveSettings,
    searchGroups,
    searchPersons,
} from '@/wizard/settings.api';
import type { OrganisatorRef } from '@/wizard/settings.api';
import '../wizard.css';

const emit = defineEmits<{ back: [] }>();

const loading = ref(true);
const currentId = ref<number | null>(null);
const currentName = ref<string | null>(null);

const query = ref('');
const results = ref<{ id: number; name: string }[]>([]);
const searched = ref(false);
const searching = ref(false);
const selectedId = ref<number | null>(null);

const organisators = ref<OrganisatorRef[]>([]);
const personQuery = ref('');
const personResults = ref<OrganisatorRef[]>([]);
const personSearched = ref(false);

const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
    const settings = await loadSettings();
    if (settings) {
        currentId.value = settings.hajkTemplateGroupId;
        organisators.value = settings.organisators;
        if (settings.hajkTemplateGroupId !== null) {
            currentName.value = await getGroupName(settings.hajkTemplateGroupId);
        }
    }
    loading.value = false;
});

async function search(): Promise<void> {
    searching.value = true;
    error.value = null;
    try {
        results.value = await searchGroups(query.value);
        searched.value = true;
        selectedId.value = null;
    } catch {
        error.value = 'Suche fehlgeschlagen. Bitte versuche es erneut.';
    } finally {
        searching.value = false;
    }
}

async function searchPerson(): Promise<void> {
    error.value = null;
    try {
        const found = await searchPersons(personQuery.value);
        // Bereits gewählte Personen nicht erneut anbieten.
        const chosen = new Set(organisators.value.map((o) => o.personId));
        personResults.value = found.filter((p) => !chosen.has(p.personId));
        personSearched.value = true;
    } catch {
        error.value = 'Personensuche fehlgeschlagen. Bitte versuche es erneut.';
    }
}

function addOrganisator(person: OrganisatorRef): void {
    organisators.value = [...organisators.value, person];
    personResults.value = personResults.value.filter((p) => p.personId !== person.personId);
}

function removeOrganisator(personId: number): void {
    organisators.value = organisators.value.filter((o) => o.personId !== personId);
}

async function save(): Promise<void> {
    saving.value = true;
    saved.value = false;
    error.value = null;
    try {
        const templateGroupId = selectedId.value ?? currentId.value;
        await saveSettings({
            hajkTemplateGroupId: templateGroupId,
            organisators: organisators.value,
        });
        currentId.value = templateGroupId;
        if (selectedId.value !== null) {
            currentName.value = results.value.find((r) => r.id === selectedId.value)?.name ?? null;
            selectedId.value = null;
        }
        saved.value = true;
    } catch (e) {
        error.value =
            e instanceof ChurchToolsApiError && e.status === 403
                ? 'Keine Berechtigung zum Speichern — die Konfiguration können nur Admins ändern.'
                : 'Speichern fehlgeschlagen. Bitte versuche es erneut.';
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="rr-hikeplanner-root" lang="de">
        <h1>HikePlanner-Konfiguration</h1>

        <div v-if="loading" class="hp-skeleton" data-testid="admin-loading"></div>

        <div v-else class="hp-card">
            <h2>Hajk-Vorlage</h2>
            <p v-if="currentId !== null" data-testid="current-template">
                Aktuell konfiguriert:
                <strong>{{ currentName ?? `Gruppe ${currentId} (nicht lesbar)` }}</strong>
            </p>
            <p v-else class="hp-hint" data-testid="current-template">
                Noch keine Vorlage konfiguriert — der Assistent sucht die Gruppe „{{
                    TEMPLATE_GROUP_NAME
                }}“ über ihren Namen.
            </p>

            <div class="hp-field">
                <label for="hp-admin-query">Vorlagen-Gruppe suchen</label>
                <div class="hp-copy-row">
                    <input
                        id="hp-admin-query"
                        v-model="query"
                        type="search"
                        placeholder="Gruppenname, z. B. Vorlage"
                        @keydown.enter.prevent="search()"
                    />
                    <button
                        type="button"
                        class="hp-btn"
                        data-testid="search"
                        :disabled="searching"
                        @click="search()"
                    >
                        Suchen
                    </button>
                </div>
            </div>

            <fieldset v-if="results.length" class="hp-checklist" data-testid="results">
                <legend>Gruppe als Hajk-Vorlage wählen</legend>
                <label v-for="g in results" :key="g.id" class="hp-check-row">
                    <input v-model="selectedId" type="radio" name="hp-template" :value="g.id" />
                    <span>{{ g.name }}</span>
                </label>
            </fieldset>
            <p v-else-if="searched && !searching" class="hp-hint">Keine Gruppen gefunden.</p>

            <h2>Organisatoren</h2>
            <p class="hp-hint">
                Diese Personen werden bei jeder neuen Veranstaltung automatisch als Organisator
                eingetragen (z. B. für Förderanträge).
            </p>

            <ul v-if="organisators.length" class="hp-result-list" data-testid="organisators">
                <li v-for="o in organisators" :key="o.personId">
                    <span>{{ o.name }}</span>
                    <button
                        type="button"
                        class="hp-link-btn"
                        :data-testid="`remove-organisator-${o.personId}`"
                        @click="removeOrganisator(o.personId)"
                    >
                        Entfernen
                    </button>
                </li>
            </ul>
            <p v-else class="hp-hint" data-testid="no-organisators">
                Noch keine Organisatoren konfiguriert — es gelten die Organisator-Mitglieder der
                Vorlagen-Gruppe.
            </p>

            <div class="hp-field">
                <label for="hp-person-query">Person hinzufügen</label>
                <div class="hp-copy-row">
                    <input
                        id="hp-person-query"
                        v-model="personQuery"
                        type="search"
                        placeholder="Name, z. B. Irma"
                        @keydown.enter.prevent="searchPerson()"
                    />
                    <button
                        type="button"
                        class="hp-btn"
                        data-testid="search-person"
                        @click="searchPerson()"
                    >
                        Suchen
                    </button>
                </div>
            </div>

            <ul v-if="personResults.length" class="hp-result-list" data-testid="person-results">
                <li v-for="p in personResults" :key="p.personId">
                    <span>{{ p.name }}</span>
                    <button
                        type="button"
                        class="hp-link-btn"
                        :data-testid="`add-organisator-${p.personId}`"
                        @click="addOrganisator(p)"
                    >
                        Hinzufügen
                    </button>
                </li>
            </ul>
            <p v-else-if="personSearched" class="hp-hint">Keine Personen gefunden.</p>

            <p v-if="saved" class="hp-info-box" data-testid="saved">✓ Konfiguration gespeichert.</p>
            <p v-if="error" class="hp-error-text" data-testid="save-error">{{ error }}</p>

            <div class="hp-actions">
                <button type="button" class="hp-btn" data-testid="back" @click="emit('back')">
                    ← Zurück zum Assistenten
                </button>
                <button
                    type="button"
                    class="hp-btn hp-btn--primary"
                    data-testid="save"
                    :disabled="saving"
                    @click="save()"
                >
                    Speichern
                </button>
            </div>
        </div>
    </div>
</template>
