# Design Spec 001: Hajk-Assistent (3-Schritte-Wizard)

**Status:** draft
**Owner:** UX/UI Design Director
**Date:** 2026-09-22
**Related artifacts:**
- PRD: `docs/prds/prd-hikeplanner-hajk-assistent-v0.1.md`
- Design Baseline: `docs/design/DESIGN-BASELINE.md`
- TDD: —
- Research: —
- ADRs: — (Design-System-Entscheidung folgt gemeinsam mit Architektur)

## Context

Der Hajk-Assistent ist die einzige Seite der HikePlanner-Extension: Ein 3-Schritte-Wizard, mit dem Team-Leiter eine vollständig konfigurierte Hajk-Gruppe anlegen (PRD US-1 bis US-6). Der Wizard kapselt eine unumkehrbare Aktion (Gruppenanlage), daher gibt es vor dem Absenden einen expliziten Prüf-Schritt und danach eine klare Ergebnisübersicht.

## Users and their goals in this flow

- **Primary user:** Team-Leiter/Co-Leiter — will in wenigen Minuten einen Hajk für sein Team anlegen, ohne CT-Detailwissen.
- **Secondary user:** Stammleiter — wie oben, aber mit Teamwahl über alle Stufenteams.
- **Passiv betroffen:** Nicht berechtigte CT-Nutzer, die die Seite öffnen — bekommen eine freundliche Sackgasse mit Wegweiser.

## Flow overview

1. Nutzer öffnet die Extension-Seite; System prüft Rollen und lädt Teams + Vorlage (Zugangs-Gate).
2. Nicht berechtigt → Hinweisseite (Ende). Berechtigt → Schritt 1.
3. Schritt 1 „Team & Termin“: Team, Datum von/bis, Treffpunkt/Ort, Kurzbeschreibung; Live-Namensvorschau.
4. Schritt 2 „Anmeldung“: Anmeldemodus, Anmeldeschluss (nur bei Selbstanmeldung), max. Teilnehmerzahl, Feld-Checkliste aus der Vorlage.
5. Schritt 3 „Prüfen & Anlegen“: Zusammenfassung aller Angaben; Klick auf „Hajk anlegen“ startet die Provisionierung mit sichtbarem Schritt-Fortschritt.
6. Erfolg → Ergebnisübersicht mit Link zur Gruppe. Fehler → Rollback-Meldung mit fehlgeschlagenem Schritt; Eingaben bleiben erhalten, erneuter Versuch möglich.

Navigation: Stepper ist linear (Weiter/Zurück). „Zurück“ verliert keine Eingaben. Bereits besuchte Schritte sind über den Stepper direkt anspringbar; zukünftige nicht.

## Screens and states

### Screen: Zugangs-Gate (Laden / kein Zugang / Systemfehler)

**Purpose:** Beim Öffnen Rollen, Teams und Vorlage laden und Nicht-Berechtigte freundlich abfangen (US-1).

**States required:**
- Loading: Skeleton des Wizard-Rahmens (Titel + drei graue Balken), keine Spinner-Solo-Seite.
- Kein Zugang (Empty-Variante): Hinweisseite, wer den Assistenten nutzen darf und an wen man sich wendet.
- Error: CT-API nicht erreichbar oder Vorlagen-Validierung fehlgeschlagen (fehlt / falscher Typ / kein Organisator) → Fehlerkarte mit konkreter Ursache und „Erneut versuchen“.
- Default: n/a — bei Erfolg direkt Schritt 1.
- Success: n/a.

**Wireframe (kein Zugang):**

```
┌─ Neuen Hajk anlegen ────────────────────────────┐
│                                                 │
│   ⓘ  Dieser Assistent ist für Team-Leiter       │
│                                                 │
│   Hajks anlegen können Leiter und Co-Leiter     │
│   eines Stufenteams sowie die Stammleitung.     │
│                                                 │
│   Du planst einen Hajk? Wende dich an die       │
│   Leiter deines Teams oder an die               │
│   Stammleitung.                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Wireframe (Systemfehler):**

```
┌─ Neuen Hajk anlegen ────────────────────────────┐
│                                                 │
│   ✗  Der Assistent kann gerade nicht starten    │
│                                                 │
│   Die Vorlagengruppe „=== Vorlage Hajks“        │
│   wurde nicht gefunden. Bitte melde das der     │
│   Stammleitung.                                 │
│                                                 │
│              [Erneut versuchen]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Components used:** Karte, Hinweis-/Fehlerbanner, Sekundär-Button.

