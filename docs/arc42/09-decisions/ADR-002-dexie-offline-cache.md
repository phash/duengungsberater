# ADR-002: Dexie.js für Offline-Cache

## Status
Accepted

## Kontext
Landwirte arbeiten häufig auf dem Feld ohne Mobilfunkempfang. Kernfunktionen (Felder anzeigen, Anbauplanung anlegen, Nährstoffberechnung) müssen offline funktionieren. Dafür werden Stammdaten und Nutzerdaten lokal gecacht.

## Entscheidung
Wir verwenden **Dexie.js** als IndexedDB-Wrapper für den lokalen Offline-Cache.

## Begründung
- Einfache, typsichere API für IndexedDB
- Unterstützt Versionierung und Migrationen
- Bewährt in PWA-Projekten
- Geringer Bundle-Size-Overhead
- Kein zusätzlicher Server-Prozess nötig

## Konsequenzen
- Stammdaten (Kulturen, Nährstoffbedarfe, Produkte) werden beim Login in IndexedDB gecacht
- Offline erstellte Daten werden mit `synced: false` markiert
- Sync-Logik beim `online`-Event muss Konflikte behandeln (Last-Write-Wins für MVP)
- IndexedDB-Speicherlimit des Browsers beachten (praktisch kein Problem bei den Datenmengen)
