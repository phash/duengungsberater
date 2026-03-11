# ADR-001: Supabase als Backend

## Status
Accepted

## Kontext
Die App benötigt Authentifizierung, eine relationale Datenbank, Row Level Security und Echtzeit-Sync. Das Team ist klein (1–2 Entwickler), es soll kein eigener Backend-Server betrieben werden.

## Entscheidung
Wir verwenden **Supabase** als Backend-as-a-Service.

## Begründung
- PostgreSQL mit Row Level Security (RLS) — jeder Landwirt sieht nur eigene Daten
- Eingebaute Authentifizierung (E-Mail/Passwort)
- REST-API und Realtime-WebSocket out-of-the-box
- Kostenloser Tier für MVP ausreichend
- Kein eigener Server nötig

## Konsequenzen
- Vendor Lock-in auf Supabase-API (mitigiert durch standardisiertes PostgreSQL)
- Alle Datenbankaufrufe über `services/`-Schicht abstrahiert
- RLS-Policies müssen sorgfältig gepflegt werden
