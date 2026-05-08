<template>
  <div class="min-h-screen bg-parchment">
    <!-- Nav -->
    <nav class="border-b border-stone-200 bg-parchment">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <router-link
          to="/"
          class="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-700"
          data-testid="impressum-back-link"
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
        Impressum
      </h1>
      <p class="mt-2 text-sm text-stone-400">Stand: März 2026</p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-stone-600">
        <!-- Angaben gemäß § 5 TMG -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Angaben gemäß § 5 TMG
          </h2>
          <div class="mt-3 space-y-0.5">
            <p class="font-medium text-stone-700">Manuel Rödig</p>
            <p>Tannenweg 6</p>
            <p>85405 Nandlstadt</p>
          </div>
          <div class="mt-4">
            <p>
              <span class="text-stone-500">E-Mail:</span>
              <a
                href="mailto:projekt@phash.de"
                class="ml-1 text-field-700 underline hover:text-field-800"
                >projekt@phash.de</a
              >
            </p>
          </div>
        </section>

        <!-- Verantwortlich nach § 18 MStV -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <div class="mt-3 space-y-0.5">
            <p class="font-medium text-stone-700">Manuel Rödig</p>
            <p>Tannenweg 6</p>
            <p>85405 Nandlstadt</p>
          </div>
        </section>

        <!-- Hinweis LfL -->
        <section class="rounded-xl border border-field-200 bg-field-50 p-4">
          <h2 class="font-display text-base font-semibold text-field-800">
            Hinweis zu den Nährstoffempfehlungen
          </h2>
          <p class="mt-2 text-field-700">
            Die Nährstoffbedarfswerte basieren auf den Basisdaten der
            Bayerischen Landesanstalt für Landwirtschaft (LfL). Die berechneten
            Empfehlungen ersetzen keine fachliche Beratung.
          </p>
        </section>

        <!-- Haftung für Inhalte -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Haftung für Inhalte
          </h2>
          <p class="mt-3">
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
            §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen.
          </p>
          <p class="mt-3">
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
            Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
            Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden
            von entsprechenden Rechtsverletzungen werden wir diese Inhalte
            umgehend entfernen.
          </p>
        </section>

        <!-- Haftung für Links -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Haftung für Links
          </h2>
          <p class="mt-3">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
            Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
            Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige
            Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
          <p class="mt-3">
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch
            ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
            Bekanntwerden von Rechtsverletzungen werden wir derartige Links
            umgehend entfernen.
          </p>
        </section>

        <!-- Urheberrecht -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Urheberrecht
          </h2>
          <p class="mt-3">
            Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen
            Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
            Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
            jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
            sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </p>
          <p class="mt-3">
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
            wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden
            Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf
            eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
            entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
            werden wir derartige Inhalte umgehend entfernen.
          </p>
        </section>

        <!-- Streitschlichtung -->
        <section>
          <h2 class="font-display text-base font-semibold text-stone-800">
            Streitschlichtung
          </h2>
          <p class="mt-3">
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-field-700 underline hover:text-field-800"
              >https://ec.europa.eu/consumers/odr/</a
            >
          </p>
          <p class="mt-3">
            Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht
            bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
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
// Impressum — keine Logik erforderlich
</script>
