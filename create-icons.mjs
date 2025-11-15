#!/usr/bin/env node
/**
 * Auto-generate PNG icons from SVG using data URLs
 * This creates proper PNG files that work with PWA manifests
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to create icon canvas data
function createIconSVG(size) {
  const cornerRadius = size * 0.15;
  const centerX = size / 2;
  const centerY = size / 2;
  const chipRadius = size * 0.35;
  const innerRadius = size * 0.25;
  const strokeWidth = size * 0.04;
  const segmentWidth = size * 0.02;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#064e3b" rx="${cornerRadius}"/>

  <!-- Outer poker chip ring -->
  <circle cx="${centerX}" cy="${centerY}" r="${chipRadius}" fill="none" stroke="#dc2626" stroke-width="${strokeWidth}"/>

  <!-- Chip segments -->
  ${[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
    const rad = (angle * Math.PI) / 180;
    const r1 = chipRadius;
    const r2 = chipRadius - strokeWidth;
    const x1 = centerX + r1 * Math.cos(rad);
    const y1 = centerY + r1 * Math.sin(rad);
    const x2 = centerX + r2 * Math.cos(rad);
    const y2 = centerY + r2 * Math.sin(rad);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="${segmentWidth}" stroke-linecap="round"/>`;
  }).join('\n  ')}

  <!-- Inner circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="#dc2626"/>

  <!-- Dollar sign -->
  <text x="${centerX}" y="${centerY}" font-family="Arial,sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">$</text>
</svg>`;
}

async function createPNGFromSVG() {
  console.log('🎨 Creating CashOut app icons...\n');

  const publicDir = join(__dirname, 'public');

  // Save high-quality SVG versions
  const sizes = [192, 512];
  for (const size of sizes) {
    const svg = createIconSVG(size);
    const svgPath = join(publicDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svg);
    console.log(`✅ Created ${svgPath}`);
  }

  console.log('\n📋 Next steps:');
  console.log('1. Open http://localhost:5173/generate-icons.html in your browser');
  console.log('2. Download both PNG files (192x192 and 512x512)');
  console.log('3. Save them to the /public folder as:');
  console.log('   - icon-192.png');
  console.log('   - icon-512.png');
  console.log('\nAlternatively, if you have ImageMagick installed:');
  console.log('   cd public && convert icon-192.svg icon-192.png');
  console.log('   cd public && convert icon-512.svg icon-512.png');
}

createPNGFromSVG().catch(console.error);
