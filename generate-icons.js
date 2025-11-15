// Simple icon generator using Node.js
// This creates PNG icons using SVG as intermediate format

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG icon content
function createSVGIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#064e3b" rx="${size * 0.15}"/>

  <!-- Poker chip outer ring -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="none" stroke="#dc2626" stroke-width="${size * 0.04}"/>

  <!-- Poker chip segments -->
  ${[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
    const rad = (angle * Math.PI) / 180;
    const r1 = size * 0.35;
    const r2 = size * 0.31;
    const x1 = size/2 + r1 * Math.cos(rad);
    const y1 = size/2 + r1 * Math.sin(rad);
    const x2 = size/2 + r2 * Math.cos(rad);
    const y2 = size/2 + r2 * Math.sin(rad);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="${size * 0.02}" stroke-linecap="round"/>`;
  }).join('\n  ')}

  <!-- Inner circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.25}" fill="#dc2626"/>

  <!-- Dollar sign -->
  <text x="${size/2}" y="${size/2 + size * 0.12}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.35}"
        font-weight="bold"
        fill="white"
        text-anchor="middle">$</text>
</svg>`;
}

// Create icons directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG files (as fallback)
const icon192SVG = createSVGIcon(192);
const icon512SVG = createSVGIcon(512);

fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), icon192SVG);
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), icon512SVG);

console.log('✅ SVG icons generated successfully!');
console.log('📝 Note: For production, convert these SVG files to PNG using:');
console.log('   - Online tool: https://cloudconvert.com/svg-to-png');
console.log('   - Or ImageMagick: convert icon-192.svg icon-192.png');
console.log('');
console.log('For now, updating manifest to use SVG icons...');
