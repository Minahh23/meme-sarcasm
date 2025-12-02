# Contributing to JS Meme Generator

Thanks for your interest in contributing! This document outlines the process for contributing code, reporting issues, and submitting pull requests.

## Setup

1. **Clone the repo**:
   ```bash
   git clone https://github.com/Minahh23/meme-sarcasm.git
   cd meme-sarcasm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   On macOS/Linux, if `canvas` fails to build, run:
   ```bash
   node check-native.js  # Prints install instructions
   ```

3. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

## Development

### Running locally

**Client (browser)**:
- Open `index.html` in your browser or use a local HTTP server:
  ```bash
  npx http-server
  ```

**CLI**:
```bash
node server-render.js --top "Hello" --bottom "World" --out out.png
```

**Microservice**:
```bash
npm start
# Visit http://localhost:3000/form to test the UI
```

**Tests**:
```bash
npm test
```

### Coding Standards

- Use **semicolons** at the end of statements.
- Use **const/let** instead of `var`.
- Aim for **descriptive variable names**.
- Add comments for non-obvious logic.
- Keep functions small and focused.

### Adding Features

1. **Update `server-render.js`** if adding new render options (e.g., filters, fonts).
2. **Update `server.js`** if adding new endpoints; add validation and error handling.
3. **Update `form.html`** and `meme.js` for client-side UI changes.
4. **Write tests** in `test.js` for all new render functions and endpoints.
5. **Run tests** before committing:
   ```bash
   npm test
   ```

### Fixing Bugs

1. Create a branch off `master`: `git checkout -b fix/bug-name`
2. Add a test that reproduces the bug.
3. Fix the bug.
4. Ensure the test passes: `npm test`
5. Submit a PR with a clear description.

## Pull Request Process

1. **Ensure tests pass**: `npm test`
2. **Update documentation** if needed (README, comments, etc.).
3. **Commit with clear messages**:
   ```bash
   git commit -m "Add feature: brief description"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feature/my-feature
   ```
5. **Open a PR** on GitHub with:
   - Clear title and description
   - Reference to any related issues (#123)
   - Screenshots for UI changes

6. **Address review feedback** by pushing new commits (do not force-push unless asked).

## Testing

- All tests must pass before merge.
- GitHub Actions runs tests automatically on push/PR.
- Aim for tests covering:
  - Happy path (valid inputs)
  - Edge cases (empty strings, max dimensions, large files)
  - Error cases (invalid inputs, missing fields)

Example test structure:
```javascript
describe('Feature: my feature', () => {
  it('should do X when given Y', () => {
    // arrange
    // act
    // assert
  });
});
```

## Reporting Issues

If you find a bug or have a feature request:

1. Check existing issues at https://github.com/Minahh23/meme-sarcasm/issues
2. If not found, open a new issue with:
   - Clear title
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Your environment (OS, Node version, browser if client issue)

## Code of Conduct

Be respectful and constructive. We welcome all contributions.

## Questions?

Open an issue or discussion at https://github.com/Minahh23/meme-sarcasm

---

**Happy coding!** 🎨
