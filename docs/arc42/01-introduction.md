# 1. Einführung und Ziele

## Aufgabenstellung

Der **Düngungsberater** ist eine Progressive Web App (PWA) für professionelle Landwirte (Betriebe 1–500+ ha) in Bayern. Die App berechnet den Nährstoffbedarf auf Basis der LfL-Basisdaten (Bayerische Landesanstalt für Landwirtschaft) und empfiehlt konkrete Düngerprodukte mit Affiliate-Links.

## Qualitätsziele

| Priorität | Qualitätsziel | Beschreibung |
|---|---|---|
| 1 | Offline-Fähigkeit | Landwirte arbeiten häufig auf dem Feld ohne Mobilfunkempfang. Kernfunktionen (Felder, Anbauplanung, Berechnung) müssen offline funktionieren. |
| 2 | Korrektheit | Berechnungen basieren auf den amtlichen LfL-Basisdaten. Falsche Düngeempfehlungen können wirtschaftlichen Schaden und Umweltbelastung verursachen. |
| 3 | Benutzerfreundlichkeit | Mobile-first, deutschsprachig, schnelle Dateneingabe. Landwirte sind keine IT-Spezialisten. |
| 4 | Erweiterbarkeit | Neue Kulturen, Nährstofftypen und Korrekturfaktoren müssen ohne Code-Änderung pflegbar sein (Admin-Bereich). |

## Stakeholder

| Rolle | Erwartung |
|---|---|
| Landwirt (Endnutzer) | Schnelle, verlässliche Düngeempfehlung, auch offline |
| Betreiber | Monetarisierung über Affiliate-Links zu Dünger-Shops |
| Admin | Pflege der LfL-Daten und Produkte über Web-Oberfläche |
