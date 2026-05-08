<template>
  <div class="min-h-screen bg-parchment">
    <!-- Nav -->
    <nav class="border-b border-stone-200 bg-parchment">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <router-link
          to="/"
          class="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-700"
          data-testid="agb-back-link"
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
        Allgemeine Geschäftsbedingungen
      </h1>
      <p class="mt-2 text-sm text-stone-400">Stand: März 2026</p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-stone-600">
        <!-- § 1 Geltungsbereich -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 1 Geltungsbereich
          </h2>
          <p class="mt-3">
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung
            der Web-Anwendung <strong class="text-stone-700">Düngungsberater</strong>
            unter der Domain
            <span class="font-medium text-stone-700">duenger.mr-development.de</span>,
            betrieben von Manuel Rödig, Tannenweg 6, 85405 Nandlstadt
            (nachfolgend „Anbieter").
          </p>
          <p class="mt-3">
            Die Anwendung ist eine kostenlose Progressive Web App (PWA) zur
            Unterstützung der Düngeplanung für landwirtschaftliche Betriebe. Mit
            der Registrierung oder Nutzung der Anwendung akzeptiert der Nutzer
            diese AGB.
          </p>
        </section>

        <!-- § 2 Leistungsbeschreibung -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 2 Leistungsbeschreibung
          </h2>
          <p class="mt-3">
            Der Düngungsberater stellt folgende Funktionen bereit:
          </p>
          <ul class="mt-3 space-y-2 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Berechnung von Nährstoffbedarfswerten (N, P₂O₅, K₂O, MgO, S)
                basierend auf den Basisdaten der Bayerischen Landesanstalt für
                Landwirtschaft (LfL)</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Verwaltung von Felddaten und Anbauplanungen</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Import von Felddaten aus dem bayerischen Agrardatennetzwerk
                iBalis (GeoPackage, Shapefile)</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-field-600"></span>
              <span
                >Offline-Betrieb auf dem Endgerät des Nutzers als PWA</span
              >
            </li>
          </ul>
          <p class="mt-3">
            Die Anwendung ist ein Planungshilfsmittel. Der Anbieter übernimmt
            keine Garantie für die Vollständigkeit, Aktualität oder Richtigkeit
            der berechneten Empfehlungen.
          </p>
        </section>

        <!-- § 3 Haftungsausschluss -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 3 Haftungsausschluss
          </h2>

          <h3 class="mt-4 font-semibold text-stone-700">
            3.1 Keine Beratungsleistung
          </h3>
          <p class="mt-2">
            Die durch den Düngungsberater erzeugten Empfehlungen basieren auf
            allgemeinen LfL-Basisdaten und den vom Nutzer eingegebenen
            Betriebsdaten. Sie ersetzen in keinem Fall eine individuelle
            fachliche Beratung durch einen zugelassenen Düngeberater,
            Landwirtschaftsberater oder eine Landwirtschaftsbehörde.
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">
            3.2 Haftungsbeschränkung
          </h3>
          <p class="mt-2">
            Der Anbieter haftet nicht für Schäden, die aus der Nutzung oder
            Nichtnutzung der bereitgestellten Informationen entstehen. Dies
            umfasst insbesondere:
          </p>
          <ul class="mt-2 space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Ernteschäden oder Ertragsausfälle</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Schäden durch fehlerhafte Düngung</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span
                >Verstöße gegen düngemittelrechtliche Vorschriften (z.B.
                Düngeverordnung, Nitratrichtlinie)</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"></span>
              <span>Datenverluste durch technische Störungen</span>
            </li>
          </ul>
          <p class="mt-3">
            Dies gilt nicht, soweit dem Anbieter Vorsatz oder grobe
            Fahrlässigkeit nachgewiesen wird.
          </p>

          <div class="mt-4 rounded-xl border border-wheat-200 bg-wheat-50 p-4">
            <p class="font-medium text-wheat-800">Wichtiger Hinweis</p>
            <p class="mt-1 text-wheat-700">
              Die berechneten Empfehlungen ersetzen keine fachliche Beratung.
              Der Nutzer ist allein verantwortlich für die Einhaltung der
              gesetzlichen Vorgaben der Düngeverordnung (DüV) und weiterer
              einschlägiger Vorschriften.
            </p>
          </div>
        </section>

        <!-- § 4 Verfügbarkeit -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 4 Verfügbarkeit
          </h2>
          <p class="mt-3">
            Der Anbieter bemüht sich um eine möglichst unterbrechungsfreie
            Verfügbarkeit der Anwendung, übernimmt jedoch keine Garantie für
            eine ständige und fehlerfreie Erreichbarkeit. Wartungsarbeiten,
            technische Störungen oder höhere Gewalt können zu vorübergehenden
            Ausfällen führen.
          </p>
          <p class="mt-3">
            Die Offline-Funktionalität der PWA ermöglicht die Nutzung
            gespeicherter Daten auch ohne Internetverbindung. Ein Anspruch auf
            ständige Online-Verfügbarkeit besteht nicht.
          </p>
        </section>

        <!-- § 5 Nutzerpflichten -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 5 Nutzerpflichten und Dateneingabe
          </h2>
          <p class="mt-3">
            Der Nutzer ist verantwortlich für die Richtigkeit und Vollständigkeit
            der von ihm eingegebenen Daten (Felddaten, Ertragsziele,
            Korrekturfaktoren u.a.). Fehlerhafte Eingabedaten führen zu
            fehlerhaften Berechnungsergebnissen, wofür der Anbieter nicht
            haftet.
          </p>
          <p class="mt-3">
            Der Nutzer verpflichtet sich, die Anwendung nicht missbräuchlich zu
            nutzen und keine automatisierten Zugriffe (Scraping, Bots) ohne
            ausdrückliche Genehmigung durchzuführen.
          </p>
        </section>

        <!-- § 6 Registrierung und Account -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 6 Registrierung und Account-Löschung
          </h2>
          <p class="mt-3">
            Die Nutzung der Anwendung setzt eine Registrierung mit einer
            gültigen E-Mail-Adresse voraus. Die Registrierung ist kostenlos.
          </p>
          <p class="mt-3">
            Der Nutzer kann seinen Account jederzeit innerhalb der Anwendung
            unter <strong class="text-stone-700">Profil → Account löschen</strong>
            unwiderruflich löschen. Mit der Account-Löschung werden alle
            gespeicherten Daten sofort entfernt. Ein Widerrufsrecht nach § 355
            BGB besteht nicht, da die Leistung kostenlos erbracht wird.
          </p>
        </section>

        <!-- § 7 Änderungen der AGB -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 7 Änderungen dieser AGB
          </h2>
          <p class="mt-3">
            Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft
            zu ändern. Änderungen werden dem Nutzer per E-Mail an die
            hinterlegte Adresse oder durch einen Hinweis beim nächsten Login
            mitgeteilt. Widerspricht der Nutzer den geänderten AGB nicht
            innerhalb von vier Wochen nach Bekanntgabe, gelten die neuen AGB
            als akzeptiert. Auf dieses Widerspruchsrecht und die Folgen des
            Schweigens wird im Rahmen der Änderungsmitteilung ausdrücklich
            hingewiesen.
          </p>
        </section>

        <!-- § 8 Schlussbestimmungen -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            § 8 Schlussbestimmungen
          </h2>

          <h3 class="mt-4 font-semibold text-stone-700">
            8.1 Anwendbares Recht
          </h3>
          <p class="mt-2">
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
            des UN-Kaufrechts (CISG).
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">8.2 Gerichtsstand</h3>
          <p class="mt-2">
            Sofern der Nutzer Kaufmann, eine juristische Person des öffentlichen
            Rechts oder ein öffentlich-rechtliches Sondervermögen ist, ist
            ausschließlicher Gerichtsstand der Sitz des Anbieters.
          </p>

          <h3 class="mt-4 font-semibold text-stone-700">
            8.3 Salvatorische Klausel
          </h3>
          <p class="mt-2">
            Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise
            unwirksam sein oder werden, berührt dies nicht die Wirksamkeit der
            übrigen Bestimmungen. An die Stelle der unwirksamen Bestimmung tritt
            eine Regelung, die dem wirtschaftlichen Zweck der unwirksamen
            Bestimmung am nächsten kommt.
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
// AGB — keine Logik erforderlich
</script>
