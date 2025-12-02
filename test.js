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
