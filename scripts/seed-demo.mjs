#!/usr/bin/env node
/**
 * Idempotentes Seed der Demo-Instanz (rr-demo) für HikePlanner-Entwicklung.
 * Legt an (falls fehlend): ein Test-Stufenteam, die Sammelgruppe
 * "RR | Camps und Aktionen - Kundschafter" und die Vorlagengruppe
 * "=== Vorlage Hajks" mit Feldkatalog + Organisator-Mitglied. Trägt den
 * Seed-User als Team-Leiter ein, damit der Wizard-Durchlauf möglich ist.
 *
 * Aufruf: npm run seed:demo  (liest VITE_BASE_URL/USERNAME/PASSWORD aus .env)
 * Niemals gegen die Live-Instanz laufen lassen.
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const BASE = env.VITE_BASE_URL;
if (!BASE || BASE.includes('jms-altensteig')) {
    console.error(`Abbruch: VITE_BASE_URL fehlt oder zeigt auf die Live-Instanz (${BASE}).`);
    process.exit(1);
}

const cookies = new Map();
let csrf = '';

async function call(method, path, body) {
    const res = await fetch(`${BASE}/api${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(cookies.size ? { Cookie: [...cookies.values()].join('; ') } : {}),
            ...(csrf ? { 'CSRF-Token': csrf } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
        const pair = c.split(';')[0];
        cookies.set(pair.slice(0, pair.indexOf('=')), pair);
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
        throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return json.data;
}
const get = (p) => call('GET', p);
const post = (p, b) => call('POST', p, b);
const put = (p, b) => call('PUT', p, b);

async function findGroupByName(name) {
    const groups = await get(`/groups?query=${encodeURIComponent(name)}&limit=200`);
    return groups.find((g) => g.name === name) ?? null;
}

async function ensureGroup(name, groupTypeId, parentId) {
    let group = await findGroupByName(name);
    if (group) {
        console.log(`  exists, skipping: ${name} (${group.id})`);
    } else {
        group = await post('/groups', { name, groupTypeId, groupStatusId: 1 });
        console.log(`  created: ${name} (${group.id})`);
    }
    if (parentId) {
        try {
            await put(`/groups/${group.id}/parents/${parentId}`, {});
        } catch (e) {
            if (!String(e).includes('already')) throw e;
        }
    }
    return group.id;
}

async function ensureField(groupId, field) {
    const existing = await get(`/groups/${groupId}/memberfields`);
    if (existing.some((f) => f.field.name === field.name)) {
        console.log(`  field exists, skipping: ${field.name}`);
        return;
    }
    await post(`/groups/${groupId}/memberfields/group`, { securityLevel: 1, ...field });
    console.log(`  field created: ${field.name}`);
}

// --- Login -----------------------------------------------------------------
const login = await post('/login', {
    username: env.VITE_USERNAME,
    password: env.VITE_PASSWORD,
});
const myId = login.personId;
csrf = await get('/csrftoken');
console.log(`Angemeldet als Person ${myId} auf ${BASE}`);

// --- Rollen dynamisch auflösen (IDs unterscheiden sich je Instanz) ----------
const roles = await get('/group/roles');
const roleId = (groupTypeId, predicate) => {
    const role = roles.find((r) => r.groupTypeId === groupTypeId && predicate(r));
    if (!role) throw new Error(`Rolle für Gruppentyp ${groupTypeId} nicht gefunden`);
    return role.id;
};
const teamLeaderRole = roleId(1, (r) => r.isLeader && r.name === 'Leiter');
const eventOrganisatorRole = roleId(3, (r) => r.name === 'Organisator');

// --- Struktur --------------------------------------------------------------
const stammMa = await findGroupByName('RR Kundschafterstamm-MA');
if (!stammMa) {
    console.error('Abbruch: "RR Kundschafterstamm-MA" fehlt auf der Demo-Instanz.');
    process.exit(1);
}

console.log('Teams:');
const teamId = await ensureGroup('RR Kundschafterteam Testbären', 1, stammMa.id);
const team2Id = await ensureGroup('RR Kundschafterteam Testfüchse', 1, stammMa.id);
console.log('Sammelgruppe:');
const sammelId = await ensureGroup('RR | Camps und Aktionen - Kundschafter', 4, stammMa.id);
// Sammelgruppen stehen auf "intern": Leiter müssen sie sehen können, damit
// der Wizard die Ziel-Ablage per Namens-Match findet (docs/CONVENTIONS.md).
await call('PATCH', `/groups/${sammelId}`, { visibility: 'intern' });

console.log('Vorlage:');
const templateId = await ensureGroup('=== Vorlage Hajks', 3, sammelId);

// Vorlagen-Settings: Selbstanmeldung offen, intern sichtbar (flache Keys!).
await call('PATCH', `/groups/${templateId}`, {
    visibility: 'intern',
    autoAccept: true,
    signUpOpeningDate: '2026-01-01T00:00:00Z',
    note: 'Vorlage für Hajks — Felder/Settings/Organisatoren hier pflegen (SSOT).',
});

console.log('Feldkatalog:');
await ensureField(templateId, {
    name: 'Vegetarisch',
    fieldTypeCode: 'radioselect',
    useInRegistrationForm: true,
    requiredInRegistrationForm: true,
    options: [{ name: 'Ja' }, { name: 'Nein' }],
});
await ensureField(templateId, {
    name: 'T-Shirt-Größe',
    fieldTypeCode: 'radioselect',
    useInRegistrationForm: true,
    requiredInRegistrationForm: false,
    options: ['128', '140', '152', '164', 'S', 'M', 'L'].map((name) => ({ name })),
});
await ensureField(templateId, {
    name: 'Bemerkung',
    fieldTypeCode: 'text',
    useInRegistrationForm: true,
    requiredInRegistrationForm: false,
});

console.log('Mitgliedschaften:');
await put(`/groups/${teamId}/members/${myId}`, { groupTypeRoleId: teamLeaderRole });
await put(`/groups/${team2Id}/members/${myId}`, { groupTypeRoleId: teamLeaderRole });
console.log(`  Person ${myId} ist Leiter in beiden Testteams (→ Team-Dropdown im Wizard)`);
await put(`/groups/${templateId}/members/${myId}`, { groupTypeRoleId: eventOrganisatorRole });
console.log(`  Person ${myId} ist Organisator der Vorlage`);

console.log('Kalender:');
const calendars = await get('/calendars');
let cal = calendars.find((c) => c.name === 'Royal Rangers');
if (cal) {
    console.log(`  exists, skipping: Royal Rangers (${cal.id})`);
} else {
    cal = await post('/calendars', { name: 'Royal Rangers', type: 'church', sortKey: 99 });
    console.log(`  created: Royal Rangers (${cal.id})`);
}

console.log(
    `\nFertig. Vorlage ${templateId}, Kalender ${cal.id} — werden zur Laufzeit über ihre Namen gefunden.`,
);
