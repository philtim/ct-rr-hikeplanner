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

## Sichtbarkeiten

- Die 6 Sammelgruppen „RR | Camps und Aktionen – …“ stehen auf Sichtbarkeit **intern** —
  der Assistent findet die Ziel-Ablage über ihren Namen, dafür müssen Leiter sie sehen.
- Stufenteams, `RR <Stufe>stamm-MA` und `RR Gesamt-Stammleitung` bleiben **restricted**;
  der Assistent braucht sie nicht (Stufe steckt im Teamnamen). Stammleiter-Erkennung
  funktioniert über die eigene Mitgliedschaft (Mitglieder sehen restricted-Gruppen).
- Konsequenz für Stammleiter: Im Team-Dropdown erscheinen nur Teams, die sie sehen
  können — Stammleiter sollten daher Sicht auf die Stufenteams haben (Mitgliedschaft
  oder churchdb-Sichtrecht).

## Vorlagengruppe = Single Source of Truth

Welche Gruppe als Vorlage dient, bestimmt zuerst die **Extension-Konfiguration**
(Link „Konfiguration“ im Footer bzw. `…/ccm/rr-hikeplanner/#admin`; der Wechsel ist
reiner Client-State, weil ChurchTools' SPA-Router echte Navigation mit Query-Params
auf /ccm/-Seiten zur Startseite umleitet): Ein Admin wählt
dort die Vorlagen-Gruppe; gespeichert wird ihre ID im KV-Store des Custom-Moduls —
Umbenennen der Vorlage bricht dann nichts. Ohne Konfiguration fällt der Assistent
auf die Namenskonvention `=== Vorlage Hajks` zurück. Speichern der Konfiguration
verlangt ChurchTools-Admin-Rechte (Leiter bekommen 403).

Die Vorlagen-Gruppe steuert den Assistenten. Sie hängt bewusst
UNTER KEINER Eltern-Gruppe: Duplikate würden die Ablagen erben, und Leiter
dürfen fremde Zuordnungen nicht entfernen. Dort — und nur dort — werden
gepflegt (normale CT-Oberfläche, keine Code-Änderung nötig):

- **Anmeldefelder**: der komplette Katalog inkl. Pflicht-Markierung und Optionen —
  er gilt IMMER vollständig für jede neue Veranstaltung (keine Auswahl im Wizard;
  CT erlaubt Leitern kein Feld-Schreiben). Neue Wunschfelder in der Vorlage anlegen,
  NIE in einzelnen Hajk-Gruppen; Ausnahmen je Event entfernt die Stammleitung
  nachträglich in der Gruppe.
- **Settings**: Sichtbarkeit (intern), Auto-Accept usw. — Duplikate erben sie.
- **Organisatoren**: primär in der Extension-Konfiguration gepflegt (Mehrfachauswahl
  von Personen; Namen werden mitgespeichert, damit Leiter keine Personen-Leserechte
  brauchen). Nur ohne Konfiguration gelten die Organisator-Mitglieder der Vorlage
  (aktuell Irma Betz, Julia Timmalog) — Förderanträge!
- **Wichtig:** Die Vorlage darf AUSSCHLIESSLICH Organisatoren als Mitglieder
  enthalten. Können Leiter die Mitgliederliste nicht lesen, kopiert der Wizard
  beim Duplizieren ALLE Vorlagen-Mitglieder serverseitig mit — jedes weitere
  Mitglied würde also in jeder neuen Hajk-Gruppe landen. Pflege der Vorlage
  braucht keine Mitgliedschaft (Admin-Rechte genügen).

Die Vorlage braucht immer mindestens ein Organisator-Mitglied, sonst verweigert der
Assistent den Start (bewusste Validierung).

## Gruppen anlegen

Hajk-Gruppen entstehen ausschließlich über den Assistenten. Das technische Anlage-Recht
erlaubt auch manuelles Anlegen — bitte nicht nutzen; die Stammleitung prüft die
Hierarchie regelmäßig auf Ausreißer.

## Erweiterung um neue Aktionstypen (nach MVP)

Je neuer Typ (Tagesaktion, Übernachtung, Camp): eigene Vorlagengruppe anlegen und als
weiteres Feld in der Extension-Konfiguration ergänzen (z. B. `campTemplateGroupId` in
`src/wizard/settings.api.ts`); Namensschema `RR <Typ> <Team> <Datum>`.