**Interactions:**
- „Erneut versuchen“ → Ladevorgang wiederholen.
- Keine weiteren Aktionen auf der Kein-Zugang-Seite (bewusste Sackgasse, kein toter Button).

**Responsive behavior:** Einspaltig auf allen Größen; Karte max. 640 px, zentriert.

**Accessibility:**
- h1 „Neuen Hajk anlegen“, Meldungstitel als h2.
- Fehler-/Hinweiskarte mit `role="status"` (Hinweis) bzw. `role="alert"` (Fehler).

**Edge cases / things to watch:**
- Loading vs. „kein Zugang“ klar unterscheidbar (Skeleton ≠ Hinweisseite).
- Fehlertext nennt immer die Ursache (Vorlage fehlt ≠ API down) — keine Sammel-Fehlermeldung.

---

### Screen: Schritt 1 — Team & Termin

**Purpose:** Eckdaten des Hajks erfassen: für wen, wann, wo, worum geht es (US-1, US-2).

**States required:**
- Default: Formular; Team vorausgewählt, wenn der Nutzer nur ein Team leitet (Feld dann als beschriftete, nicht öffnende Anzeige mit Team-Badge).
- Empty: Erstaufruf — Felder leer bis auf Team-Vorauswahl; Namensvorschau zeigt Platzhalter „RR Hajk … (Team und Datum wählen)“.
- Loading: n/a (Daten kamen im Gate).
- Error: Feld-Validierungen inline (siehe Interactions); kein Seitenfehler.
- Success: Übergang zu Schritt 2.

**Wireframe (Desktop, Stammleiter mit Teamwahl, Förder-Hinweis aktiv):**

```
┌─ Neuen Hajk anlegen ─────────────────────────────────┐
│  ●───────○───────○                                   │
│  Team & Termin   Anmeldung   Prüfen & Anlegen        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Team                                                │
│  [Kundschafterteam Eisbären              ▼]          │
│                                                      │
│  Von                    Bis                          │
│  [10.04.2027      📅]   [11.04.2027      📅]          │
│                                                      │
│  ⚠ Weniger als zwei Übernachtungen: Förderungen      │
│    gibt es erst ab zwei Nächten.                     │
│                                                      │
│  Treffpunkt / Ort                                    │
│  [Gemeindehaus Altensteig___________________]        │
│                                                      │
│  Kurzbeschreibung *                                  │
│  ┌────────────────────────────────────────────┐      │
│  │ Was ist geplant? Bitte auch die Anzahl     │      │
│  │ der Nächte nennen (wichtig für Förderung). │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  ──────────────────────────────────────────────      │
│  Name der Gruppe (wird automatisch vergeben)         │
│  ⓘ RR Hajk Eisbären 10.04.–11.04.2027                │
│                                                      │
│                                    [Weiter →]        │
└──────────────────────────────────────────────────────┘
```

Teamwahl-Dropdown (Stammleiter) gruppiert nach Stufe:

```
[Team                                     ▼]
 ┌──────────────────────────────────────┐
 │ Kundschafter                         │
 │   Eisbären                           │
 │   Löwen                              │
 │ Pfadfinder                           │
 │   Schneefüchse                       │
 │   …                                  │
 └──────────────────────────────────────┘
```

**Components used:** Stepper, Select (gruppiert), Datepicker ×2, Textfeld, Textarea, Warnhinweis (nicht blockierend), Namensvorschau-Zeile, Primär-Button.

**Interactions:**
- Team/Datum ändern → Namensvorschau aktualisiert sofort (`aria-live="polite"`).
- Datum „Bis“ vor „Von“ → Inline-Fehler am Bis-Feld: „Das Enddatum muss nach dem Startdatum liegen.“ (blockiert „Weiter“).
- Zeitraum < 2 Nächte → gelber Hinweis unter den Datumsfeldern, blockiert nicht.
- Kurzbeschreibung leer bei „Weiter“ → Inline-Fehler „Bitte beschreibe kurz den Hajk — inklusive Anzahl der Nächte.“
- „Weiter“ validiert alle Felder; erster Fehler erhält den Fokus.
- Tastatur: Tab-Reihenfolge = visuelle Reihenfolge; Datepicker auch per Texteingabe (TT.MM.JJJJ) bedienbar.

