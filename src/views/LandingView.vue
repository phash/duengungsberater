<template>
  <div class="min-h-screen bg-parchment">
    <!-- ═══ Hero ═══ -->
    <header class="relative overflow-hidden pb-16 pt-8">
      <!-- Topographic background -->
      <svg class="absolute inset-0 h-full w-full text-field-600 opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topo-landing" width="200" height="200" patternUnits="userSpaceOnUse">
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="0.6"/>
            <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" stroke-width="0.5"/>
            <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" stroke-width="0.4"/>
            <path d="M0 50 Q50 30 100 50 Q150 70 200 50" fill="none" stroke="currentColor" stroke-width="0.4"/>
            <path d="M0 150 Q50 130 100 150 Q150 170 200 150" fill="none" stroke="currentColor" stroke-width="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-landing)"/>
      </svg>

      <div class="relative mx-auto max-w-4xl px-5">
        <!-- Nav -->
        <nav class="mb-16 flex items-center justify-between animate-fade-in-up">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-field-600 shadow-md shadow-field-600/20">
              <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 20h10"/><path d="M12 20v-6"/>
                <path d="M12 14c-3 0-6-3-6-8 4 0 6 4 6 8z" fill="currentColor" opacity="0.25"/>
                <path d="M12 14c3 0 6-3 6-8-4 0-6 4-6 8z" fill="currentColor" opacity="0.25"/>
              </svg>
            </div>
            <span class="font-display text-lg font-semibold text-stone-800">Düngungsberater</span>
          </div>
          <router-link
            to="/login"
            data-testid="landing-login-button"
            class="rounded-xl bg-field-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-field-600/20 transition-all duration-200 hover:bg-field-700 hover:shadow-lg active:scale-95"
          >
            Anmelden
          </router-link>
        </nav>

        <!-- Hero Content -->
        <div class="text-center">
          <div class="animate-fade-in-up" style="animation-delay: 100ms">
            <span class="inline-block rounded-full bg-field-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-field-700">
              Kostenlos &middot; Offline-fähig &middot; Datenschutzkonform
            </span>
          </div>

          <h1 class="mx-auto mt-6 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl animate-fade-in-up" style="animation-delay: 200ms">
            Düngeplanung nach
            <span class="text-field-600">LfL-Basisdaten</span>
            — direkt auf dem Feld
          </h1>

          <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-stone-500 animate-fade-in-up" style="animation-delay: 300ms">
            Nährstoffbedarf berechnen, Korrekturfaktoren anwenden und
            Produktempfehlungen erhalten. Basierend auf den offiziellen Richtwerten
            der Bayerischen Landesanstalt für Landwirtschaft.
          </p>

          <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-fade-in-up" style="animation-delay: 400ms">
            <router-link
              to="/login"
              data-testid="landing-cta-button"
              class="inline-flex items-center gap-2 rounded-2xl bg-field-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-field-600/25 transition-all duration-200 hover:bg-field-700 hover:shadow-xl active:scale-[0.98]"
            >
              Jetzt starten
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </router-link>
            <a
              href="#so-funktioniert-es"
              class="inline-flex items-center gap-1.5 rounded-2xl border-2 border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-stone-300 hover:bg-stone-50"
            >
              So funktioniert's
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- ═══ Features ═══ -->
    <section id="so-funktioniert-es" class="py-16">
      <div class="mx-auto max-w-4xl px-5">
        <h2 class="text-center font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
          So funktioniert's
        </h2>
        <p class="mx-auto mt-3 max-w-lg text-center text-stone-500">
          In vier Schritten von der Felddaten-Erfassung zur konkreten Düngungsempfehlung.
        </p>

        <div class="mt-12 grid gap-6 sm:grid-cols-2">
          <!-- Step 1 -->
          <div class="card-lift rounded-2xl bg-white p-6 shadow-warm-sm">
            <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-field-50 text-field-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-stone-800">1. Felder anlegen</h3>
            <p class="mt-2 text-sm leading-relaxed text-stone-500">
              Felder manuell eingeben oder direkt aus iBalis importieren
              (GeoPackage &amp; Shapefile). Feldgrenzen werden auf der Karte dargestellt.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="card-lift rounded-2xl bg-white p-6 shadow-warm-sm">
            <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-wheat-50 text-wheat-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20"/><path d="M2 5h20"/>
                <path d="M4 12c2-3 4-5 8-5s6 2 8 5"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-stone-800">2. Anbauplanung erstellen</h3>
            <p class="mt-2 text-sm leading-relaxed text-stone-500">
              Kultur auswählen (Winterweizen, Silomais, Kartoffeln u.v.m.),
              erwarteten Ertrag und Saison festlegen.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="card-lift rounded-2xl bg-white p-6 shadow-warm-sm">
            <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-field-50 text-field-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-stone-800">3. Empfehlung erhalten</h3>
            <p class="mt-2 text-sm leading-relaxed text-stone-500">
              Nährstoffbedarf für N, P₂O₅, K₂O, MgO und S —
              berechnet nach LfL-Richtwerten mit Ertrags- und Standortkorrekturen.
            </p>
          </div>

          <!-- Step 4 -->
          <div class="card-lift rounded-2xl bg-white p-6 shadow-warm-sm">
            <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-wheat-50 text-wheat-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-stone-800">4. Korrekturen &amp; Produkte</h3>
            <p class="mt-2 text-sm leading-relaxed text-stone-500">
              Vorfrucht, Zwischenfrucht, Humus-Korrekturen und Nmin-Bodenproben
              einrechnen. Passende Düngerprodukte mit Mengenberechnung erhalten.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Vorteile ═══ -->
    <section class="bg-field-600 py-16">
      <div class="mx-auto max-w-4xl px-5">
        <h2 class="text-center font-display text-2xl font-semibold text-white sm:text-3xl">
          Warum Düngungsberater?
        </h2>
        <div class="mt-10 grid gap-8 sm:grid-cols-3">
          <div class="text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <svg class="h-6 w-6 text-wheat-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-white">Offizielle LfL-Daten</h3>
            <p class="mt-2 text-sm leading-relaxed text-field-200">
              Alle Richtwerte stammen direkt aus den Basisdaten der
              Bayerischen Landesanstalt für Landwirtschaft — stets aktuell.
            </p>
          </div>
          <div class="text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <svg class="h-6 w-6 text-wheat-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/>
                <path d="M9 20v-4h6v4"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-white">Offline auf dem Feld</h3>
            <p class="mt-2 text-sm leading-relaxed text-field-200">
              Als Progressive Web App funktioniert der Düngungsberater
              auch ohne Internetverbindung. Daten werden automatisch synchronisiert.
            </p>
          </div>
          <div class="text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <svg class="h-6 w-6 text-wheat-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-white">iBalis-Import</h3>
            <p class="mt-2 text-sm leading-relaxed text-field-200">
              Felder direkt aus dem bayerischen iBalis-System importieren
              (GeoPackage &amp; Shapefile). Feldgrenzen inklusive.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Nährstoffe ═══ -->
    <section class="py-16">
      <div class="mx-auto max-w-4xl px-5">
        <h2 class="text-center font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
          Fünf Nährstoffe, ein Workflow
        </h2>
        <p class="mx-auto mt-3 max-w-lg text-center text-stone-500">
          Der Düngungsberater berechnet den Bedarf für alle relevanten Hauptnährstoffe.
        </p>
        <div class="mx-auto mt-10 flex max-w-md flex-wrap justify-center gap-3">
          <span class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-warm-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-field-100 text-xs font-bold text-field-700">N</span>
            <span class="text-sm font-medium text-stone-700">Stickstoff</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-warm-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-field-100 text-xs font-bold text-field-700">P₂O₅</span>
            <span class="text-sm font-medium text-stone-700">Phosphat</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-warm-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-field-100 text-xs font-bold text-field-700">K₂O</span>
            <span class="text-sm font-medium text-stone-700">Kalium</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-warm-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-wheat-50 text-xs font-bold text-wheat-600">MgO</span>
            <span class="text-sm font-medium text-stone-700">Magnesium</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-warm-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-wheat-50 text-xs font-bold text-wheat-600">S</span>
            <span class="text-sm font-medium text-stone-700">Schwefel</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ═══ CTA ═══ -->
    <section class="border-t border-stone-200 py-16">
      <div class="mx-auto max-w-4xl px-5 text-center">
        <h2 class="font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
          Bereit für die nächste Saison?
        </h2>
        <p class="mx-auto mt-3 max-w-md text-stone-500">
          Kostenlos registrieren und die Düngeplanung nach LfL-Basisdaten starten.
          Keine Kreditkarte erforderlich.
        </p>
        <router-link
          to="/login"
          data-testid="landing-cta-bottom-button"
          class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-field-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-field-600/25 transition-all duration-200 hover:bg-field-700 hover:shadow-xl active:scale-[0.98]"
        >
          Kostenlos starten
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </router-link>
      </div>
    </section>

    <!-- ═══ Footer ═══ -->
    <footer class="border-t border-stone-200 bg-parchment-dark py-8">
      <div class="mx-auto max-w-4xl px-5">
        <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div class="flex items-center gap-2 text-sm text-stone-500">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-field-600">
              <svg class="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 20h10"/><path d="M12 20v-6"/>
                <path d="M12 14c-3 0-6-3-6-8 4 0 6 4 6 8z" fill="currentColor" opacity="0.25"/>
                <path d="M12 14c3 0 6-3 6-8-4 0-6 4-6 8z" fill="currentColor" opacity="0.25"/>
              </svg>
            </div>
            <span>Düngungsberater</span>
          </div>
          <p class="text-xs text-stone-400">
            Basisdaten: LfL Bayern &middot; Open Source &middot;
            <a href="https://github.com/phash/duengungsberater" class="underline hover:text-stone-600" target="_blank" rel="noopener">GitHub</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Landing page — keine Logik nötig, rein informativ
</script>
