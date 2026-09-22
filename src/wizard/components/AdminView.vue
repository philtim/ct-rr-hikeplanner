<script setup lang="ts">
/**
 * Konfigurationsseite (?admin=1): legt fest, welche Gruppe als Hajk-Vorlage
 * dient. Wer speichern darf, entscheidet ChurchTools — ohne Admin-Rechte
 * liefert der KV-Store 403, und die Seite erklärt das.
 */
import { onMounted, ref } from 'vue';
import { ChurchToolsApiError } from '@/shared/api';
import { TEMPLATE_GROUP_NAME } from '@/wizard/config';
import { getGroupName, loadSettings, saveSettings, searchGroups } from '@/wizard/settings.api';
import '../wizard.css';

const loading = ref(true);
const currentId = ref<number | null>(null);
const currentName = ref<string | null>(null);

const query = ref('');
const results = ref<{ id: number; name: string }[]>([]);
const searched = ref(false);
const searching = ref(false);
const selectedId = ref<number | null>(null);

const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
    const settings = await loadSettings();
    if (settings) {
        currentId.value = settings.hajkTemplateGroupId;
        currentName.value = await getGroupName(settings.hajkTemplateGroupId);
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

async function save(): Promise<void> {
    if (selectedId.value === null) return;
    saving.value = true;
    saved.value = false;
    error.value = null;
    try {
        await saveSettings({ hajkTemplateGroupId: selectedId.value });
        currentId.value = selectedId.value;
        currentName.value = results.value.find((r) => r.id === selectedId.value)?.name ?? null;
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

            <p v-if="saved" class="hp-info-box" data-testid="saved">✓ Konfiguration gespeichert.</p>
            <p v-if="error" class="hp-error-text" data-testid="save-error">{{ error }}</p>

            <div class="hp-actions">
                <a class="hp-btn" href="?">← Zurück zum Assistenten</a>
                <button
                    type="button"
                    class="hp-btn hp-btn--primary"
                    data-testid="save"
                    :disabled="selectedId === null || saving"
                    @click="save()"
                >
                    Speichern
                </button>
            </div>
        </div>
    </div>
</template>
