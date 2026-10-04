'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSite } = require('../site/build.cjs');
const { buildAdmin } = require('../admin/build.cjs');

test('marketing pages explain the product and stay free of secrets', async () => {
  const dist = await buildSite();
  const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.match(home, /Tu vida familiar, organizada/);
  assert.match(home, /https:\/\/app\.lahoma\.app/);
  assert.match(home, /no suman puntos/);
  assert.doesNotMatch(home, /sb_secret|service_role|Iniciar sesión con Apple/);
  assert.match(fs.readFileSync(path.join(dist, 'como-funciona', 'index.html'), 'utf8'), /correo o con Google/);
  assert.match(fs.readFileSync(path.join(dist, 'familias', 'index.html'), 'utf8'), /Custodia compartida/);
  assert.match(fs.readFileSync(path.join(dist, 'privacidad', 'index.html'), 'utf8'), /No abre nombres/);
  assert.match(fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/lahoma\.app\/sitemap\.xml/);
  const { renderMarkdown, blogIndexDocument, articleDocument, sitemap } = await import('../site/functions/_lib.js');
  assert.match(renderMarkdown('<script>alert(1)</script>'), /&lt;script&gt;/);
  assert.doesNotMatch(renderMarkdown('[malo](javascript:alert(1))'), /href="javascript:/);
  assert.match(renderMarkdown('**hola** y [web](https://lahoma.app)'), /<strong>hola<\/strong>/);
  assert.match(renderMarkdown('**hola** y [web](https://lahoma.app)'), /href="https:\/\/lahoma\.app"/);
  const index = blogIndexDocument([{ slug: 'la-semana', title: 'La semana', excerpt: 'Una casa', published_at: '2026-10-04T10:00:00Z' }], true);
  assert.match(index, /href="\/blog\/la-semana"/);
  assert.match(index, /rel="canonical" href="https:\/\/lahoma\.app\/blog"/);
  const article = articleDocument({ slug: 'la-semana', title: 'La semana', excerpt: 'Una casa', seo_title: '', seo_description: '', body: '# Dentro\n\nTexto', published_at: '2026-10-04T10:00:00Z' });
  assert.match(article, /<h1>La semana<\/h1>/);
  assert.match(article, /<h2>Dentro<\/h2>/);
  assert.match(article, /"@type":"Article"/);
  assert.match(sitemap([{ slug: 'la-semana' }]), /<loc>https:\/\/lahoma\.app\/blog\/la-semana<\/loc>/);
});

test('admin is a noindex operator panel without a secret', () => {
  const dist = buildAdmin();
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(dist, 'config.js'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');
  assert.match(html, /noindex/);
  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(config + source, /sb_secret|service_role/);
  assert.match(source, /homa_is_operator/);
  assert.match(source, /homa_operator_overview/);
  assert.match(fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8'), /Disallow: \//);
});

test('operator SQL counts people and does not return the inside of a house', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '0003_site_and_operators.sql'), 'utf8');
  assert.match(sql, /raise exception 'FORBIDDEN'/);
  assert.match(sql, /e\.data->>'role' = 'member'/);
  assert.match(sql, /for select to anon\s+using \(status = 'published'\)/);
  assert.doesNotMatch(sql, /data->>'name'|data->>'photo'|finance|service_role/);
  assert.match(sql, /revoke all on function public\.homa_operator_overview\(\) from public, anon/);
});
