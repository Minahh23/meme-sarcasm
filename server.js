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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

    // Helper: fallback parser that converts a free-text description into a meme spec
    function parseDescriptionFallback(description) {
      const spec = {
        templateId: 'gradient',
        top: '',
        bottom: '',
        width: 1200,
        height: 675,
        bg: null
      };

      if (!description) return spec;

      // Try simple key:value parsing (top: ..., bottom: ...)
      const lines = description.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const kv = line.split(/:\s*/);
        if (kv.length >= 2) {
          const key = kv[0].toLowerCase();
          const val = kv.slice(1).join(':').trim();
          if (key.startsWith('top')) spec.top = val;
          else if (key.startsWith('bottom')) spec.bottom = val;
          else if (key === 'template' || key === 'templateid') spec.templateId = val;
          else if (key === 'width') spec.width = parseInt(val, 10) || spec.width;
          else if (key === 'height') spec.height = parseInt(val, 10) || spec.height;
        }
      }

      // If no explicit top/bottom, heuristically split sentence in half
      if (!spec.top && !spec.bottom) {
        const sentences = description.split(/[\.\!\?]+\s*/).filter(Boolean);
        if (sentences.length >= 2) {
          spec.top = sentences[0];
          spec.bottom = sentences.slice(1).join(' ');
        } else {
          // split by comma or mid-point
          const commaSplit = description.split(',').map(s => s.trim()).filter(Boolean);
          if (commaSplit.length >= 2) {
            spec.top = commaSplit[0];
            spec.bottom = commaSplit.slice(1).join(', ');
          } else {
            const words = description.split(/\s+/);
            const mid = Math.ceil(words.length / 2);
            spec.top = words.slice(0, mid).join(' ');
            spec.bottom = words.slice(mid).join(' ');
          }
        }
      }

      // Clamp text lengths
      spec.top = spec.top.slice(0, MAX_TEXT_LENGTH);
      spec.bottom = spec.bottom.slice(0, MAX_TEXT_LENGTH);

      return spec;
    }

    // POST /generate
    // Accepts JSON { description: string } and returns a strict meme spec JSON.
    app.post('/generate', async (req, res) => {
      try {
        const description = (req.body.description || '').toString().trim();
        if (!description) return res.status(400).json({ error: 'description required' });

        // If LLAMA4_API_URL is configured, try calling it. Expect JSON response or text containing JSON.
        const apiUrl = process.env.LLAMA4_API_URL;
        const apiKey = process.env.LLAMA4_API_KEY;

        if (apiUrl && apiKey) {
          try {
            const prompt = `Produce a JSON object with fields: templateId (string), top (string), bottom (string), width (number), height (number). Respond with only valid JSON.` +
              `\nDescription:\n${description}`;

            const resp = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({ input: prompt, max_tokens: 256 })
            });

            const text = await resp.text();
            // Try parse JSON directly, otherwise try to extract JSON substring
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch (e) {
              const m = text.match(/\{[\s\S]*\}/);
              if (m) {
                try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
              }
            }

            if (parsed && typeof parsed === 'object') {
              // Normalize and validate fields
              const spec = {
                templateId: parsed.templateId || 'gradient',
                top: (parsed.top || '').toString().slice(0, MAX_TEXT_LENGTH),
                bottom: (parsed.bottom || '').toString().slice(0, MAX_TEXT_LENGTH),
                width: parseInt(parsed.width, 10) || 1200,
                height: parseInt(parsed.height, 10) || 675,
                bg: parsed.bg || null
              };
              return res.json({ spec, source: 'llama' });
            }
          } catch (err) {
            console.warn('LLAMA4 call failed, falling back to heuristic parser:', err && err.message);
          }
        }

        // Fallback
        const fallback = parseDescriptionFallback(description);
        res.json({ spec: fallback, source: 'heuristic' });
      } catch (err) {
        console.error('Generate failed:', err);
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