**Responsive behavior:**
- Mobile (<768 px): Von/Bis untereinander statt nebeneinander; Button volle Breite, unten.
- Tablet/Desktop: wie Wireframe, Inhaltsbreite max. 640 px.

**Accessibility:**
- h1 bleibt „Neuen Hajk anlegen“; Schrittname als h2 zusätzlich zum Stepper (Stepper allein ist zu leise für Screenreader).
- Stepper als `<nav aria-label="Schritte">` mit `aria-current="step"`.
- Pflichtfeld-Kennzeichnung: nur die Kurzbeschreibung trägt „*“, Legende „* Pflichtfeld“ unter dem Formular; alle anderen Felder sind entweder trivial nötig (Team, Datum — ohne sie kein „Weiter“) oder optional beschriftet („optional“ im Label von Ort und max. Teilnehmerzahl).

**Edge cases / things to watch:**
- Lange Teamnamen (Emoji, „NEU LEOPANDAS MÄDCHEN“) → Dropdown-Einträge einzeilig mit Ellipsis, Vorschauzeile darf zweizeilig umbrechen.
- Ein-Team-Leiter: Teamfeld ist Anzeige, kein deaktiviertes Dropdown (kein toter Interaktions-Köder).
- Namensvorschau ist eindeutig als „nicht editierbar“ gestaltet (ⓘ-Zeile, kein Eingaberahmen).

---

### Screen: Schritt 2 — Anmeldung

**Purpose:** Anmeldemodus, Grenzen und Anmeldefelder festlegen (US-2, US-3).

> **Geändert 22.09.2026 (PRD v0.2):** Die Feld-Checkliste ist entfallen — Felder
> kommen immer vollständig aus der Vorlage (CT-Rechte erlauben Leitern kein
> Feld-Schreiben). Statt der Checkliste zeigt Schritt 2 eine reine Info-Liste der
> Vorlagen-Felder mit Pflicht-Markierung und dem Hinweis „Die Felder kommen
> automatisch aus der Vorlage — Änderungen daran macht die Stammleitung.“
> Außerdem seitdem ergänzt: Checkbox „Anmeldung ohne ChurchTools-Konto
> ermöglichen“ + nachgelagerte Checkbox „Veranstaltung sofort veröffentlichen“.

**States required:**
- Default: Modus „Selbstanmeldung“ vorausgewählt (häufigster Fall); Anmeldefelder als Info-Liste (siehe Änderungshinweis oben).
- Empty: Vorlage hat keine Felder → statt Checkliste ein Hinweis: „Die Vorlage enthält aktuell keine Anmeldefelder. Der Feldkatalog wird in der Vorlagengruppe gepflegt.“ Flow bleibt fortsetzbar.
- Loading: n/a (Felder kamen im Gate).
- Error: Inline-Validierung (Anmeldeschluss nach Startdatum; max. Teilnehmerzahl keine Zahl).
- Success: Übergang zu Schritt 3.

**Wireframe (Modus Selbstanmeldung):**

```
┌─ Neuen Hajk anlegen ─────────────────────────────────┐
│  ●───────●───────○          RR Hajk Eisbären 10.04.– │
│  Team & Termin   Anmeldung   Prüfen & Anlegen        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Wie kommen die Teilnehmer in die Gruppe?            │
│  ● Teilnehmer melden sich selbst an                  │
│  ○ Ich trage die Teilnehmer selbst ein               │
│                                                      │
│  Anmeldeschluss              Max. Teilnehmer         │
│  [03.04.2027         📅]     [___] (optional)        │
│                                                      │
│  ──────────────────────────────────────────────      │
│  Welche Angaben brauchst du von den Teilnehmern?     │
│  Diese Felder fragt das Anmeldeformular ab.          │
│                                                      │
│  ☑ Vegetarisch            (Ja / Nein) · Pflicht      │
│  ☐ T-Shirt-Größe          (128–XXL)                  │
│  ☐ Mitfahrgelegenheit     (7 Optionen) · Pflicht     │
│  ☐ Bemerkung              (Freitext)                 │
│                                                      │
│  [← Zurück]                          [Weiter →]      │
└──────────────────────────────────────────────────────┘
```

