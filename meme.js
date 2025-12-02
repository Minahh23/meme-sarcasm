// Simple meme renderer
const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const topInput = document.getElementById('topText');
const bottomInput = document.getElementById('bottomText');
const randomBtn = document.getElementById('randomBg');
const downloadBtn = document.getElementById('download');
const uploadInput = document.getElementById('uploadBg');
const clearBgBtn = document.getElementById('clearBg');

let backgroundImage = null;

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 20);
  const l1 = 40 + Math.floor(Math.random() * 20);
  const l2 = 20 + Math.floor(Math.random() * 30);
  return { c1: `hsl(${h} ${s}% ${l1}%)`, c2: `hsl(${(h+40)%360} ${s}% ${l2}%)` };
}

let bg = randomColor();

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  // Background: image if uploaded, otherwise gradient
  if (backgroundImage) {
    drawImageCover(ctx, backgroundImage, 0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Optional subtle noise (simple stripes)
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${i%2?0.02:0.01})`;
    ctx.fillRect(0, (h / 40) * i, w, 2);
  }
  ctx.globalAlpha = 1;

  // Text drawing helper
  function drawText(text, y, sizeRatio = 0.12) {
    const fontSize = Math.floor(w * sizeRatio);
    ctx.font = `bold ${fontSize}px Impact, 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = w / 2;
    // stroke (outline)
    ctx.lineWidth = Math.max(6, Math.floor(fontSize / 12));
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';
    // allow multiline by splitting on \n and wrapping long lines
    const lines = wrapText(ctx, text.toUpperCase(), w - 80);
    const totalHeight = lines.length * fontSize * 1.05;
    const startY = y - (totalHeight / 2) + fontSize / 2;
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * fontSize * 1.05;
      ctx.strokeText(lines[i], x, lineY);
      ctx.fillText(lines[i], x, lineY);
    }
  }

  drawText(topInput.value || '', h * 0.12, 0.12);
  drawText(bottomInput.value || '', h * 0.88, 0.12);
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line ? line + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Initial draw
draw();

// Redraw on input
topInput.addEventListener('input', () => draw());
bottomInput.addEventListener('input', () => draw());

randomBtn.addEventListener('click', () => { bg = randomColor(); draw(); });

downloadBtn.addEventListener('click', () => {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meme.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Image upload handling
function setBackgroundImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      backgroundImage = img;
      draw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

uploadInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) setBackgroundImageFromFile(f);
});

clearBgBtn.addEventListener('click', () => {
  backgroundImage = null;
  uploadInput.value = '';
  draw();
});

function drawImageCover(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(w / iw, h / ih);
  const nw = iw * scale;
  const nh = ih * scale;
  const dx = x + (w - nw) / 2;
  const dy = y + (h - nh) / 2;
  ctx.drawImage(img, dx, dy, nw, nh);
}
