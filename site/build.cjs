'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readPublicConfig } = require('../scripts/public-config.cjs');

async function buildSite() {
  const config = readPublicConfig(path.resolve(__dirname, '..'));
  const publicFile = path.join(__dirname, 'functions', '_public.js');
  const safe = { url: config.url, anonKey: config.anonKey, site: config.site, app: config.app };
  fs.writeFileSync(publicFile, `export const PUBLIC = ${JSON.stringify(safe)};\n`);
  const lib = await import('./functions/_lib.js');
  const { pagesFor } = await import('./content.js');
  const i18n = await import('./i18n.js');
  const dist = path.join(__dirname, 'dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  for (const loc of i18n.LOCALES) {
    for (const page of pagesFor(loc.code)) {
      const file = path.join(dist, page.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const html = lib.layout({
        title: page.title,
        description: page.description,
        path: page.path,
        body: page.body,
        jsonLd: page.jsonLd || null,
        locale: loc.code
      });
      if (/sb_secret|service_role/.test(html)) throw new Error('La web comercial contiene una clave secreta');
      fs.writeFileSync(file, html);
    }
  }

  fs.writeFileSync(path.join(dist, '404.html'), lib.notFoundDocument('es'));
  for (const name of ['site.css', 'favicon.svg', 'robots.txt', '_headers', '_routes.json']) {
    fs.copyFileSync(path.join(__dirname, name), path.join(dist, name));
  }
  return dist;
}

if (require.main === module) {
  buildSite().then(dist => console.log('Web comercial en', dist)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { buildSite };
