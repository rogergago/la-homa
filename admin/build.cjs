'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readPublicConfig } = require('../scripts/public-config.cjs');

function buildAdmin() {
  const config = readPublicConfig(path.resolve(__dirname, '..'));
  const dist = path.join(__dirname, 'dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  const configJs = `window.HOMA_PUBLIC=${JSON.stringify({ url: config.url, anonKey: config.anonKey })};\n`;
  if (/sb_secret|service_role/.test(configJs)) throw new Error('El panel contiene una clave secreta');
  fs.writeFileSync(path.join(dist, 'config.js'), configJs);
  for (const name of ['index.html', 'admin.css', 'admin.js', 'favicon.svg', 'robots.txt', '_headers']) {
    fs.copyFileSync(path.join(__dirname, name), path.join(dist, name));
  }
  return dist;
}

if (require.main === module) console.log('Panel en', buildAdmin());
module.exports = { buildAdmin };
