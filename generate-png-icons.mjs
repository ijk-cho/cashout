#!/usr/bin/env node
/**
 * Generate basic PNG icons using pure Node.js (no dependencies)
 * Creates simple colored PNG files as placeholders
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimal PNG creator (creates a solid color PNG)
async function createMinimalPNG(width, height, r, g, b) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Create image data (solid color)
  const scanlineSize = 1 + width * 3; // filter byte + RGB pixels
  const dataSize = height * scanlineSize;
  const imageData = Buffer.alloc(dataSize);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineSize;
    imageData[offset] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      imageData[pixelOffset] = r;
      imageData[pixelOffset + 1] = g;
      imageData[pixelOffset + 2] = b;
    }
  }

  // Compress using deflate (very basic compression)
  const zlib = await import('zlib');
  const compressed = zlib.deflateSync(imageData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = createCRC(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createCRC(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function generateIcons() {
  console.log('🎨 Generating PNG icons...\n');

  const publicDir = join(__dirname, 'public');

  // Create simple colored PNG (dark green - brand color)
  // For a better icon, users should open generate-icons.html
  const icon192 = await createMinimalPNG(192, 192, 6, 78, 59); // #064e3b
  const icon512 = await createMinimalPNG(512, 512, 6, 78, 59); // #064e3b

  fs.writeFileSync(join(publicDir, 'icon-192.png'), icon192);
  fs.writeFileSync(join(publicDir, 'icon-512.png'), icon512);

  console.log('✅ Created placeholder PNG icons');
  console.log('   - /public/icon-192.png (192x192)');
  console.log('   - /public/icon-512.png (512x512)');
  console.log('\n⚠️  Note: These are basic placeholder icons.');
  console.log('   For better icons with the poker chip design:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Visit: http://localhost:5173/generate-icons.html');
  console.log('   3. Download the generated icons\n');
}

generateIcons().catch(console.error);