Modus „manuell“ (Konditional-Verhalten):

```
│  ○ Teilnehmer melden sich selbst an                  │
│  ● Ich trage die Teilnehmer selbst ein               │
│                                                      │
│  ⓘ Es gibt keine Selbstanmeldung. Du fügst die       │
│    Teilnehmer nach dem Anlegen in der Gruppe         │
│    hinzu. Die gewählten Felder stehen dir dort       │
│    zur Datenpflege zur Verfügung.                    │
│                                                      │
│  Max. Teilnehmer                                     │
│  [___] (optional)                                    │
```

(Anmeldeschluss wird ausgeblendet, nicht deaktiviert; die Feld-Checkliste bleibt sichtbar, ihre Unterzeile wechselt zu „Diese Felder kannst du je Teilnehmer pflegen.“)

**Components used:** Radiogruppe, Datepicker, Zahlenfeld, Checkbox-Liste mit Sekundärtext, Info-Hinweis, Zurück-/Weiter-Buttons.

**Interactions:**
- Moduswechsel → Anmeldeschluss ein-/ausblenden; bereits eingegebener Anmeldeschluss bleibt im Zustand erhalten (Wechsel zurück stellt ihn wieder her).
- Anmeldeschluss nach Startdatum → Inline-Fehler „Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.“
- Checkbox-Zeile: gesamte Zeile klickbar (Label + Sekundärtext), nicht nur die 16-px-Box.
- „Pflicht“-Badge und Optionsanzahl stammen aus der Vorlage und sind hier nicht änderbar (US-3 Non-Goal) — bewusst ohne Edit-Affordance.

**Responsive behavior:**
- Mobile: Anmeldeschluss und Max. Teilnehmer untereinander; Checkliste unverändert einspaltig; Zurück/Weiter als zwei Buttons nebeneinander (Zurück sekundär, schmaler).

**Accessibility:**
- Radiogruppe in `<fieldset>` mit `<legend>` „Wie kommen die Teilnehmer in die Gruppe?“.
- Checkliste als `<fieldset>` mit Legend „Angaben von Teilnehmern“; jedes Feld ein `<label>` um die ganze Zeile.
- Konditionales Ein-/Ausblenden des Anmeldeschlusses wird nicht announced-spammt: Feld steht direkt unter der Radiogruppe, Fokus bleibt auf dem Radio.

**Edge cases / things to watch:**
- Vorlage mit vielen Feldern (>8): Liste bleibt flach und scrollt mit der Seite — kein Binnen-Scrollcontainer.
- Feldnamen/Optionslisten können lang sein → Sekundärtext einzeilig mit Ellipsis, voller Text als `title`.
- Max. Teilnehmer = 0 oder negativ → Inline-Fehler „Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.“

---

### Screen: Schritt 3 — Prüfen & Anlegen (inkl. Provisionierung)

**Purpose:** Letzte Kontrolle vor der unumkehrbaren Anlage; danach transparenter Fortschritt der Provisionierung (US-4, US-5).

**States required:**
- Default: Zusammenfassung aller Angaben in Sektionen mit „Ändern“-Links zurück zum jeweiligen Schritt.
- Loading (Provisionierung läuft): Button gesperrt; Fortschrittsliste ersetzt die Buttons; jeder Schritt mit Zustand (✓ erledigt, ◌ läuft, · wartet).
- Error (Provisionierung fehlgeschlagen): Fehlerkarte mit fehlgeschlagenem Schritt + Ergebnis des Rollbacks; Eingaben bleiben erhalten, „Erneut versuchen“ möglich.
- Success: Wechsel auf den Ergebnis-Screen.
- Empty: n/a.

**Wireframe (Default):**

