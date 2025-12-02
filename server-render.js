#!/usr/bin/env node
/*
  Server-side CLI meme renderer using node-canvas.

  Usage:
    node server-render.js --top "TOP TEXT" --bottom "BOTTOM" --out out.png [--bg path/to/image.jpg] [--width 1200] [--height 675]

  If --bg is omitted, a random gradient background is generated.
*/

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

function parseArgs(argv) {
  const out = { top: '', bottom: '', bg: null, outFile: 'meme.png', width: 1200, height: 675 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--top') out.top = argv[++i] || '';
    else if (a === '--bottom') out.bottom = argv[++i] || '';
    else if (a === '--bg') out.bg = argv[++i] || null;
    else if (a === '--out') out.outFile = argv[++i] || out.outFile;
    else if (a === '--width') out.width = parseInt(argv[++i], 10) || out.width;
    else if (a === '--height') out.height = parseInt(argv[++i], 10) || out.height;
    else if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

function randomColorPair() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 20);
  const l1 = 40 + Math.floor(Math.random() * 20);
  const l2 = 20 + Math.floor(Math.random() * 30);
  return { c1: `hsl(${h} ${s}% ${l1}%)`, c2: `hsl(${(h + 40) % 360} ${s}% ${l2}%)` };
}

function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const test = line ? line + ' ' + words[n] : words[n];
    const m = ctx.measureText(test);
    if (m.width > maxWidth && line) { lines.push(line); line = words[n]; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function render(options) {
  const { width, height, top, bottom, bg, outFile } = options;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (bg) {
    try {
      // allow bg to be a Buffer (uploaded) or a path string
      const img = Buffer.isBuffer(bg) ? await loadImage(bg) : await loadImage(path.resolve(bg));
      // draw cover
      const iw = img.width, ih = img.height;
      const scale = Math.max(width / iw, height / ih);
      const nw = iw * scale, nh = ih * scale;
      const dx = (width - nw) / 2, dy = (height - nh) / 2;
      ctx.drawImage(img, dx, dy, nw, nh);
    } catch (err) {
      console.error('Failed to load bg image:', err.message);
      // fallback to gradient
      const p = randomColorPair();
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, p.c1);
      g.addColorStop(1, p.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    const p = randomColorPair();
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, p.c1);
    g.addColorStop(1, p.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // subtle stripes
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${i % 2 ? 0.02 : 0.01})`;
    ctx.fillRect(0, (height / 40) * i, width, 2);
  }
  ctx.globalAlpha = 1;

  // text
  const fontSize = Math.floor(width * 0.12);
  ctx.font = `bold ${fontSize}px Impact, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(6, Math.floor(fontSize / 12));
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'white';

  function drawLines(text, centerY) {
    const lines = wrapTextLines(ctx, (text || '').toUpperCase(), width - 80);
    const totalHeight = lines.length * fontSize * 1.05;
    const startY = centerY - totalHeight / 2 + fontSize / 2;
    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * fontSize * 1.05;
      ctx.strokeText(lines[i], width / 2, y);
      ctx.fillText(lines[i], width / 2, y);
    }
  }

  drawLines(top, height * 0.12);
  drawLines(bottom, height * 0.88);

  const buffer = canvas.toBuffer('image/png');
  if (outFile) {
    fs.writeFileSync(outFile, buffer);
    console.log('Wrote', outFile);
  }
  return buffer;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log('Usage: node server-render.js --top "TOP" --bottom "BOTTOM" --out out.png [--bg path] [--width 1200] [--height 675]');
    process.exit(0);
  }
  await render(opts);
}

// Export render for programmatic use (server). Keep CLI behavior when run directly.
module.exports = { render };

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
