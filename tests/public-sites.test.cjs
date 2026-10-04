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
  assert.match(fs.readFileSync(path.join(dist, 'privacidad', 'index.html'), 'utf8'), /no abre los nombres/);
  assert.match(home, /"@type":"FAQPage"/);
  assert.doesNotMatch(home, /style="/);
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
  const headers = fs.readFileSync(path.join(dist, '_headers'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');
  assert.match(html, /noindex/);
  assert.match(html, /\.\/supabase\.js/);
  assert.doesNotMatch(html, /jsdelivr/);
  assert.ok(fs.existsSync(path.join(dist, 'supabase.js')));
  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(config + source, /sb_secret|service_role/);
  assert.doesNotMatch(source, /signInWithOAuth/);
  assert.match(source, /homa_is_operator/);
  assert.match(source, /homa_admin_dashboard/);
  assert.match(source, /homa_admin_delete_household/);
  assert.match(source, /mfa\.challengeAndVerify|mfa\.enroll/);
  assert.match(source, /hasAal2|tokenAal/);
  assert.match(source, /requireMfa/);
  assert.doesNotMatch(source, /style="/);
  assert.match(headers, /Strict-Transport-Security/);
  assert.doesNotMatch(headers, /jsdelivr/);
  assert.match(fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8'), /Disallow: \//);
});

test('operator panel SQL guards every action and never opens the inside of a house', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '0004_operator_panel.sql'), 'utf8');
  const publicFunctions = [...sql.matchAll(/grant execute on function public\.(homa_admin_\w+)\(/g)].map(match => match[1]);
  assert.ok(publicFunctions.length >= 10);
  for (const name of publicFunctions) {
    const body = sql.split(`create or replace function public.${name}(`)[1].split('$$;')[0];
    assert.match(body, /homa_admin_guard\(\)/, `${name} must check the operator`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon;`));
  }
  assert.match(sql, /revoke all on function public\.homa_admin_household_card\(public\.homa_households\) from public, anon, authenticated/);
  assert.match(sql, /revoke all on public\.homa_household_contacts, public\.homa_operator_log, public\.homa_storage_trash from public, anon, authenticated/);
  assert.match(sql, /raise exception 'CONFIRM_MISMATCH'/);
  assert.doesNotMatch(sql, /data->>'name'|data->'photo'|data->>'photo'|data->>'amount'|data->>'balance'|service_role/);
});

test('operator SQL counts people and does not return the inside of a house', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '0003_site_and_operators.sql'), 'utf8');
  assert.match(sql, /raise exception 'FORBIDDEN'/);
  assert.match(sql, /e\.data->>'role' = 'member'/);
  assert.match(sql, /for select to anon\s+using \(status = 'published'\)/);
  assert.doesNotMatch(sql, /data->>'name'|data->>'photo'|finance|service_role/);
  assert.match(sql, /revoke all on function public\.homa_operator_overview\(\) from public, anon/);
});

test('security hardening requires MFA for operators and hardens invites and sync', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '0005_security_hardening.sql'), 'utf8');
  assert.match(sql, /raise exception 'MFA_REQUIRED'/);
  assert.match(sql, /auth\.jwt\(\)->>'aal'/);
  assert.match(sql, /homa_operator_session/);
  assert.match(sql, /gen_random_bytes\(8\)/);
  assert.match(sql, /TOO_MANY_ATTEMPTS/);
  assert.match(sql, /QUOTA_EXCEEDED/);
  assert.match(sql, /drop function if exists public\.homa_operator_overview\(\)/);
  assert.match(sql, /revoke all on function public\.homa_can_read\(uuid\) from public, anon/);
  const purge = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'homa-admin-purge', 'index.ts'), 'utf8');
  assert.match(purge, /homa_operator_session/);
  assert.doesNotMatch(purge, /homa_is_operator/);
});

test('app build ships local supabase client and closed CSP', () => {
  const build = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build.cjs'), 'utf8');
  assert.match(build, /vendor['",/\\]+supabase\.js/);
  assert.doesNotMatch(build, /jsdelivr/);
  assert.match(build, /Strict-Transport-Security/);
  const transport = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud-transport.js'), 'utf8');
  assert.match(transport, /\.\/supabase\.js/);
  assert.doesNotMatch(transport, /jsdelivr/);
  assert.match(transport, /TOO_MANY_ATTEMPTS/);
});
