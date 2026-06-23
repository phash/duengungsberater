import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'

const require = createRequire(import.meta.url)
const proj4 = require('proj4')

proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')

function parseGpkgGeom(buf) {
  const flags = buf[3]
  const envInd = (flags >> 1) & 0x07
  const envSizes = { 0: 0, 1: 32, 2: 48, 3: 48, 4: 64 }
  return buf.slice(8 + (envSizes[envInd] || 0))
}

const r32 = (b, o, le) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o))
const r64 = (b, o, le) => (le ? b.readDoubleLE(o) : b.readDoubleBE(o))

function parseRing(b, o, le) {
  const n = r32(b, o, le); o += 4
  const c = []
  for (let i = 0; i < n; i++) {
    const x = r64(b, o, le); o += 8
    const y = r64(b, o, le); o += 8
    const [lng, lat] = proj4('EPSG:25832', 'EPSG:4326', [x, y])
    c.push([Math.round(lng * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4])
  }
  return { c, o }
}

function parsePoly(b, o, le) {
  const nr = r32(b, o, le); o += 4
  const rings = []
  for (let i = 0; i < nr; i++) { const r = parseRing(b, o, le); rings.push(r.c); o = r.o }
  return { rings, o }
}

function toGeoJSON(wkb) {
  const le = wkb[0] === 1; const t = r32(wkb, 1, le); let o = 5
  if (t === 3) { const { rings } = parsePoly(wkb, o, le); return { type: 'Polygon', coordinates: rings } }
  if (t === 6) {
    const ng = r32(wkb, o, le); o += 4; const ps = []
    for (let i = 0; i < ng; i++) { const sle = wkb[o] === 1; o++; o += 4; const { rings, o: no } = parsePoly(wkb, o, sle); ps.push(rings); o = no }
    return { type: 'MultiPolygon', coordinates: ps }
  }
  return null
}

// Douglas-Peucker
function dSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function simp(r, e) {
  if (r.length <= 3) return r
  let mx = 0, idx = 0
  for (let i = 1; i < r.length - 1; i++) {
    const d = dSeg(r[i], r[0], r[r.length - 1])
    if (d > mx) { mx = d; idx = i }
  }
  if (mx > e) {
    const l = simp(r.slice(0, idx + 1), e)
    const ri = simp(r.slice(idx), e)
    return l.slice(0, -1).concat(ri)
  }
  return [r[0], r[r.length - 1]]
}

const raw = JSON.parse(readFileSync('/tmp/bayern-raw.json', 'utf8'))
const EPS = 0.008 // ~800m tolerance
const regions = []

for (const row of raw) {
  const buf = Buffer.from(row.h, 'hex')
  const wkb = parseGpkgGeom(buf)
  const geo = toGeoJSON(wkb)

  if (geo.type === 'MultiPolygon') {
    geo.coordinates = geo.coordinates.map(p => p.map(r => simp(r, EPS))).filter(p => p[0].length >= 4)
  } else {
    geo.coordinates = geo.coordinates.map(r => simp(r, EPS))
  }

  let pts = 0
  if (geo.type === 'MultiPolygon') { for (const p of geo.coordinates) for (const r of p) pts += r.length }
  else { for (const r of geo.coordinates) pts += r.length }

  const code = row.n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  regions.push({ code, name: row.n, ars: row.a, geometry: geo })
  console.error(`${row.n.padEnd(20)} ${pts} pts`)
}

writeFileSync('/tmp/bayern-regions.json', JSON.stringify(regions))
console.error(`Total size: ${(JSON.stringify(regions).length / 1024).toFixed(1)} KB`)
