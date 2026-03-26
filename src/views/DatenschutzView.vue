<template>
  <div class="min-h-screen bg-parchment">
    <!-- Nav -->
    <nav class="border-b border-stone-200 bg-parchment">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <router-link
          to="/"
          class="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-700"
          data-testid="datenschutz-back-link"
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
        Datenschutzerklärung
      </h1>
      <p class="mt-2 text-sm text-stone-400">Stand: März 2026</p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-stone-600">
        <!-- 1. Verantwortlicher -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            1. Verantwortlicher
          </h2>
          <p class="mt-3">
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <div class="mt-3 space-y-0.5">
            <p class="font-medium text-stone-700">Manuel Rödig</p>
            <p>Marktstraße 23</p>
            <p>91171 Greding</p>
            <p class="mt-2">
              E-Mail:
              <a
                href="mailto:info@mr-development.de"
                class="text-field-700 underline hover:text-field-800"
                >info@mr-development.de</a
              >
            </p>
          </div>
        </section>

        <!-- 2. Hosting -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            2. Hosting
          </h2>
          <p class="mt-3">
            Diese Anwendung wird auf einem virtuellen Server der IONOS SE
            gehostet:
          </p>
          <div class="mt-3 space-y-0.5">
            <p class="font-medium text-stone-700">IONOS SE</p>
            <p>Elgendorfer Str. 57</p>
            <p>56410 Montabaur</p>
          </div>
          <p class="mt-3">
            Die Datenbank (PostgreSQL) läuft auf einem eigenen VPS bei IONOS mit
            Serverstandort Deutschland. Es findet keine Weitergabe der Daten an
            Dritte statt.
          </p>
          <p class="mt-3">
            Der Abschluss eines Auftragsverarbeitungsvertrags (AVV) mit IONOS
            liegt vor. Die Verarbeitung erfolgt ausschließlich auf Servern in der
            Europäischen Union.
          </p>
        </section>

        <!-- 3. Erhobene Daten und Zweck -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            3. Erhobene Daten und Verarbeitungszweck
          </h2>

          <h3 class="mt-4 font-semibold text-stone-700">
            3.1 Registrierung und Authentifizierung
          </h3>
          <p class="mt-2">
            Zur Nutzung der Anwendung ist eine Registrierung erforderlich. Dabei
            wird ausschließlich Ihre
            <strong class="text-stone-700">E-Mail-Adresse</strong> erhoben. Die
            Verarbeitung erfolgt zur Durchführung des Nutzungsvertrags (Art. 6
            Abs. 1 lit. b DSGVO).
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">
            3.2 Betriebsdaten (Felddaten und Anbauplanungen)
          </h3>
          <p class="mt-2">
            Für die Kernfunktion der Anwendung — die Düngeplanung — speichern wir
            die von Ihnen eingegebenen Betriebsdaten:
          </p>
          <ul class="mt-2 space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Felddaten (Feldname, Fläche in ha, optionale Feldgrenzen als
                Geodaten)</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Anbauplanungen (Kultur, Saison, Ertragsziel, Korrekturfaktoren)</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>Berechnete Nährstoffempfehlungen</span>
            </li>
          </ul>
          <p class="mt-2">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            Die Daten werden ausschließlich für die Bereitstellung der
            Düngeplanungsfunktion verwendet.
          </p>
        </section>

        <!-- 4. Cookies -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            4. Cookies und lokale Speicherung
          </h2>
          <p class="mt-3">
            Diese Anwendung verwendet ausschließlich technisch notwendige
            Cookies:
          </p>
          <ul class="mt-2 space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                ><strong class="text-stone-700">Session-Cookie / Auth-Token:</strong>
                zur Aufrechterhaltung der Anmeldung</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                ><strong class="text-stone-700">IndexedDB (Offline-Cache):</strong>
                lokale Zwischenspeicherung von Kulturdaten und Plänen für den
                Offline-Betrieb</span
              >
            </li>
          </ul>
        </section>

        <!-- 4b. Webanalyse (Matomo) -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            5. Webanalyse (Matomo)
          </h2>
          <p class="mt-3">
            Diese Website verwendet <strong class="text-stone-700">Matomo</strong>,
            eine Open-Source-Software zur statistischen Auswertung der Besucherzugriffe.
            Matomo wird auf Servern in Deutschland betrieben (selbst gehostet). Die
            erhobenen Daten werden <strong class="text-stone-700">nicht an Dritte
            weitergegeben</strong>.
          </p>
          <p class="mt-2">
            Matomo verwendet Cookies, die auf Ihrem Computer gespeichert werden und
            die eine Analyse der Benutzung der Website ermöglichen. Die durch die
            Cookies erzeugten Informationen werden ausschließlich auf unserem Server
            gespeichert. Die IP-Adresse wird vor der Speicherung anonymisiert.
          </p>
          <p class="mt-2">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
            der statistischen Analyse des Nutzerverhaltens zur Optimierung des
            Angebots).
          </p>
        </section>

        <!-- 6. Google Fonts -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            6. Google Fonts
          </h2>
          <p class="mt-3">
            Diese Anwendung verwendet Google Fonts (Schriftarten „Fraunces" und
            „Outfit"), die über das Google Fonts CDN geladen werden. Beim Aufruf
            der Seite wird eine Verbindung zu Servern von Google LLC (1600
            Amphitheatre Parkway, Mountain View, CA 94043, USA) hergestellt.
            Dabei kann Ihre IP-Adresse an Google übermittelt werden.
          </p>
          <p class="mt-3">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse an einer einheitlichen Darstellung). Google LLC ist unter
            dem EU-US Data Privacy Framework zertifiziert. Weitere Informationen
            finden Sie in der
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              class="text-field-700 underline hover:text-field-800"
              >Datenschutzerklärung von Google</a
            >.
          </p>
        </section>

        <!-- 6. iBalis -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            7. iBalis-Anbindung
          </h2>
          <p class="mt-3">
            Bei Nutzung der iBalis-Importfunktion werden Felddaten aus dem
            bayerischen Agrardatennetzwerk iBalis (betrieben vom Bayerischen
            Staatsministerium für Ernährung, Landwirtschaft, Forsten und Tourismus
            — StMELF) abgerufen. Die Authentifizierung erfolgt direkt beim StMELF
            über das OAuth2-Verfahren.
          </p>
          <p class="mt-3">
            Ihre iBalis-Zugangsdaten (Benutzername und Passwort) werden von dieser
            Anwendung weder gespeichert noch verarbeitet. Die Authentifizierung
            findet ausschließlich zwischen Ihrem Browser und dem StMELF-Server
            statt. Nach erfolgter Autorisierung werden nur die Felddaten
            (Geometrien, Flächenangaben, Feldbezeichnungen) in Ihren Account
            importiert.
          </p>
        </section>

        <!-- 7. SSL/TLS -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            8. SSL/TLS-Verschlüsselung
          </h2>
          <p class="mt-3">
            Diese Anwendung nutzt aus Sicherheitsgründen und zum Schutz der
            Übertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung.
            Eine verschlüsselte Verbindung erkennen Sie daran, dass die
            Adresszeile des Browsers von „http://" auf „https://" wechselt.
          </p>
        </section>

        <!-- 8. Datenlöschung und Speicherdauer -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            9. Datenlöschung und Speicherdauer
          </h2>
          <p class="mt-3">
            Personenbezogene Daten werden gelöscht oder gesperrt, sobald der
            Zweck der Speicherung entfällt oder Sie Ihren Account löschen. Die
            Account-Löschung kann jederzeit innerhalb der App unter
            <strong class="text-stone-700">Profil → Account löschen</strong>
            vorgenommen werden. Alle gespeicherten Daten (E-Mail-Adresse,
            Felddaten, Anbauplanungen) werden dabei sofort und unwiderruflich
            entfernt.
          </p>
          <p class="mt-3">
            Gesetzliche Aufbewahrungsfristen, die einer Löschung entgegenstehen,
            bestehen bei dieser Anwendung nicht.
          </p>
        </section>

        <!-- 9. Keine Weitergabe -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            10. Keine Weitergabe an Dritte
          </h2>
          <p class="mt-3">
            Ihre personenbezogenen Daten werden nicht an Dritte weitergegeben,
            verkauft oder vermietet. Eine Weitergabe erfolgt ausschließlich, wenn
            eine gesetzliche Verpflichtung besteht. Kein Newsletter-Versand, kein
            E-Mail-Marketing, kein Profiling.
          </p>
        </section>

        <!-- 10. Betroffenenrechte -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            11. Ihre Rechte als betroffene Person
          </h2>
          <p class="mt-3">
            Sie haben gegenüber dem Verantwortlichen folgende Rechte hinsichtlich
            der Sie betreffenden personenbezogenen Daten:
          </p>
          <ul class="mt-3 space-y-2 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700">Auskunftsrecht</strong> (Art. 15 DSGVO)
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700">Recht auf Berichtigung</strong>
                (Art. 16 DSGVO)
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700">Recht auf Löschung</strong>
                (Art. 17 DSGVO) — über Profil → Account löschen jederzeit
                möglich
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700"
                  >Recht auf Einschränkung der Verarbeitung</strong
                >
                (Art. 18 DSGVO)
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700">Recht auf Datenportabilität</strong>
                (Art. 20 DSGVO)
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span>
                <strong class="text-stone-700">Widerspruchsrecht</strong>
                (Art. 21 DSGVO)
              </span>
            </li>
          </ul>
          <p class="mt-3">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte per E-Mail an
            <a
              href="mailto:info@mr-development.de"
              class="text-field-700 underline hover:text-field-800"
              >info@mr-development.de</a
            >.
          </p>
          <p class="mt-3">
            Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
            zu beschweren. Die zuständige Aufsichtsbehörde für Bayern ist das
            Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27,
            91522 Ansbach.
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
// Datenschutzerklärung — keine Logik erforderlich
</script>
