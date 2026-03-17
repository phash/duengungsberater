<template>
  <p
    v-if="fieldsWithGeometry.length === 0"
    data-testid="field-map-empty"
    class="py-12 text-center text-gray-400"
  >
    Noch keine Feldgrenzen vorhanden. iBalis importieren um Felder auf der Karte anzuzeigen.
  </p>
  <div
    v-else
    data-testid="field-map"
    ref="mapContainer"
    class="h-[50vh] w-full rounded-xl overflow-hidden"
  />
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import type { Field } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const props = defineProps<{
  fields: Field[]
}>()

const emit = defineEmits<{
  select: [fieldId: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let geoJsonLayer: L.GeoJSON | null = null

const fieldsWithGeometry = computed(() => props.fields.filter((f) => f.geometry))

function renderPolygons() {
  if (!map) return

  if (geoJsonLayer) {
    geoJsonLayer.removeFrom(map)
    geoJsonLayer = null
  }

  if (fieldsWithGeometry.value.length === 0) return

  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: fieldsWithGeometry.value.map((f) => ({
      type: 'Feature' as const,
      properties: { fieldId: f.id, name: f.name },
      geometry: f.geometry!.geometry,
    })),
  }

  geoJsonLayer = L.geoJSON(featureCollection, {
    style: {
      color: '#16a34a',
      weight: 2,
      fillColor: '#22c55e',
      fillOpacity: 0.3,
    },
    onEachFeature(feature, layer) {
      layer.on('click', () => {
        emit('select', feature.properties!.fieldId as string)
      })
    },
  }).addTo(map)

  map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] })
}

watch(mapContainer, (el) => {
  if (!el || map) return

  map = L.map(el).setView([48.5, 11.5], 9)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  renderPolygons()
})

onUnmounted(() => {
  map?.remove()
  map = null
  geoJsonLayer = null
})

watch(() => props.fields, renderPolygons)
</script>
