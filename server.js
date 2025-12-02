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
