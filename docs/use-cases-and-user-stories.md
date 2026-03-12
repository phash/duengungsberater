# Use Cases & User Stories — Düngungsberater

Basierend auf LfL-Basisdaten Bayern. Stand: 2026-03-12.

---

## Inhaltsverzeichnis

1. [Nutzerrollen](#1-nutzerrollen)
2. [Systemkontext](#2-systemkontext)
3. [Use Cases — Landwirt](#3-use-cases--landwirt)
4. [Use Cases — Admin](#4-use-cases--admin)
5. [Use Cases — System (Offline & Sync)](#5-use-cases--system-offline--sync)
6. [User Stories](#6-user-stories)
7. [Akzeptanzkriterien (je Story)](#7-akzeptanzkriterien)

---

## 1. Nutzerrollen

| Rolle | Beschreibung | Zugriffsebene |
|---|---|---|
| **Landwirt** | Professioneller Landwirt (1–500+ ha), nutzt die App auf dem Feld, oft ohne Mobilfunk | Eigene Felder, Planungen, Empfehlungen (RLS) |
| **Admin** | Pflegt LfL-Referenzdaten und Produktkatalog | Alle Stammdaten (online-only) |
| **System** | Automatische Sync- und Caching-Logik | Keine direkte Benutzerinteraktion |

---

## 2. Systemkontext

```
Landwirt
  │
  ├─ Felder verwalten
  ├─ Anbauplanung erstellen
  └─ Düngeempfehlung berechnen (mit Korrekturfaktoren)
        │
        └─ Produkte mit Affiliate-Links

Admin
  │
  ├─ Kulturen pflegen (LfL Tab. 9a/9c)
  ├─ Nährstoffwerte pflegen (LfL Tab. 1a)
  ├─ Korrekturfaktoren pflegen (LfL Tab. 9f)
  └─ Düngerprodukte pflegen

System
  ├─ Stammdaten in IndexedDB cachen
  └─ Offline-Daten synchronisieren
```

---

## 3. Use Cases — Landwirt

### UC-L-01: Registrierung

**Akteur:** Landwirt (neu)
**Vorbedingung:** Keine bestehende Account
**Hauptszenario:**
1. Landwirt öffnet App, sieht Login-Seite
2. Landwirt gibt E-Mail und Passwort ein
3. Landwirt klickt „Registrieren"
4. System sendet Bestätigungs-E-Mail
5. Landwirt bestätigt E-Mail-Adresse
6. Landwirt meldet sich an → wird zu Feldliste weitergeleitet

**Ausnahmen:**
- E-Mail bereits vergeben → Fehlermeldung
- Passwort zu kurz (< 6 Zeichen) → Validierungsfehler

---

### UC-L-02: Anmeldung

**Akteur:** Landwirt (registriert)
**Vorbedingung:** Bestehender Account
**Hauptszenario:**
1. Landwirt gibt E-Mail und Passwort ein
2. Klickt „Anmelden"
3. System authentifiziert via Supabase Auth
4. Session wird in localStorage gespeichert
5. Weiterleitung zu `/felder`

**Ausnahmen:**
- Falsche Zugangsdaten → Fehlermeldung, kein Login
- Offline → Gespeicherte Session erlaubt Zugang ohne erneuten Login

---

### UC-L-03: Feld anlegen

**Akteur:** Landwirt
**Vorbedingung:** Angemeldet
**Hauptszenario:**
1. Landwirt öffnet Feldliste (`/felder`)
2. Klickt „+ Feld anlegen"
3. Drawer-Modal öffnet sich
4. Gibt Feldname und Größe (ha) ein
5. Klickt „Speichern"
6. Feld erscheint in der Liste

**Offline-Verhalten:** Feld wird mit `synced: false` in IndexedDB gespeichert, beim nächsten Online-Event synchronisiert.

**Ausnahmen:**
- Name leer → Validierungsfehler
- Größe ≤ 0 → Validierungsfehler

---

### UC-L-04: Feld bearbeiten

**Akteur:** Landwirt
**Vorbedingung:** Mindestens ein Feld vorhanden
**Hauptszenario:**
1. Landwirt klickt auf ein Feld in der Liste
2. Drawer-Modal öffnet sich (vorausgefüllt)
3. Ändert Name und/oder Größe
4. Klickt „Speichern"
5. Liste zeigt aktualisiertes Feld

**Offline-Verhalten:** Änderung wird lokal gespeichert, `synced: false` gesetzt.

---

### UC-L-05: Feld löschen

**Akteur:** Landwirt
**Vorbedingung:** Mindestens ein Feld vorhanden
**Hauptszenario:**
1. Landwirt öffnet Bearbeitungs-Drawer eines Feldes
2. Klickt „Löschen"
3. Bestätigungsdialog erscheint
4. Landwirt bestätigt
5. Feld und alle zugehörigen Planungen werden gelöscht

**Hinweis:** Löschen kaskadiert auf `field_crop_plans`.

---

### UC-L-06: Anbauplanung anlegen

**Akteur:** Landwirt
**Vorbedingung:** Mindestens ein Feld vorhanden, Kulturen in DB
**Hauptszenario:**
1. Landwirt öffnet ein Feld → Anbauplanungs-Ansicht
2. Klickt „+ Planung anlegen"
3. Wählt Kultur aus Dropdown
4. System füllt automatisch den Referenzertrag der Kultur aus
5. Passt Saison und erwarteten Ertrag ggf. an
6. Klickt „Speichern"
7. Planung erscheint in der Liste

**Offline-Verhalten:** `synced: false`, lokale Speicherung.

---

### UC-L-07: Anbauplanung bearbeiten

**Akteur:** Landwirt
**Vorbedingung:** Mindestens eine Planung vorhanden
**Hauptszenario:**
1. Landwirt klickt auf eine Planung
2. Ändert Kultur, Saison und/oder Ertrag
3. Klickt „Speichern"

---

### UC-L-08: Anbauplanung löschen

**Akteur:** Landwirt
**Hauptszenario:** Analog zu UC-L-05 — Drawer öffnen, Löschen bestätigen.

---

### UC-L-09: Düngeempfehlung berechnen

**Akteur:** Landwirt
**Vorbedingung:** Anbauplanung existiert
**Hauptszenario:**
1. Landwirt öffnet eine Planung → Empfehlungs-Ansicht
2. System berechnet automatisch beim Laden
3. Ergebnis zeigt je Nährstoff: kg/ha und kg gesamt

**Berechnungsformel:**
```
Bedarf (kg/ha) = max(0,
  Grundbedarf (kg/ha)
  + (Ertrag - Referenzertrag) × Ertragskorrektur
  + Σ aktive Korrekturfaktoren
)
Gesamt (kg) = Bedarf × Feldgröße (ha)
```

**Offline-Verhalten:** Berechnung läuft lokal, Ergebnis wird mit `calculated_offline: true` gespeichert.

---

### UC-L-10: Korrekturfaktoren anwenden

**Akteur:** Landwirt
**Vorbedingung:** Empfehlungs-Ansicht geöffnet
**Hauptszenario:**
1. Landwirt öffnet das Korrekturfaktoren-Panel
2. Wählt **Vorfrucht** (z.B. Winterraps → −10 kg N/ha)
3. Wählt **Zwischenfrucht** (z.B. Leguminosen → −10 kg N/ha)
4. Wählt **Humusgehalt** (z.B. > 4% → −20 kg N/ha)
5. System berechnet sofort neu und zeigt aktualisierte Werte
6. Auswahl wird in der Planung gespeichert

**Hinweis:** Alle drei Korrekturfaktoren sind optional und kumulieren sich.

---

### UC-L-11: Nährstoff-Aufschlüsselung einsehen

**Akteur:** Landwirt
**Vorbedingung:** Empfehlung berechnet
**Hauptszenario:**
1. Landwirt klickt auf einen Nährstoff in der Empfehlungs-Karte
2. Aufschlüsselung klappt auf:
   - Grundbedarf (kg/ha)
   - Ertragskorrektur (±kg/ha)
   - Korrekturfaktoren einzeln (z.B. „Vorfrucht (Winterraps): −10 kg N/ha")
   - Gesamtwert

---

### UC-L-12: Produktempfehlungen mit Affiliate-Links einsehen

**Akteur:** Landwirt
**Vorbedingung:** Empfehlung berechnet
**Hauptszenario:**
1. Empfehlungs-Ansicht zeigt passende Düngerprodukte
2. Für jeden Nährstoff: Produkt mit höchstem Nährstoffanteil
3. Anzeige: Produktname, benötigte Menge (kg/ha und kg gesamt), Shop-Name
4. Landwirt klickt auf Produkt-Link → öffnet Partner-Shop

---

### UC-L-13: Abmelden

**Akteur:** Landwirt
**Hauptszenario:**
1. Landwirt öffnet Profil-Ansicht (`/profil`)
2. Klickt „Abmelden"
3. Session wird gelöscht, Weiterleitung zu `/login`
4. IndexedDB-Daten bleiben erhalten (für nächsten Login)

---

## 4. Use Cases — Admin

### UC-A-01: Kultur anlegen

**Akteur:** Admin
**Vorbedingung:** Als Admin angemeldet, `/admin` geöffnet
**Hauptszenario:**
1. Admin öffnet Tab „Kulturen"
2. Klickt „+ Kultur anlegen"
3. Füllt Formular aus:
   - Name (de)
   - Kategorie (Getreide, Hackfrüchte, etc.)
   - Saat- und Erntezeitraum (Monate 1–12)
   - Referenzertrag (dt/ha)
   - Nmin-Tiefe (0 / 60 / 90 cm)
4. Klickt „Speichern"

---

### UC-A-02: Kultur bearbeiten / löschen

**Hinweis:** Löschen kaskadiert auf `crop_nutrient_demands`.

---

### UC-A-03: Nährstoffwert anlegen

**Akteur:** Admin
**Hauptszenario:**
1. Tab „Nährstoffwerte" öffnen
2. „+ Nährstoffwert anlegen" klicken
3. Formular ausfüllen:
   - Kultur (Dropdown)
   - Nährstofftyp (Dropdown: N, P₂O₅, K₂O, MgO, S, …)
   - Grundbedarf (kg/ha)
   - Referenzertrag (dt/ha)
   - Ertragskorrektur (kg pro dt Ertragsdifferenz, kann negativ sein)
   - Quelle: LfL oder Benutzerwert
4. Speichern

**Hinweis:** Kombination Kultur + Nährstofftyp muss eindeutig sein. Benutzerwerte (`source: 'user'`) haben Vorrang vor LfL-Werten.

---

### UC-A-04: Nährstoffwert bearbeiten / löschen

Analog zu UC-A-02.

---

### UC-A-05: Düngerprodukt anlegen

**Akteur:** Admin
**Hauptszenario:**
1. Tab „Produkte" öffnen
2. „+ Produkt anlegen" klicken
3. Formular:
   - Name (Pflichtfeld)
   - Nährstoffgehalte: N%, P₂O₅%, K₂O%, MgO%, S% (mindestens einer > 0)
   - Form: Mineralisch / Organisch
   - Affiliate-URL (Pflichtfeld, valide HTTP(S)-URL)
   - Shop-Name (z.B. „dünger-shop.de")
   - Aktiv: Ja/Nein (nur aktive Produkte werden Landwirten angezeigt)
4. Speichern

---

### UC-A-06: Düngerprodukt aktivieren / deaktivieren

**Akteur:** Admin
**Hauptszenario:**
1. Produkt in der Liste auswählen
2. „Aktiv"-Schalter umschalten
3. Speichern → Produkt erscheint nicht mehr / wieder in Empfehlungen

---

### UC-A-07: Korrektur anlegen

**Akteur:** Admin
**Vorbedingung:** Nährstofftypen vorhanden
**Hauptszenario:**
1. Tab „Korrekturen" öffnen
2. „+ Korrektur anlegen" klicken
3. Formular:
   - Bezeichnung (z.B. „Winterraps")
   - Typ: Vorfrucht / Zwischenfrucht / Humus
   - Sortierreihenfolge
   - Nährstoff-Zeilen (dynamisch): je Nährstoff + Wert (kg/ha, kann negativ)
4. Speichern → erstellt `correction` + `correction_values` in einer Operation

**Mindestanforderung:** Mindestens ein Nährstoffwert muss angegeben sein.

---

### UC-A-08: Korrektur bearbeiten / löschen

**Hinweis:** Löschen kaskadiert auf `correction_values`.

---

## 5. Use Cases — System (Offline & Sync)

### UC-S-01: Stammdaten cachen (Login)

**Trigger:** Erfolgreicher Login, Online
**Ablauf:**
1. System lädt Kulturen, Nährstofftypen, Nährstoffbedarfe, Korrekturen, Produkte von Supabase
2. Speichert alles in IndexedDB (Dexie.js)
3. Bei leerem IndexedDB und Offline-Betrieb: Fallback auf `src/constants/` Seed-Daten

---

### UC-S-02: Offline-Daten synchronisieren

**Trigger:** `navigator.online`-Event (Gerät kommt wieder ins Netz)
**Ablauf:**
1. System fragt IndexedDB nach Einträgen mit `synced: false`
2. Sendet Upsert-Requests an Supabase (Felder, Planungen, Empfehlungen)
3. Setzt `synced: true` nach Erfolg
4. Aktualisiert IndexedDB mit Server-Antworten

**Konfliktlösung:** Last-Write-Wins (Supabase-Timestamp)

---

### UC-S-03: Service Worker / PWA-Installation

**Trigger:** Nutzer öffnet App im Browser
**Ablauf:**
1. Service Worker registriert sich
2. App-Shell (HTML, JS, CSS) wird gecacht
3. Browser zeigt „App installieren"-Banner
4. Nach Installation: App startet offline aus dem Cache

---

## 6. User Stories

### Authentifizierung

| ID | Als … | möchte ich … | damit … |
|---|---|---|---|
| US-01 | Landwirt | mich per E-Mail registrieren | ich einen persönlichen Account habe |
| US-02 | Landwirt | mich anmelden | ich meine Felder und Planungen sehe |
| US-03 | Landwirt | angemeldet bleiben | ich die App auch nach Schließen ohne erneuten Login nutzen kann |
| US-04 | Landwirt | mich abmelden | andere Personen keinen Zugriff auf meine Daten haben |

### Feldverwaltung

| ID | Als … | möchte ich … | damit … |
|---|---|---|---|
| US-05 | Landwirt | ein neues Feld anlegen | ich es in der Anbauplanung verwenden kann |
| US-06 | Landwirt | Feldname und -größe bearbeiten | meine Daten immer aktuell sind |
| US-07 | Landwirt | ein Feld löschen | ich meinen Datenbestand sauber halte |
| US-08 | Landwirt | alle meine Felder auf einen Blick sehen | ich schnell navigieren kann |
| US-09 | Landwirt | ein Feld auch offline anlegen | ich auf dem Feld ohne Mobilfunk arbeiten kann |

### Anbauplanung

| ID | Als … | möchte ich … | damit … |
|---|---|---|---|
| US-10 | Landwirt | für ein Feld eine Anbauplanung mit Kultur, Saison und Ertrag anlegen | die Düngeempfehlung berechnet werden kann |
| US-11 | Landwirt | den Referenzertrag automatisch vorausgefüllt bekommen | ich Zeit spare |
| US-12 | Landwirt | den erwarteten Ertrag anpassen | die Empfehlung mein konkretes Feld widerspiegelt |
| US-13 | Landwirt | eine Planung bearbeiten oder löschen | ich Fehler korrigieren kann |
| US-14 | Landwirt | mehrere Planungen pro Feld anlegen | ich verschiedene Jahre oder Kulturen vergleichen kann |

### Düngeempfehlung

| ID | Als … | möchte ich … | damit … |
|---|---|---|---|
| US-15 | Landwirt | die Düngeempfehlung automatisch nach dem Öffnen sehen | ich nicht erst einen Button klicken muss |
| US-16 | Landwirt | den Nährstoffbedarf in kg/ha und kg gesamt sehen | ich sowohl je Hektar als auch für das ganze Feld planen kann |
| US-17 | Landwirt | die Aufschlüsselung je Nährstoff einsehen | ich die Berechnung nachvollziehen kann |
| US-18 | Landwirt | Vorfrucht, Zwischenfrucht und Humusgehalt als Korrekturfaktoren wählen | die Empfehlung meine Feldsituation genau abbildet |
| US-19 | Landwirt | die Empfehlung sofort nach Korrekturauswahl aktualisiert sehen | ich verschiedene Szenarien schnell vergleichen kann |
| US-20 | Landwirt | passende Düngerprodukte mit Mengenangabe sehen | ich weiß, was ich bestellen muss |
| US-21 | Landwirt | direkt zum Produkt im Online-Shop wechseln | ich schnell bestellen kann |
| US-22 | Landwirt | die Empfehlung auch offline berechnen | ich auf dem Feld ohne Netz arbeiten kann |

### Admin — Stammdaten

| ID | Als … | möchte ich … | damit … |
|---|---|---|---|
| US-23 | Admin | Kulturen anlegen und bearbeiten | neue LfL-Empfehlungen abgebildet werden |
| US-24 | Admin | Nährstoffbedarfe je Kultur und Nährstofftyp pflegen | die Empfehlungen korrekt berechnet werden |
| US-25 | Admin | Korrekturfaktoren (Vorfrucht, Zwischenfrucht, Humus) verwalten | Landwirte realitätsnahe Empfehlungen erhalten |
| US-26 | Admin | eigene Nährstoffwerte als Benutzerwert anlegen | LfL-Werte bei Bedarf überschrieben werden |
| US-27 | Admin | Düngerprodukte mit Nährstoffgehalten und Affiliate-Links pflegen | Landwirte konkrete Kaufempfehlungen sehen |
| US-28 | Admin | Produkte aktivieren und deaktivieren | veraltete oder ausverkaufte Produkte nicht mehr angezeigt werden |

---

## 7. Akzeptanzkriterien

### US-05 — Feld anlegen

- [ ] Formular enthält Felder für Name (Text) und Größe (ha)
- [ ] Name darf nicht leer sein
- [ ] Größe muss > 0 sein
- [ ] Nach Speichern erscheint das Feld in der Liste
- [ ] Bei Offline-Betrieb wird das Feld lokal gespeichert und beim nächsten Online-Event synchronisiert
- [ ] Fehlermeldung bei Speicherfehler sichtbar

### US-10 — Anbauplanung anlegen

- [ ] Kultur-Dropdown zeigt alle verfügbaren Kulturen
- [ ] Auswahl einer Kultur füllt Referenzertrag automatisch aus
- [ ] Ertrag ist editierbar (kann vom Referenzwert abweichen)
- [ ] Saison-Jahr ist editierbar, default = aktuelles Jahr
- [ ] Nach Speichern erscheint die Planung in der Liste
- [ ] Offline-Betrieb: lokale Speicherung, Sync beim nächsten Online-Event

### US-15 — Düngeempfehlung anzeigen

- [ ] Empfehlung wird beim Öffnen der Ansicht automatisch berechnet (kein Button)
- [ ] Ergebnis zeigt alle relevanten Nährstofftypen mit Werten in kg/ha und kg gesamt
- [ ] Zahlen im deutschen Format (Komma als Dezimaltrennzeichen, Einheit sichtbar)
- [ ] Berechnung ist korrekt gemäß Formel: `max(0, Grundbedarf + Ertragskorrektur + Korrekturen)`

### US-18 — Korrekturfaktoren anwenden

- [ ] Panel mit drei Dropdowns (Vorfrucht, Zwischenfrucht, Humus) vorhanden
- [ ] Default: kein Korrekturfaktor gewählt
- [ ] Auswahl aktualisiert Empfehlung sofort (kein Reload)
- [ ] Auswahl wird in der Planung persistiert (bleibt nach Reload erhalten)
- [ ] Korrekturen kumulieren sich korrekt

### US-22 — Empfehlung offline berechnen

- [ ] Berechnung funktioniert ohne Netzverbindung
- [ ] Empfehlung wird mit `calculated_offline: true` gespeichert
- [ ] Stammdaten (Kulturen, Nährstoffe, Korrekturen) aus IndexedDB oder Fallback-Konstanten verfügbar

### US-23 — Kulturen verwalten (Admin)

- [ ] Liste zeigt alle Kulturen mit Kategorie, Erntemonat und Referenzertrag
- [ ] Neue Kultur kann mit allen Pflichtfeldern angelegt werden
- [ ] Bearbeiten öffnet vorausgefülltes Formular
- [ ] Löschen entfernt Kultur und alle zugehörigen Nährstoffbedarfe
- [ ] Admin-Bereich nicht erreichbar ohne Admin-Rolle (Redirect)

### US-27 — Produkte verwalten (Admin)

- [ ] Mindestens ein Nährstoffgehalt > 0 Pflicht
- [ ] Affiliate-URL wird als valide HTTP(S)-URL validiert
- [ ] Nur aktive Produkte erscheinen in Landwirt-Empfehlungen
- [ ] Deaktivieren ohne Löschen möglich

---

## Abgrenzung (Out of Scope — MVP)

| Feature | Geplant für |
|---|---|
| Nmin-Messwerte aus Bodenanalyse | Stufe 3 |
| Bodentyp-Integration | Stufe 3 |
| PDF-Export der Empfehlung | Offen |
| Kartendarstellung der Felder | Offen |
| Mehrsprachigkeit | Offen |
| Push-Benachrichtigungen | Offen |
| Betriebsvergleich / Statistiken | Offen |
