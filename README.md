# JS Meme Generator

[![CI](https://github.com/Minahh23/meme-sarcasm/actions/workflows/nodejs.yml/badge.svg?branch=master)](https://github.com/Minahh23/meme-sarcasm/actions/workflows/nodejs.yml)

Simple meme generator with client-side UI, CLI rendering, and Express microservice.

## Features

- **Client-side (`index.html`)**: Interactive meme editor with gradient backgrounds and image upload
- **CLI (`server-render.js`)**: Render memes from the command line
- **Microservice (`server.js`)**: HTTP endpoints for programmatic rendering
- **Form UI (`form.html`)**: Web form for testing the microservice
- **Tests (`test.js`)**: Jest tests for all rendering logic and endpoints

## Quick Start

### Browser (client)

1. Open `index.html` in your browser
2. Edit top/bottom text
3. Upload an image (optional) or use random gradient backgrounds
4. Download PNG

### CLI

```bash
cd automateo/js-meme
npm install
node server-render.js --top "TOP" --bottom "BOTTOM" --out out.png --bg path/to/bg.jpg
```

### Microservice

```bash
cd automateo/js-meme
npm install
npm start
# Opens on http://localhost:3000
# Visit http://localhost:3000/form for the demo UI
```

#### Render endpoint (returns PNG binary)
```bash
curl -X POST http://localhost:3000/render \
  -F "top=Hello" \
  -F "bottom=World" \
  -F "bg=@image.jpg" \
  --output meme.png
```

#### Render data-URL endpoint (returns JSON)
```bash
curl -X POST http://localhost:3000/render-dataurl \
  -F "top=Hello" \
  -F "bottom=World" | jq .dataUrl
```

### Docker

```bash
cd automateo/js-meme
docker build -t js-meme .
docker run -p 3000:3000 js-meme
```

### Docker Hub Deployment

Tags of the form `v*.*.* ` (e.g., `v1.0.0`) trigger an automatic Docker build and push to Docker Hub.

1. Create a GitHub secret `DOCKER_USERNAME` and `DOCKER_PASSWORD` in your repo settings.
2. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
3. GitHub Actions builds and pushes to Docker Hub automatically.
4. Pull the image: `docker pull <username>/js-meme:v1.0.0`

## Validation

The microservice validates all inputs:

- **Text**: max 200 characters each
- **Dimensions**: width and height must be 800–2400 px
- **File size**: images limited to 5 MB

Validation errors return HTTP 400 with a JSON error list.

## Testing

```bash
cd automateo/js-meme
npm install --save-dev
npm test
```

Tests cover:
- render() function with text, dimensions, and images
- POST /render endpoint validation
- POST /render-dataurl endpoint
- Input validation (text length, dimensions)
- Health check endpoints

## Native Dependencies

On Linux/macOS, `canvas` requires native libraries:

```bash
node check-native.js  # Prints install instructions
```

Windows users should install via Docker or follow: https://www.npmjs.com/package/canvas

## Endpoints

| Method | Path | Input | Output |
|--------|------|-------|--------|
| GET | `/` | — | Health message |
| GET | `/form` | — | HTML form demo |
| GET | `/templates` | — | JSON list of meme templates |
| GET | `/sarcasm` | `text` query param | JSON `{confidence, indicators}` |
| POST | `/render` | Form-data (top, bottom, bg, width, height) | PNG binary |
| POST | `/render-dataurl` | Form-data (top, bottom, bg, width, height) | JSON `{dataUrl: "..."}`|

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

## Features

### Sarcasm Detection API

```bash
curl "http://localhost:3000/sarcasm?text=oh%20great%20idea"
# Returns: { "confidence": 0.45, "indicators": ["ALL_CAPS", "SARCASM_PATTERN"] }
```

Detects sarcasm using:
- ALL CAPS text
- Excessive punctuation
- Sarcasm keywords and patterns
- Rhetorical questions

### Meme Templates

```bash
curl http://localhost:3000/templates
# Returns list of templates with preset dimensions and text positions
```

Includes:
- Gradient (default)
- Drake (mock/approve)
- Loss (4-panel, coming soon)

## Branch Protection (optional)

To require CI pass and PR reviews before merging to `master`:

1. Go to **Settings** → **Branches** → **Add rule**
2. Pattern: `master`
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (set to 1 or more)
   - ✅ **Require status checks to pass before merging** → Select "CI - Node.js"
   - ✅ **Require branches to be up to date before merging**
4. Click **Create**
