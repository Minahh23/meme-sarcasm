const request = require('supertest');
const { app } = require('./server');
const { render } = require('./server-render');
const fs = require('fs');
const path = require('path');

describe('render() function', () => {
  it('renders a meme with text and gradient background', async () => {
    const buffer = await render({
      top: 'Hello',
      bottom: 'World',
      width: 1200,
      height: 675
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // 'P'
    expect(buffer[2]).toBe(0x4e); // 'N'
    expect(buffer[3]).toBe(0x47); // 'G'
  });

  it('renders without text', async () => {
    const buffer = await render({
      top: '',
      bottom: '',
      width: 1200,
      height: 675
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('renders with custom dimensions', async () => {
    const buffer = await render({
      top: 'Test',
      bottom: 'Size',
      width: 1600,
      height: 900
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('POST /render', () => {
  it('returns 200 with PNG data', async () => {
    const res = await request(app)
      .post('/render')
      .field('top', 'Top Text')
      .field('bottom', 'Bottom Text')
      .field('width', '1200')
      .field('height', '675');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('validates text length', async () => {
    const longText = 'a'.repeat(250);
    const res = await request(app)
      .post('/render')
      .field('top', longText)
      .field('bottom', 'Bottom')
      .field('width', '1200')
      .field('height', '675');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0]).toMatch(/exceeds.*chars/);
  });

  it('validates width range', async () => {
    const res = await request(app)
      .post('/render')
      .field('top', 'Top')
      .field('bottom', 'Bottom')
      .field('width', '500')
      .field('height', '675');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/width must be/);
  });

  it('validates height range', async () => {
    const res = await request(app)
      .post('/render')
      .field('top', 'Top')
      .field('bottom', 'Bottom')
      .field('width', '1200')
      .field('height', '3000');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/height must be/);
  });

  it('rejects multiple validation errors', async () => {
    const longText = 'x'.repeat(250);
    const res = await request(app)
      .post('/render')
      .field('top', longText)
      .field('bottom', longText)
      .field('width', '100')
      .field('height', '100');

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(2);
  });
});

describe('POST /render-dataurl', () => {
  it('returns 200 with dataUrl JSON', async () => {
    const res = await request(app)
      .post('/render-dataurl')
      .field('top', 'Top Text')
      .field('bottom', 'Bottom Text')
      .field('width', '1200')
      .field('height', '675');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.dataUrl).toBeDefined();
    expect(res.body.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('validates input', async () => {
    const res = await request(app)
      .post('/render-dataurl')
      .field('top', 'a'.repeat(250))
      .field('bottom', 'Bottom')
      .field('width', '1200')
      .field('height', '675');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('GET /', () => {
  it('returns health message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/js-meme renderer OK/);
  });
});

describe('GET /form', () => {
  it('returns HTML form', async () => {
    const res = await request(app).get('/form');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/Meme/i);
  });
});

describe('GET /sarcasm', () => {
  it('requires text parameter', async () => {
    const res = await request(app).get('/sarcasm');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('detects ALL CAPS sarcasm', async () => {
    const res = await request(app).get('/sarcasm?text=OH%20GREAT%20IDEA');
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBeGreaterThan(0);
    expect(res.body.indicators).toContain('ALL_CAPS');
  });

  it('detects sarcasm patterns', async () => {
    const res = await request(app).get('/sarcasm?text=yeah%20right%20buddy');
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBeGreaterThan(0.2);
    expect(res.body.indicators).toContain('SARCASM_PATTERN');
  });

  it('returns 0 confidence for neutral text', async () => {
    const res = await request(app).get('/sarcasm?text=hello%20world');
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe(0);
  });
});

describe('GET /templates', () => {
  it('returns list of templates', async () => {
    const res = await request(app).get('/templates');
    expect(res.status).toBe(200);
    expect(res.body.templates).toBeDefined();
    expect(res.body.templates.length).toBeGreaterThan(0);
  });

  it('each template has required fields', async () => {
    const res = await request(app).get('/templates');
    const template = res.body.templates[0];
    expect(template.id).toBeDefined();
    expect(template.name).toBeDefined();
    expect(template.width).toBeGreaterThan(0);
    expect(template.height).toBeGreaterThan(0);
    expect(template.textLayout).toBeDefined();
  });
});

describe('POST /generate', () => {
  it('requires description parameter', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ description: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('generates meme spec from natural language description', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ description: 'Tell them: This is fine. On top: Dogs barking' });

    expect(res.status).toBe(200);
    expect(res.body.spec).toBeDefined();
    expect(res.body.source).toBe('heuristic');
    expect(res.body.spec.templateId).toBeDefined();
    expect(res.body.spec.top).toBeDefined();
    expect(res.body.spec.bottom).toBeDefined();
    expect(res.body.spec.width).toBeGreaterThan(0);
    expect(res.body.spec.height).toBeGreaterThan(0);
  });

  it('splits description by sentence', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ description: 'Me studying. Me before the exam.' });

    expect(res.status).toBe(200);
    expect(res.body.spec.top).toBeTruthy();
    expect(res.body.spec.bottom).toBeTruthy();
  });

  it('handles key:value format', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ description: 'top: Success\nbottom: Failure\ntemplate: drake' });

    expect(res.status).toBe(200);
    expect(res.body.spec.top).toMatch(/Success/);
    expect(res.body.spec.bottom).toMatch(/Failure/);
    expect(res.body.spec.templateId).toBe('drake');
  });

  it('clamps text length to MAX_TEXT_LENGTH', async () => {
    const longText = 'a'.repeat(300);
    const res = await request(app)
      .post('/generate')
      .send({ description: `top: ${longText}` });

    expect(res.status).toBe(200);
    expect(res.body.spec.top.length).toBeLessThanOrEqual(200);
  });
});
