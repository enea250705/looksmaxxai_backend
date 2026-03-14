// When Render uses Root Directory "src", start runs from here. Load dist from repo root.
const path = require('path');
require(path.join(__dirname, '..', 'dist', 'index.js'));
