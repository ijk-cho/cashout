// Simple icon generator using Node.js
// This creates PNG icons using SVG as intermediate format

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG icon content with UI kit colors
function createSVGIcon(size) {
  const chipRadius = size * 0.38;
  const innerRadius = size * 0.28;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Radial gradient for center circle -->
    <radialGradient id="goldGradient">
      <stop offset="0%" style="stop-color:#F5D576;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D4AF37;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- Background (dark navy) -->
  <rect width="${size}" height="${size}" fill="#0A0E14" rx="${size * 0.15}"/>

  <!-- Outer gold ring -->
  <circle cx="${size/2}" cy="${size/2}" r="${chipRadius}" fill="none" stroke="#D4AF37" stroke-width="${size * 0.05}"/>

  <!-- Inner burgundy/red ring -->
  <circle cx="${size/2}" cy="${size/2}" r="${chipRadius - size * 0.06}" fill="none" stroke="#8B0000" stroke-width="${size * 0.03}"/>

  <!-- Chip edge segments (12 marks like a clock) -->
  ${Array.from({length: 12}).map((_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const r1 = chipRadius + size * 0.015;
    const r2 = chipRadius - size * 0.025;
    const x1 = size/2 + r1 * Math.cos(angle);
    const y1 = size/2 + r1 * Math.sin(angle);
    const x2 = size/2 + r2 * Math.cos(angle);
    const y2 = size/2 + r2 * Math.sin(angle);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#F8FAFC" stroke-width="${size * 0.025}" stroke-linecap="round"/>`;
  }).join('\n  ')}

  <!-- Center circle with gold gradient -->
  <circle cx="${size/2}" cy="${size/2}" r="${innerRadius}" fill="url(#goldGradient)"/>

  <!-- Inner burgundy ring for depth -->
  <circle cx="${size/2}" cy="${size/2}" r="${innerRadius * 0.7}" fill="none" stroke="#8B0000" stroke-width="${size * 0.015}"/>

  <!-- Dollar sign -->
  <text x="${size/2}" y="${size/2 + size * 0.11}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.32}"
        font-weight="bold"
        fill="#0A0E14"
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
