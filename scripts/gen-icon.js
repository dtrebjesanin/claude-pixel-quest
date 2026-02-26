/**
 * Generates assets/icon.png (128x128) from the goblin pixel-art design.
 * Uses only Node built-ins (zlib for PNG compression, fs for output).
 * Run with: node scripts/gen-icon.js
 */
'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Colours ──────────────────────────────────────────────────────────────────
const BG = [0x1a, 0x1a, 0x2e]; // #1a1a2e  (extension sidebar background)
const FG = [0x4a, 0xde, 0x80]; // #4ade80  (goblin green, matches feed dots)

// ── 8×8 pixel-art grid ───────────────────────────────────────────────────────
// Derived from assets/icon.svg (each cell = 3 px in the original 24×24 SVG)
const GRID = [
  [1,0,0,0,0,0,0,1], // row 0 — pointy ear tips
  [1,1,1,1,1,1,1,1], // row 1 — head / ear base
  [0,1,0,1,1,0,1,0], // row 2 — eyes + bridge
  [0,1,1,1,1,1,1,0], // row 3 — lower face
  [0,0,1,1,1,1,0,0], // row 4 — chin / neck
  [0,1,1,1,1,1,1,0], // row 5 — body + arms
  [0,0,1,0,0,1,0,0], // row 6 — legs
  [0,1,1,0,0,1,1,0], // row 7 — feet
];

// ── Canvas layout ─────────────────────────────────────────────────────────────
const W    = 128;
const H    = 128;
const CELL = 13;                              // 8 cells × 13 px = 104 px sprite
const OX   = Math.floor((W - 8 * CELL) / 2); // 12 px left padding
const OY   = Math.floor((H - 8 * CELL) / 2); // 12 px top padding

function getPixel(x, y) {
  const px = x - OX;
  const py = y - OY;
  if (px < 0 || px >= 8 * CELL || py < 0 || py >= 8 * CELL) return BG;
  return GRID[Math.floor(py / CELL)][Math.floor(px / CELL)] ? FG : BG;
}

// ── Build raw scanlines (filter byte 0x00 + RGB per pixel) ───────────────────
const raw = Buffer.alloc(H * (1 + W * 3));
let i = 0;
for (let y = 0; y < H; y++) {
  raw[i++] = 0; // PNG filter: None
  for (let x = 0; x < W; x++) {
    const [r, g, b] = getPixel(x, y);
    raw[i++] = r; raw[i++] = g; raw[i++] = b;
  }
}

// ── CRC-32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let j = 0; j < buf.length; j++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[j]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG chunk helper ──────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const tBuf  = Buffer.from(type, 'ascii');
  const dBuf  = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(dBuf.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, dBuf])), 0);
  return Buffer.concat([lenBuf, tBuf, dBuf, crcBuf]);
}

// ── Assemble PNG ──────────────────────────────────────────────────────────────
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W,  0);
ihdr.writeUInt32BE(H,  4);
ihdr[8]  = 8; // bit depth
ihdr[9]  = 2; // colour type: RGB
ihdr[10] = 0; // compression method
ihdr[11] = 0; // filter method
ihdr[12] = 0; // interlace method

const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), // PNG signature
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', idat),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.writeFileSync(out, png);
console.log(`Written: ${out}  (${png.length} bytes, ${W}×${H} px)`);
