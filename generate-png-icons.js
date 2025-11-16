// Generate PNG icons using Node.js Canvas
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function drawIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  // Background with rounded corners (dark navy)
  const cornerRadius = size * 0.15;
  ctx.fillStyle = '#0A0E14';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cornerRadius);
  ctx.fill();

  // Center coordinates
  const centerX = size / 2;
  const centerY = size / 2;

  // Main poker chip (gold gradient effect)
  const chipRadius = size * 0.38;

  // Outer gold ring
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(centerX, centerY, chipRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner burgundy/red ring
  ctx.strokeStyle = '#8B0000';
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.arc(centerX, centerY, chipRadius - size * 0.06, 0, Math.PI * 2);
  ctx.stroke();

  // Chip edge segments (white marks around the rim)
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = 'round';

  // 12 segments like a clock face
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const r1 = chipRadius + size * 0.015;
    const r2 = chipRadius - size * 0.025;

    ctx.beginPath();
    ctx.moveTo(
      centerX + r1 * Math.cos(angle),
      centerY + r1 * Math.sin(angle)
    );
    ctx.lineTo(
      centerX + r2 * Math.cos(angle),
      centerY + r2 * Math.sin(angle)
    );
    ctx.stroke();
  }

  // Center circle with gradient effect (gold)
  const gradient = ctx.createRadialGradient(
    centerX - size * 0.05,
    centerY - size * 0.05,
    0,
    centerX,
    centerY,
    size * 0.28
  );
  gradient.addColorStop(0, '#F5D576');
  gradient.addColorStop(1, '#D4AF37');

  const innerRadius = size * 0.28;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner burgundy ring for depth
  ctx.strokeStyle = '#8B0000';
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  // Dollar sign
  ctx.fillStyle = '#0A0E14';
  ctx.font = `bold ${size * 0.32}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', centerX, centerY);
}

// Create icons directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 icon
const canvas192 = createCanvas(192, 192);
drawIcon(canvas192);
const buffer192 = canvas192.toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buffer192);
console.log('✅ Generated icon-192.png');

// Generate 512x512 icon
const canvas512 = createCanvas(512, 512);
drawIcon(canvas512);
const buffer512 = canvas512.toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buffer512);
console.log('✅ Generated icon-512.png');

console.log('\n🎉 All PNG icons generated successfully with UI kit colors!');
console.log('📍 Location: /public/icon-192.png and /public/icon-512.png');
