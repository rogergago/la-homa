'use strict';
const fs = require('node:fs');
const path = require('node:path');

function readPublicConfig(root) {
  const file = path.join(root, 'config.js');
  const src = fs.readFileSync(file, 'utf8');
  const url = src.match(/url:\s*'([^']+)'/);
  const key = src.match(/anonKey:\s*'([^']+)'/);
  if (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url[1])) throw new Error('La URL pública de Supabase no es válida');
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key[1])) throw new Error('La clave pública de Supabase no es válida');
  if (/sb_secret|service_role/i.test(url[1] + key[1])) throw new Error('config.js contiene una clave que no puede publicarse');
  return { url: url[1], anonKey: key[1], site: 'https://lahoma.app', app: 'https://app.lahoma.app' };
}

module.exports = { readPublicConfig };
