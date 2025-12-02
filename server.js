#!/usr/bin/env node
const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { render } = require('./server-render');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_LENGTH = 200;
const MIN_DIMENSION = 800;
const MAX_DIMENSION = 2400;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Validation helper
function validateInput(top, bottom, width, height) {
  const errors = [];
  if (top && top.length > MAX_TEXT_LENGTH) errors.push(`top text exceeds ${MAX_TEXT_LENGTH} chars`);
  if (bottom && bottom.length > MAX_TEXT_LENGTH) errors.push(`bottom text exceeds ${MAX_TEXT_LENGTH} chars`);
  if (width < MIN_DIMENSION || width > MAX_DIMENSION) errors.push(`width must be ${MIN_DIMENSION}-${MAX_DIMENSION}`);
  if (height < MIN_DIMENSION || height > MAX_DIMENSION) errors.push(`height must be ${MIN_DIMENSION}-${MAX_DIMENSION}`);
  return errors;
}

// Simple health
app.get('/', (req, res) => res.send('js-meme renderer OK'));
app.get('/form', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));

// Sarcasm detection helper
function detectSarcasm(text) {
  if (!text) return { confidence: 0, indicators: [] };
  
  const indicators = [];
  let score = 0;
  
  // All caps (common sarcasm indicator)
  if (text === text.toUpperCase() && text.length > 5) {
    score += 0.25;
    indicators.push('ALL_CAPS');
  }
  
  // Excessive punctuation
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 3) {
    score += 0.2;
    indicators.push('EXCESSIVE_PUNCTUATION');
  }
  
  // Sarcasm keywords and patterns
  const sarcasmPatterns = [
    /yeah[,.]? right/i,
    /sure[,.]? (buddy|pal|friend)/i,
    /what could go wrong/i,
    /oh great/i,
    /brilliant/i,
    /wonderful/i,
    /fantastic idea/i,
  ];
  
  for (const pattern of sarcasmPatterns) {
    if (pattern.test(text)) {
      score += 0.3;
      indicators.push('SARCASM_PATTERN');
      break;
    }
  }
  
  // Question with negative sentiment
  if (text.includes('?') && (text.includes('why') || text.includes('how'))) {
    score += 0.1;
    indicators.push('RHETORICAL_QUESTION');
  }
  
  // Clamp confidence to 0-1
  const confidence = Math.min(score, 1.0);
  return { confidence: parseFloat(confidence.toFixed(2)), indicators };
}

// GET /sarcasm
// Detects sarcasm in text. Returns confidence score (0-1) and indicators.
app.get('/sarcasm', (req, res) => {
  const text = req.query.text || '';
  if (!text) {
    return res.status(400).json({ error: 'text parameter required' });
  }
  
  const result = detectSarcasm(text);
  res.json(result);
});

// GET /templates
// Returns available meme templates with preset dimensions and text positions.
app.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'gradient',
      name: 'Gradient Meme',
      description: 'Simple gradient background with top/bottom text',
      width: 1200,
      height: 675,
      textLayout: [
        { position: 'top', y: 0.12 },
        { position: 'bottom', y: 0.88 }
      ]
    },
    {
      id: 'drake',
      name: 'Drake (mock/approve)',
      description: 'Two rows: top row (disapprove), bottom row (approve)',
      width: 1200,
      height: 800,
      textLayout: [
        { position: 'top', y: 0.25 },
        { position: 'bottom', y: 0.75 }
      ]
    },
    {
      id: 'loss',
      name: 'Loss (4-panel)',
      description: 'Four-panel meme layout (coming soon)',
      width: 1200,
      height: 900,
      textLayout: [
        { position: 'top-left', y: 0.25 },
        { position: 'top-right', y: 0.25 },
        { position: 'bottom-left', y: 0.75 },
        { position: 'bottom-right', y: 0.75 }
      ]
    }
  ];
  
  res.json({ templates });
});

// POST /render
// Accepts multipart/form-data with optional file field 'bg' (image)
// and text fields 'top', 'bottom', 'width', 'height'. Returns PNG image.
app.post('/render', upload.single('bg'), async (req, res) => {
  try {
    const top = (req.body.top || '').trim();
    const bottom = (req.body.bottom || '').trim();
    const width = parseInt(req.body.width || '1200', 10);
    const height = parseInt(req.body.height || '675', 10);

    const errors = validateInput(top, bottom, width, height);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (req.file && req.file.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` });
    }

    let bg = null;
    if (req.file && req.file.buffer) bg = req.file.buffer;

    const buffer = await render({ top, bottom, width, height, bg });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="meme.png"');
    res.send(buffer);
  } catch (err) {
    console.error('Render failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /render-dataurl
// Same as /render but returns JSON { dataUrl: "data:image/png;base64,..." }
app.post('/render-dataurl', upload.single('bg'), async (req, res) => {
  try {
    const top = (req.body.top || '').trim();
    const bottom = (req.body.bottom || '').trim();
    const width = parseInt(req.body.width || '1200', 10);
    const height = parseInt(req.body.height || '675', 10);

    const errors = validateInput(top, bottom, width, height);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (req.file && req.file.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` });
    }

    let bg = null;
    if (req.file && req.file.buffer) bg = req.file.buffer;

    const buffer = await render({ top, bottom, width, height, bg });
    const dataUrl = 'data:image/png;base64,' + buffer.toString('base64');
    res.json({ dataUrl });
  } catch (err) {
    console.error('Render failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { app }; // Export for testing

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`js-meme server listening on http://0.0.0.0:${PORT}`);
    console.log(`Open form at http://localhost:${PORT}/form`);
  });
}
