'use strict'
const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')

// Minimales Shapefile mit einem Rechteck-Polygon
// EPSG:25832 Koordinaten nahe München: 5 Punkte (geschlossener Ring)
const POINTS = [
  [680000, 5334000],
  [680100, 5334000],
  [680100, 5334100],
  [680000, 5334100],
  [680000, 5334000],
]

function writeSHP() {
  // Polygon content: 4 (type) + 32 (bbox) + 4 (numParts) + 4 (numPoints) + 4 (parts[0]) + 5*16 (points)
  // = 4 + 32 + 4 + 4 + 4 + 80 = 128 bytes = 64 16-bit words
  const contentBytes = 128
  const totalBytes = 100 + 8 + contentBytes // header + record header + content = 236

  const buf = Buffer.alloc(totalBytes, 0)

  // File header (100 bytes)
  buf.writeInt32BE(9994, 0)              // file code
  buf.writeInt32BE(totalBytes / 2, 24)  // file length in 16-bit words
  buf.writeInt32LE(1000, 28)            // version
  buf.writeInt32LE(5, 32)               // shape type: polygon
  buf.writeDoubleLE(680000, 36)         // Xmin
  buf.writeDoubleLE(5334000, 44)        // Ymin
  buf.writeDoubleLE(680100, 52)         // Xmax
  buf.writeDoubleLE(5334100, 60)        // Ymax
  // Zmin, Zmax, Mmin, Mmax at 68-99: already 0

  // Record header (8 bytes at offset 100)
  buf.writeInt32BE(1, 100)              // record number
  buf.writeInt32BE(contentBytes / 2, 104) // content length in 16-bit words

  // Polygon content (at offset 108)
  let o = 108
  buf.writeInt32LE(5, o); o += 4         // shape type
  buf.writeDoubleLE(680000, o); o += 8   // Xmin
  buf.writeDoubleLE(5334000, o); o += 8  // Ymin
  buf.writeDoubleLE(680100, o); o += 8   // Xmax
  buf.writeDoubleLE(5334100, o); o += 8  // Ymax
  buf.writeInt32LE(1, o); o += 4         // num parts
  buf.writeInt32LE(5, o); o += 4         // num points
  buf.writeInt32LE(0, o); o += 4         // parts[0]
  for (const [x, y] of POINTS) {
    buf.writeDoubleLE(x, o); o += 8
    buf.writeDoubleLE(y, o); o += 8
  }
  return buf
}

function writeDBF() {
  // 2 Felder: BEZEICHNUNG (C, 11) und FLAECHE_HA (N, 8, 2 dec)
  // Header: 32 + 2*32 + 1 = 97 bytes
  // Record: 1 (flag) + 11 (BEZEICHNUNG) + 8 (FLAECHE_HA) = 20 bytes
  // EOF: 1 byte
  const headerSize = 32 + 2 * 32 + 1
  const recordSize = 1 + 11 + 8
  const buf = Buffer.alloc(headerSize + recordSize + 1, 0)

  // Header
  buf[0] = 3                           // dBASE III
  buf[1] = 26; buf[2] = 3; buf[3] = 13 // date: 2026-03-13
  buf.writeUInt32LE(1, 4)              // num records
  buf.writeUInt16LE(headerSize, 8)     // header size
  buf.writeUInt16LE(recordSize, 10)    // record size

  // Field 1: BEZEICHNUNG (char, 11)
  buf.write('BEZEICHNUNG', 32, 'ascii')
  buf[32 + 11] = 0x43                  // type 'C'
  buf[32 + 16] = 11                    // field length

  // Field 2: FLAECHE_HA (numeric, 8, 2 decimals)
  buf.write('FLAECHE_HA', 64, 'ascii') // 10 chars + null = 11 bytes
  buf[64 + 11] = 0x4e                  // type 'N'
  buf[64 + 16] = 8                     // field length
  buf[64 + 17] = 2                     // decimal count

  // Header terminator
  buf[96] = 0x0d

  // Record (at offset 97)
  buf[97] = 0x20                       // valid record flag
  buf.write('Testschlag ', 98, 'ascii') // BEZEICHNUNG (11 chars, space-padded)
  buf.write('    5.00', 109, 'ascii')   // FLAECHE_HA  (8 chars, right-aligned)

  // EOF
  buf[headerSize + recordSize] = 0x1a
  return buf
}

function writePRJ() {
  return Buffer.from(
    'PROJCS["ETRS89 / UTM zone 32N",' +
    'GEOGCS["ETRS89",' +
    'DATUM["European_Terrestrial_Reference_System_1989",' +
    'SPHEROID["GRS 1980",6378137,298.257222101]],' +
    'PRIMEM["Greenwich",0],' +
    'UNIT["degree",0.0174532925199433]],' +
    'PROJECTION["Transverse_Mercator"],' +
    'PARAMETER["latitude_of_origin",0],' +
    'PARAMETER["central_meridian",9],' +
    'PARAMETER["scale_factor",0.9996],' +
    'PARAMETER["false_easting",500000],' +
    'PARAMETER["false_northing",0],' +
    'UNIT["metre",1],' +
    'AUTHORITY["EPSG","25832"]]',
    'ascii',
  )
}

async function main() {
  const zip = new JSZip()
  zip.file('testschlag.shp', writeSHP())
  zip.file('testschlag.dbf', writeDBF())
  zip.file('testschlag.prj', writePRJ())

  const content = await zip.generateAsync({ type: 'nodebuffer' })
  const outPath = path.join(__dirname, 'test-ibalis.zip')
  fs.writeFileSync(outPath, content)
  console.log(`✅ Written: ${outPath} (${content.length} bytes)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
