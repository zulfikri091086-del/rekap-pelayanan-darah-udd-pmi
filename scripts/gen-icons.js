// Script untuk generate icon PWA — jalankan sekali: node scripts/gen-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.12;

  // Background gradient merah-mawar
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#c9858f');
  bg.addColorStop(1, '#8f4f5b');
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  // Lingkaran emas
  ctx.strokeStyle = 'rgba(230,211,172,0.8)';
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Teks "ZF"
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.3}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ZF', size / 2, size / 2 + size * 0.02);

  return canvas.toBuffer('image/png');
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach((size) => {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), drawIcon(size));
  console.log(`icon-${size}.png created`);
});
