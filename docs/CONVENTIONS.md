# Konventionen — RR Aktionen / HikePlanner

Diese Konventionen halten die Gruppenstruktur sauber. Der Assistent verlässt sich auf
sie; Abweichungen brechen die automatische Erkennung.

## Namensschema

- Hajk-Gruppen: `RR Hajk <TeamKurzname> <DD.MM.–DD.MM.YYYY>` (Jahreswechsel:
  `DD.MM.YYYY–DD.MM.YYYY`). Der Assistent generiert den Namen — niemals manuell abweichen.
- Stufenteams: `RR <Stufe>team <Name>` (Stufen: Entdecker, Forscher, Kundschafter,
  Pfadfinder, Pfadranger).
- Teilstamm-Mitarbeitergruppen: `RR <Stufe>stamm-MA`.
- Sammelgruppen: Name muss „Camps und Aktionen“ enthalten (z. B.
  `RR | Camps und Aktionen - Kundschafter`), genau eine je Teilstamm, als Kind der
  jeweiligen `RR <Stufe>stamm-MA`-Gruppe.

## Hierarchie

- `RR Gesamt-Stammleitung` → je Stufe `RR <Stufe>stamm-MA` → Stufenteams + Sammelgruppe
  → einzelne Hajks/Aktionen.
- Jede Hajk-Gruppe hängt unter GENAU EINER Sammelgruppe. Keine Hajks unter Teams,
  Verwaltungsgruppen oder anderen Hajks.

## Vorlagengruppe = Single Source of Truth

Die Gruppe `=== Vorlage Hajks` steuert den Assistenten. Dort — und nur dort — werden
gepflegt (normale CT-Oberfläche, keine Code-Änderung nötig):

- **Anmeldefelder**: der komplette wählbare Katalog inkl. Pflicht-Markierung und
  Optionen. Neue Wunschfelder in der Vorlage anlegen, NIE in einzelnen Hajk-Gruppen.
- **Settings**: Sichtbarkeit (intern), Auto-Accept usw. — Duplikate erben sie.
- **Organisatoren**: alle Mitglieder mit Rolle „Organisator“ (aktuell Irma Betz,
  Julia Timmalog) werden in jede neue Hajk-Gruppe übernommen (Förderanträge!).

Die Vorlage braucht immer mindestens ein Organisator-Mitglied, sonst verweigert der
Assistent den Start (bewusste Validierung).

## Gruppen anlegen

Hajk-Gruppen entstehen ausschließlich über den Assistenten. Das technische Anlage-Recht
erlaubt auch manuelles Anlegen — bitte nicht nutzen; die Stammleitung prüft die
Hierarchie regelmäßig auf Ausreißer.

## Erweiterung um neue Aktionstypen (nach MVP)

Je neuer Typ (Tagesaktion, Übernachtung, Camp): eigene Vorlagengruppe `=== Vorlage <Typ>`
anlegen und in `src/wizard/config.ts` registrieren; Namensschema `RR <Typ> <Team> <Datum>`.
