// Launcher so Render finds dist/index.js regardless of working directory.
// run.js lives next to dist/, so path is resolved from repo root.
const path = require('path');
require(path.join(__dirname, 'dist', 'index.js'));
