<template>
  <div class="min-h-screen bg-parchment">
    <!-- Nav -->
    <nav class="border-b border-stone-200 bg-parchment">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <router-link
          to="/"
          class="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-700"
          data-testid="hilfe-back-link"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
          </svg>
          Zurück
        </router-link>
        <div class="flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-field-600"
          >
            <svg
              class="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M7 20h10" /><path d="M12 20v-6" />
              <path
                d="M12 14c-3 0-6-3-6-8 4 0 6 4 6 8z"
                fill="currentColor"
                opacity="0.25"
              />
              <path
                d="M12 14c3 0 6-3 6-8-4 0-6 4-6 8z"
                fill="currentColor"
                opacity="0.25"
              />
            </svg>
          </div>
          <span class="font-display text-sm font-semibold text-stone-800"
            >Düngungsberater</span
          >
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="mx-auto max-w-2xl px-5 py-10">
      <h1 class="font-display text-3xl font-semibold text-stone-900">
        Hilfe &amp; Anleitung
      </h1>
      <p class="mt-2 text-sm text-stone-400">So nutzt du den Düngungsberater</p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-stone-600">
        <!-- Überblick -->
        <section class="rounded-xl border border-field-200 bg-field-50 p-5">
          <h2 class="font-display text-base font-semibold text-field-800">
            Kurzübersicht
          </h2>
          <p class="mt-2 text-field-700">
            Der Düngungsberater berechnet den Nährstoffbedarf deiner Felder nach den
            offiziellen LfL-Basisdaten der Bayerischen Landesanstalt für Landwirtschaft.
            In vier Schritten kommst du zur Empfehlung:
            <strong>Feld anlegen → Anbauplanung erstellen → Empfehlung erhalten → Düngerprodukt wählen.</strong>
          </p>
        </section>

        <!-- 1. Registrierung -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            1. Registrierung &amp; Anmeldung
          </h2>
          <p class="mt-3">
            Erstelle einen kostenlosen Account mit deiner E-Mail-Adresse. Nach der
            Registrierung erhältst du eine Bestätigungsmail — klicke den Link darin,
            um dein Konto zu aktivieren. Danach kannst du dich jederzeit anmelden.
          </p>
          <p class="mt-2">
            <strong class="text-stone-700">Passwort vergessen?</strong> Auf der
            Login-Seite findest du die Funktion „Passwort vergessen". Du bekommst einen
            Link per E-Mail, über den du ein neues Passwort setzen kannst.
          </p>
        </section>

        <!-- 2. Felder -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            2. Felder anlegen
          </h2>
          <p class="mt-3">
            Nach dem Login landest du auf der Feldübersicht. Hier siehst du all deine
            Felder als Liste und auf einer Karte (OpenStreetMap). Felder kannst du auf
            zwei Wegen anlegen:
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">Manuell</h3>
          <p class="mt-1">
            Tippe auf <strong class="text-stone-700">„+ Feld anlegen"</strong> und
            gib Feldname und Fläche (ha) ein. Optional kannst du auch
            Nmin-Bodenproben-Werte für die drei Bodenschichten (0–30, 30–60, 60–90 cm)
            eintragen.
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">Aus iBalis importieren</h3>
          <p class="mt-1">
            Exportiere deine Felddaten aus dem bayerischen Agrardatennetzwerk
            <strong class="text-stone-700">iBalis</strong> als
            <strong class="text-stone-700">GeoPackage (.gpkg)</strong> oder
            <strong class="text-stone-700">Shapefile (.zip)</strong>.
            Tippe dann auf das Import-Symbol und lade die Datei hoch. Der Düngungsberater
            liest automatisch Feldnamen, Flächen und Geometrien aus. Deine Feldgrenzen
            werden als Polygone auf der Karte angezeigt.
          </p>
          <div class="mt-3 rounded-lg border border-wheat-200 bg-wheat-50 p-3">
            <p class="text-xs text-wheat-700">
              <strong class="text-wheat-800">Tipp:</strong> Du kannst einzelne oder alle
              Feldstücke aus dem Export übernehmen. Bereits vorhandene Felder werden
              automatisch erkannt und übersprungen.
            </p>
          </div>
        </section>

        <!-- 3. Anbauplanung -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            3. Anbauplanung erstellen
          </h2>
          <p class="mt-3">
            Tippe auf ein Feld, um die Anbauplanungen zu sehen. Mit
            <strong class="text-stone-700">„+ Planung anlegen"</strong> erstellst du
            eine neue Planung:
          </p>
          <ul class="mt-3 space-y-2 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span><strong class="text-stone-700">Kultur wählen</strong> — z.B. Winterweizen, Silomais, Kartoffeln</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span><strong class="text-stone-700">Saison</strong> — Erntejahr festlegen</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span><strong class="text-stone-700">Ertragsziel</strong> — erwarteter Ertrag in dt/ha (der LfL-Referenzwert wird vorgeschlagen)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span><strong class="text-stone-700">Korrekturen</strong> — Vorfrucht, Zwischenfrucht und Humusgehalt auswählen (optional)</span>
            </li>
          </ul>
        </section>

        <!-- 4. Empfehlung -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            4. Nährstoffempfehlung
          </h2>
          <p class="mt-3">
            Nach dem Speichern der Planung berechnet der Düngungsberater den Nährstoffbedarf
            für fünf Nährstoffe:
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded bg-field-100 text-xs font-bold text-field-700">N</span>
              <span class="text-xs text-stone-600">Stickstoff</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded bg-field-100 text-xs font-bold text-field-700">P₂O₅</span>
              <span class="text-xs text-stone-600">Phosphat</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded bg-field-100 text-xs font-bold text-field-700">K₂O</span>
              <span class="text-xs text-stone-600">Kalium</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded bg-wheat-50 text-xs font-bold text-wheat-600">MgO</span>
              <span class="text-xs text-stone-600">Magnesium</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded bg-wheat-50 text-xs font-bold text-wheat-600">S</span>
              <span class="text-xs text-stone-600">Schwefel</span>
            </span>
          </div>
          <p class="mt-3">
            Die Berechnung berücksichtigt automatisch:
          </p>
          <ul class="mt-2 space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>LfL-Grundbedarf der gewählten Kultur</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Ertragskorrektur (Differenz zwischen Ertragsziel und Referenzertrag)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Korrekturfaktoren (Vorfrucht, Zwischenfrucht, Humus)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Nmin-Bodenprobe (falls beim Feld eingetragen)</span>
            </li>
          </ul>
          <p class="mt-3">
            Zu jedem Nährstoff werden passende
            <strong class="text-stone-700">Düngerprodukte</strong> mit exakter
            Mengenberechnung (kg/ha und kg gesamt) vorgeschlagen.
          </p>
        </section>

        <!-- 5. Korrekturfaktoren -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            5. Korrekturfaktoren verstehen
          </h2>
          <p class="mt-3">
            Korrekturfaktoren passen den Nährstoffbedarf an die tatsächlichen
            Standortbedingungen an:
          </p>
          <div class="mt-3 space-y-3">
            <div class="rounded-lg border border-stone-200 bg-white p-3">
              <p class="font-semibold text-stone-700">Vorfrucht</p>
              <p class="mt-1 text-xs text-stone-500">
                Was vor der aktuellen Kultur angebaut wurde. Leguminosen (z.B. Klee, Erbsen)
                hinterlassen Stickstoff im Boden → der N-Bedarf sinkt.
              </p>
            </div>
            <div class="rounded-lg border border-stone-200 bg-white p-3">
              <p class="font-semibold text-stone-700">Zwischenfrucht</p>
              <p class="mt-1 text-xs text-stone-500">
                Zwischen den Hauptkulturen angebaute Pflanzen (z.B. Senf, Phacelia).
                Sie binden Nährstoffe und geben sie an die Folgekultur ab.
              </p>
            </div>
            <div class="rounded-lg border border-stone-200 bg-white p-3">
              <p class="font-semibold text-stone-700">Humusgehalt</p>
              <p class="mt-1 text-xs text-stone-500">
                Humusreiche Böden setzen mehr Stickstoff frei (Mineralisierung).
                Bei hohem Humusgehalt wird der N-Bedarf entsprechend reduziert.
              </p>
            </div>
            <div class="rounded-lg border border-stone-200 bg-white p-3">
              <p class="font-semibold text-stone-700">Nmin-Bodenprobe</p>
              <p class="mt-1 text-xs text-stone-500">
                Der im Boden bereits vorhandene mineralische Stickstoff (Nmin) wird vom
                N-Bedarf abgezogen. Eingabe für bis zu drei Bodenschichten: 0–30, 30–60
                und 60–90 cm Tiefe.
              </p>
            </div>
          </div>
        </section>

        <!-- 6. Offline -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            6. Offline arbeiten
          </h2>
          <p class="mt-3">
            Der Düngungsberater ist eine <strong class="text-stone-700">Progressive Web
            App (PWA)</strong> und funktioniert auch ohne Internet. Beim ersten Aufruf
            werden alle Kulturdaten und Nährstoffwerte auf deinem Gerät gespeichert.
          </p>
          <ul class="mt-3 space-y-2 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>Felder und Planungen können offline erstellt und bearbeitet werden</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>Änderungen werden automatisch synchronisiert, sobald du wieder online bist</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>Du kannst die App auf dem Startbildschirm installieren (Browser → „Zum Startbildschirm hinzufügen")</span>
            </li>
          </ul>
        </section>

        <!-- 7. Eigene Werte -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            7. Eigene Nährstoffwerte pflegen
          </h2>
          <p class="mt-3">
            Unter <strong class="text-stone-700">Profil → Eigene Nährstoffwerte</strong>
            kannst du die LfL-Standardwerte für bestimmte Kulturen und Nährstoffe mit
            eigenen Werten überschreiben. Das ist nützlich, wenn du z.B. durch langjährige
            Erfahrung weißt, dass dein Standort einen anderen Bedarf hat.
          </p>
          <p class="mt-2">
            Deine eigenen Werte haben immer Vorrang vor den LfL-Standardwerten und werden
            in der Empfehlung entsprechend gekennzeichnet.
          </p>
        </section>

        <!-- 8. Profil -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            8. Profil &amp; Account
          </h2>
          <p class="mt-3">
            Im Bereich <strong class="text-stone-700">Profil</strong> findest du:
          </p>
          <ul class="mt-2 space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Deine E-Mail-Adresse und Account-Informationen</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Eigene Nährstoffwerte verwalten</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Account löschen — entfernt alle deine Daten unwiderruflich</span>
            </li>
          </ul>
        </section>

        <!-- Kontakt -->
        <section class="rounded-xl border border-stone-200 bg-white p-5">
          <h2 class="font-display text-base font-semibold text-stone-800">
            Noch Fragen?
          </h2>
          <p class="mt-2">
            Bei Problemen oder Fragen erreichst du uns per E-Mail:
            <a
              href="mailto:projekt@phash.de"
              class="font-medium text-field-700 underline hover:text-field-800"
            >projekt@phash.de</a>
          </p>
          <p class="mt-2">
            Der Düngungsberater ist ein
            <a
              href="https://github.com/phash/duengungsberater"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-field-700 underline hover:text-field-800"
            >Open-Source-Projekt auf GitHub</a>.
            Feedback und Verbesserungsvorschläge sind willkommen.
          </p>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-stone-200 bg-parchment-dark py-8">
      <div class="mx-auto max-w-2xl px-5">
        <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div class="flex items-center gap-2 text-sm text-stone-500">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-lg bg-field-600"
            >
              <svg
                class="h-3.5 w-3.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 20h10" /><path d="M12 20v-6" />
                <path
                  d="M12 14c-3 0-6-3-6-8 4 0 6 4 6 8z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M12 14c3 0 6-3 6-8-4 0-6 4-6 8z"
                  fill="currentColor"
                  opacity="0.25"
                />
              </svg>
            </div>
            <span>Düngungsberater</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-stone-400">
            <router-link to="/impressum" class="hover:text-stone-600"
              >Impressum</router-link
            >
            <router-link to="/datenschutz" class="hover:text-stone-600"
              >Datenschutz</router-link
            >
            <router-link to="/agb" class="hover:text-stone-600">AGB</router-link>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Hilfe — keine Logik erforderlich
</script>