```
┌─ Neuen Hajk anlegen ─────────────────────────────────┐
│  ●───────●───────●                                   │
│  Team & Termin   Anmeldung   Prüfen & Anlegen        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  RR Hajk Eisbären 10.04.–12.04.2027                  │
│                                                      │
│  Team & Termin                          (Ändern)     │
│  Team          Kundschafterteam Eisbären             │
│  Zeitraum      Fr 10.04. – So 12.04.2027 (2 Nächte)  │
│  Treffpunkt    Gemeindehaus Altensteig               │
│  Beschreibung  Wochenend-Hajk im Schwarzwald, …      │
│                                                      │
│  Anmeldung                              (Ändern)     │
│  Modus         Selbstanmeldung bis 03.04.2027        │
│  Teilnehmer    max. 20                               │
│  Felder        Vegetarisch · T-Shirt-Größe           │
│                                                      │
│  Automatisch eingerichtet                            │
│  Ablage        RR | Camps und Aktionen – Kundschafter│
│  Organisatoren Irma Betz, Julia Timmalog             │
│  Leiter        Du (Christoph Cremer)                 │
│  Kalender      „Royal Rangers“ (öffentlich)          │
│                                                      │
│  [← Zurück]                     [Hajk anlegen ✓]     │
└──────────────────────────────────────────────────────┘
```

**Wireframe (Provisionierung läuft):**

```
│  Dein Hajk wird angelegt …                           │
│                                                      │
│  ✓ Vorlage dupliziert                                │
│  ✓ Anmeldefelder eingerichtet                        │
│  ◌ Gruppe wird einsortiert …                         │
│  · Organisatoren und Leiter eintragen                │
│  · Kalendertermin anlegen                            │
│                                                      │
│  (Bitte das Fenster geöffnet lassen)                 │
```

**Wireframe (Fehler mit Rollback):**

```
│  ✗ Das hat leider nicht geklappt                     │
│                                                      │
│  Beim Einsortieren der Gruppe ist ein Fehler         │
│  aufgetreten. Die angelegte Gruppe wurde wieder      │
│  entfernt — es ist kein halbfertiger Hajk            │
│  zurückgeblieben.                                    │
│                                                      │
│  Deine Eingaben sind noch da.                        │
│                                                      │
│  [Erneut versuchen]      (Zurück zu den Eingaben)    │
```

(Variante Rollback fehlgeschlagen: Zusatzabsatz „Die unfertige Gruppe ‚RR Hajk …‘ konnte nicht gelöscht werden. Bitte melde das der Stammleitung: <Link zur Gruppe>.“)

**Components used:** Zusammenfassungs-Sektionen (Definition List), Link-Button „Ändern“, Primär-Button, Fortschrittsliste, Fehlerkarte.

**Interactions:**
- „Ändern“ → springt zum jeweiligen Schritt, Eingaben intakt; Rückkehr zu Schritt 3 über den Stepper oder erneutes Durchklicken.
- „Hajk anlegen“ → sofort gesperrt (kein Doppelklick), Fortschrittsliste erscheint an Ort und Stelle.
- Während der Provisionierung: Stepper-Navigation und „Zurück“ deaktiviert.
- „Erneut versuchen“ wiederholt die komplette Provisionierung von vorn (nach Rollback).

**Responsive behavior:** Zusammenfassung bleibt einspaltig; Label-Wert-Paare auf Mobile untereinander statt tabellarisch.

**Accessibility:**
- Fortschrittsliste in `aria-live="polite"`-Region; jeder Statuswechsel wird als Text announced („Vorlage dupliziert — erledigt“).
- Fehlerkarte `role="alert"`, Fokus springt auf ihren Titel.
- „Automatisch eingerichtet“-Sektion erklärt Systemverhalten vor dem Klick — nichts passiert „heimlich“.

**Edge cases / things to watch:**
- Namenskollision wird vor dem Duplizieren erkannt → Fehlerkarte mit Link zur bestehenden Gruppe („Es gibt bereits eine Gruppe mit diesem Namen“), Angebot: Datum/Team ändern.
- Kalender-Fehler bricht NICHT ab → läuft in den Ergebnis-Screen mit Warnung (siehe dort).
- Provisionierung > 10 s: Fortschrittsliste bleibt der Indikator; kein zusätzlicher Spinner.

---

### Screen: Ergebnis (Bestätigung)

