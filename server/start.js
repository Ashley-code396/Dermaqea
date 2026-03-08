const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.mjs'),
];

let entry = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    entry = c;
    break;
  }
}

if (!entry) {
  console.error('No server entry found. Checked locations:');
  for (const c of candidates) console.error('  -', c);
  process.exit(1);
}

console.log('Starting server from', entry);
require(entry);
