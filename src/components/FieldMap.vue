<template>
  <p
    v-if="fieldsWithGeometry.length === 0"
    data-testid="field-map-empty"
    class="py-8 text-center text-stone-400"
  >
    Noch keine Feldgrenzen vorhanden. iBalis importieren um Felder auf der Karte anzuzeigen.
  </p>
  <div
    v-else
    data-testid="field-map"
    ref="mapContainer"
    class="h-[50vh] w-full rounded-2xl overflow-hidden shadow-warm-sm"
  />
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import type { Field } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { buildTooltipElement } from './fieldMapTooltip'

const props = defineProps<{
  fields: Field[]
  selectedFieldId?: string | null
}>()

const emit = defineEmits<{
  select: [fieldId: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let geoJsonLayer: L.GeoJSON | null = null
const layersByFieldId = new Map<string, L.Layer>()

const fieldsWithGeometry = computed(() => props.fields.filter((f) => f.geometry))

const defaultStyle: L.PathOptions = {
  color: '#2d5a27',
  weight: 3,
  fillColor: '#5d9155',
  fillOpacity: 0.35,
  dashArray: '',
}

const selectedStyle: L.PathOptions = {
  color: '#c8a85c',
  weight: 4,
  fillColor: '#e8a849',
  fillOpacity: 0.45,
  dashArray: '',
}

function renderPolygons() {
  if (!map) return

  if (geoJsonLayer) {
    geoJsonLayer.removeFrom(map)
    geoJsonLayer = null
  }
  layersByFieldId.clear()

  if (fieldsWithGeometry.value.length === 0) return

  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: fieldsWithGeometry.value.map((f) => ({
      type: 'Feature' as const,
      properties: { fieldId: f.id, name: f.name, size_ha: f.size_ha },
      geometry: f.geometry!.geometry,
    })),
  }

  geoJsonLayer = L.geoJSON(featureCollection, {
    style: defaultStyle,
    onEachFeature(feature, layer) {
      const fieldId = feature.properties!.fieldId as string
      const name = feature.properties!.name as string
      const sizeHa = feature.properties!.size_ha as number

      layersByFieldId.set(fieldId, layer)

      // Permanent label on polygon center — DOM-Element statt HTML-String (XSS-sicher)
      layer.bindTooltip(buildTooltipElement(name, sizeHa), {
        permanent: true,
        direction: 'center',
        className: 'field-label',
      })

      layer.on('click', () => {
        emit('select', fieldId)
      })
    },
  }).addTo(map)

  // Initial view: selected field > first field with geometry
  const initialId = props.selectedFieldId ?? fieldsWithGeometry.value[0]?.id
  if (initialId && layersByFieldId.has(initialId)) {
    const layer = layersByFieldId.get(initialId)!
    if ('getBounds' in layer) {
      map.fitBounds((layer as L.Polygon).getBounds(), { padding: [40, 40] })
    }
  } else {
    map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] })
  }
  highlightSelected()
}

function highlightSelected() {
  if (!geoJsonLayer) return

  // Reset all to default
  geoJsonLayer.setStyle(defaultStyle)

  // Highlight selected
  if (props.selectedFieldId) {
    const layer = layersByFieldId.get(props.selectedFieldId)
    if (layer && 'setStyle' in layer) {
      ;(layer as L.Path).setStyle(selectedStyle)
      ;(layer as L.Path).bringToFront()
    }
  }
}

function flyToField(fieldId: string) {
  if (!map) return
  const layer = layersByFieldId.get(fieldId)
  if (layer && 'getBounds' in layer) {
    map.flyToBounds((layer as L.Polygon).getBounds(), {
      padding: [40, 40],
      duration: 0.6,
    })
  }
}

watch(mapContainer, (el) => {
  if (!el || map) return

  map = L.map(el).setView([48.5, 11.5], 9)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  renderPolygons()
})

onUnmounted(() => {
  map?.remove()
  map = null
  geoJsonLayer = null
  layersByFieldId.clear()
})

watch(() => props.fields, renderPolygons)

watch(() => props.selectedFieldId, (newId) => {
  highlightSelected()
  if (newId) flyToField(newId)
})
</script>

<style>
.field-label {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  line-height: 1.3;
  text-align: center;
  border-radius: 0.5rem;
  padding: 0.2rem 0.4rem;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}
</style>