**Purpose:** Klar bestätigen, was entstanden ist, und den Weg zur Gruppe weisen (US-6).

**States required:**
- Success (voll): alle Schritte ✓.
- Success mit Warnung: Gruppe ✓, Kalender ✗ → Warnzeile „manuell nachholen“.
- Default/Empty/Loading/Error: n/a (Fehler enden auf Schritt 3).

**Wireframe (Erfolg mit Kalender-Warnung):**

```
┌─ Neuen Hajk anlegen ─────────────────────────────────┐
│                                                      │
│   ✓  Dein Hajk ist angelegt!                         │
│                                                      │
│   RR Hajk Eisbären 10.04.–12.04.2027                 │
│                                                      │
│   ✓ Abgelegt in „RR | Camps und Aktionen –           │
│     Kundschafter“                                    │
│   ✓ Anmeldefelder: Vegetarisch, T-Shirt-Größe        │
│   ✓ Selbstanmeldung bis 03.04.2027, max. 20          │
│   ✓ Organisatoren: Irma Betz, Julia Timmalog         │
│   ✓ Du bist als Leiter eingetragen                   │
│   ⚠ Kalendertermin konnte nicht angelegt werden —    │
│     bitte trage ihn manuell im Kalender              │
│     „Royal Rangers“ ein.                             │
│                                                      │
│   [Zur Gruppe in ChurchTools →]                      │
│                                                      │
│   (Weiteren Hajk anlegen)                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Components used:** Erfolgskarte, Ergebnis-Checkliste, Warnzeile, Primär-Link-Button, sekundärer Reset-Link.

**Interactions:**
- „Zur Gruppe“ → öffnet die CT-Gruppenseite (gleicher Tab; die Extension hat hier nichts mehr zu tun).
- „Weiteren Hajk anlegen“ → Wizard zurück auf Schritt 1, Formular leer (bewusst kein Übernehmen der alten Werte — Verwechslungsgefahr).

**Responsive behavior:** Einspaltig, Primär-Button volle Breite auf Mobile.

**Accessibility:**
- Fokus nach dem Wechsel auf den Erfolgs-Titel (h2), damit Screenreader den Ausgang mitbekommen.
- Warnzeile zusätzlich mit „Wichtig:“-Prefix im Text (nicht nur Farbe/Icon).

**Edge cases / things to watch:**
- Erfolgs- und Warnzeilen niemals mischen ohne visuelle Trennung der Semantik (✓ grün, ⚠ gelb, je Icon + Text).

## Interaction patterns used

- **Linearer Stepper:** 3 Schritte, besuchte Schritte anklickbar, zukünftige nicht; `aria-current="step"`. Während der Provisionierung komplett gesperrt.
- **Inline-Validierung:** Prüfung bei „Weiter“ und beim Verlassen eines Feldes; Fehlertext unter dem Feld, Feld erhält Fehlerrahmen; erster Fehler bekommt Fokus. Keine Toast-/Popup-Fehler.
- **Konditionale Felder:** Anmeldeschluss erscheint/verschwindet mit dem Modus; eingegebene Werte überleben den Moduswechsel im Zustand.
- **Fortschritts-Checkliste statt Spinner:** Für die mehrstufige Provisionierung; identische Struktur erscheint im Ergebnis-Screen wieder (Wiedererkennung).

## New components needed in the design system

| Component | Purpose | Variants needed | Notes |
|-----------|---------|-----------------|-------|
| Stepper | Schritt-Navigation | 3 Schritte; Zustände: aktiv, erledigt, gesperrt | Mobile: Punkte + „Schritt x/3“ |
| Feld-Checkliste | Anmeldefelder wählen | mit/ohne Pflicht-Badge, Empty-Hinweis | ganze Zeile klickbar |
| Fortschrittsliste | Provisionierungs-Status | ✓ / ◌ / · / ✗ je Zeile | aria-live |
| Namensvorschau | generierter Gruppenname | Platzhalter- und Wert-Zustand | eindeutig nicht-editierbar |
| Zusammenfassungs-Sektion | Prüf-Schritt | mit „Ändern“-Link | Definition-List-Semantik |

## Copy guidance

- Durchgängig Du-Form, Rangers-Tonalität: freundlich, direkt, kein Verwaltungsdeutsch („Dein Hajk ist angelegt!“ statt „Vorgang erfolgreich abgeschlossen“).
- CTA-Labels verb-first und spezifisch: „Hajk anlegen“, „Zur Gruppe in ChurchTools“, „Erneut versuchen“ — nie „OK“/„Absenden“.
- Fehlermeldungen: sachlich + nächster Schritt, nie Schuldzuweisung („Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.“).
- Systemverhalten ankündigen statt verstecken: Sektion „Automatisch eingerichtet“ in Schritt 3 listet Ablage, Organisatoren, Leiter, Kalender.
- Förder-Hinweis wörtlich: „Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.“

## Non-goals

- Kein Bearbeiten bestehender Hajks, keine Teilnehmerverwaltung, keine Vorlagen-Pflege in der Extension (alles PRD-Non-Goals).
- Keine Entwurfs-Speicherung über Reload hinweg (PRD US-2 Edge Case).
- Kein eigenes Theme — ausschließlich CT-Look laut Baseline.

## Open questions for implementation

- Exakte CT-Theme-Variablen für hell/dunkel: welche CSS-Custom-Properties stellt die CT-Umgebung Extensions bereit? (Mapping in der Token-Datei dokumentieren.)
- Datepicker: natives `<input type="date">` (mobil stark, Desktop je nach Browser) vs. leichte eigene Komponente — Empfehlung: nativ starten.
- Anzeige der „(n Optionen)“-Sekundärtexte in der Feld-Checkliste: ab wie vielen Optionen abkürzen (z. B. > 3 → „7 Optionen“ statt Aufzählung)?

## Decisions captured here

- Beschreibung + Ort liegen in Schritt 1 (gehören inhaltlich zum „Was & Wann“, nicht zur Anmeldung).
- Anmeldefelder starten **abgewählt** (Opt-in): bewusste Auswahl erzeugt sauberere Anmeldeformulare als vergessene Abwahl.
- Modus „Selbstanmeldung“ ist vorausgewählt (häufigster Fall laut Bestand).
- Fortschritt als Checkliste, nicht Prozentbalken — die Schritte sind diskret und benennbar, das schafft Vertrauen bei einer unumkehrbaren Aktion.
- „Weiteren Hajk anlegen“ startet leer statt vorbefüllt (Verwechslungsgefahr bei Serien-Anlage).
- Kein Autosave/Entwurf im MVP — Wizard ist in < 3 Minuten durchlaufbar.

## Risks

- **CT-Theme-Integration:** Wenn CT keine stabilen Theme-Variablen exponiert, droht Drift zwischen hell/dunkel → früh im Projekt klären (siehe Open questions), Fallback: eigene Token-Werte je Theme pflegen.
- **Stepper auf 360 px:** Drei beschriftete Schritte passen nicht nebeneinander → Mobile-Variante „●●○ Schritt 2/3: Anmeldung“ ist Teil der Spec, nicht optional.
- **Vertrauensbruch bei Teilfehlern:** Kalender-Warnung muss unübersehbar, aber klar von einem Fehlschlag unterscheidbar sein — sonst melden Leiter „kaputte“ Hajks, die in Ordnung sind.

## Verification protocol

1. Jeder Screen zeigt alle spezifizierten Zustände (Gate: Laden/kein Zugang/Fehler; Schritte: Default/Validierungsfehler; Schritt 3: Default/Laufend/Fehler; Ergebnis: voll/mit Warnung).
2. Kompletter Durchlauf nur mit Tastatur möglich; Fokus-Reihenfolge = visuelle Reihenfolge; erster Validierungsfehler erhält Fokus.
3. Moduswechsel blendet Anmeldeschluss korrekt ein/aus und erhält eingegebene Werte.
4. Namensvorschau aktualisiert live und ist nicht editierbar.
5. Doppelklick auf „Hajk anlegen“ löst genau eine Provisionierung aus.
6. Beide Themes: kein hartkodiertes Weiß/Schwarz, Kontraste in hell und dunkel geprüft.
7. 360-px-Viewport: kein horizontales Scrollen, Stepper in Mobile-Variante.

## Change log

- 2026-09-22 — created
