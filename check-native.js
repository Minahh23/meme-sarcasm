const { execSync } = require('child_process');
const os = require('os');

function checkCmd(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function main() {
  console.log('Checking native dependencies for node-canvas...');
  const platform = os.platform();
  if (platform === 'win32') {
    console.log('Windows detected. Ensure you have windows-build-tools and required libraries.');
    console.log('Recommended: install windows-build-tools and follow canvas docs: https://www.npmjs.com/package/canvas');
    return;
  }

  // Check for pkg-config and cairo
  if (!checkCmd('pkg-config --version')) {
    console.log('\n`pkg-config` not found. On Debian/Ubuntu install:');
    console.log('  sudo apt-get update; sudo apt-get install -y pkg-config build-essential');
    console.log('On macOS install pkg-config via Homebrew: `brew install pkg-config`');
    return;
  }

  const libs = ['cairo', 'pango', 'libpng', 'jpeg'];
  const missing = [];
  for (const lib of libs) {
    try {
      execSync(`pkg-config --exists ${lib}`);
    } catch (e) {
      missing.push(lib);
    }
  }

  if (missing.length === 0) {
    console.log('Looks good: required libraries found via pkg-config.');
    console.log('You should be able to `npm install` canvas.');
  } else {
    console.log('\nMissing native libraries:', missing.join(', '));
    console.log('On Debian/Ubuntu install:');
    console.log('  sudo apt-get update; sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config');
    console.log('On macOS use Homebrew: `brew install pkg-config cairo pango libpng jpeg librsvg`');
  }
}

main();
