import { PUBLIC } from './_public.js';
import { LOCALES, getChrome, langSwitcher, localePath } from './i18n.js';

const SITE = 'https://lahoma.app';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value) {
  let text = escapeHtml(value);
  text = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return text;
}

export function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').slice(0, 50000).split('\n');
  let html = '';
  let list = '';
  const close = () => {
    if (!list) return;
    html += list === 'ol' ? '</ol>' : '</ul>';
    list = '';
  };
  for (const line of lines) {
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      close();
      const level = heading[1].length;
      html += `<h${level + 1}>${inline(heading[2])}</h${level + 1}>`;
      continue;
    }
    const bullet = /^- (.+)$/.exec(line);
    if (bullet) {
      if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inline(bullet[1])}</li>`;
      continue;
    }
    const numbered = /^\d+\. (.+)$/.exec(line);
    if (numbered) {
      if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inline(numbered[1])}</li>`;
      continue;
    }
    if (!line.trim()) { close(); continue; }
    close();
    html += `<p>${inline(line)}</p>`;
  }
  close();
  return html;
}

const MARK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>`;

function current(path, section) {
  return path === section || path.startsWith(section + '/') ? ' aria-current="page"' : '';
}

export function layout({ title, description, path = '/', body, robots = 'index,follow', jsonLd = null, article = false, locale = 'es' }) {
  const loc = LOCALES.find(l => l.code === locale) || LOCALES[0];
  const c = getChrome(loc.code);
  const homeHref = localePath(loc.code, '/');
  const howHref = localePath(loc.code, '/como-funciona');
  const famHref = localePath(loc.code, '/familias');
  const privHref = localePath(loc.code, '/privacidad');
  const bare = path.replace(/^\/(ca|va|eu|gl|en|fr|it|de)(?=\/|$)/, '') || '/';
  const canonicalPath = localePath(loc.code, bare === '' ? '/' : bare);
  const canonical = SITE + (canonicalPath === '/' ? '/' : canonicalPath);
  const fullTitle = title.includes('La Homa') ? title : `${title} · La Homa`;
  const alts = LOCALES.map(l => `<link rel="alternate" hreflang="${l.code === 'va' ? 'ca-valencia' : l.htmlLang}" href="${SITE}${localePath(l.code, bare === '' ? '/' : bare) === '/' ? '/' : localePath(l.code, bare === '' ? '/' : bare)}">`).join('\n');
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="${loc.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
${alts}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta name="robots" content="${escapeHtml(robots)}">
<meta name="theme-color" content="#7851b5">
<meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:locale" content="${loc.og}">
<meta property="og:site_name" content="La Homa">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site.css?v=3">
${ld}
</head>
<body>
<a class="skip" href="#contenido">${escapeHtml(c.skip)}</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${homeHref}" aria-label="La Homa"><span class="brand-mark">${MARK}</span><span>La Homa<small>${escapeHtml(c.brandSub)}</small></span></a>
    <input id="menu" class="menu-check" type="checkbox" aria-label="${escapeHtml(c.how)}">
    <label class="menu-button" for="menu" aria-hidden="true"><span></span><span></span></label>
    <div class="menu-panel">
      <nav class="site-nav" aria-label="La Homa">
        <a href="${howHref}"${current(bare, '/como-funciona')}>${escapeHtml(c.how)}</a>
        <a href="${famHref}"${current(bare, '/familias')}>${escapeHtml(c.forWhom)}</a>
        <a href="/blog"${current(bare, '/blog')}>${escapeHtml(c.blog)}</a>
      </nav>
      <div class="header-actions">
        ${langSwitcher(loc.code, bare === '' ? '/' : bare)}
        <a class="link-quiet" href="${PUBLIC.app}">${escapeHtml(c.enter)}</a>
        <a class="button small" href="${PUBLIC.app}">${escapeHtml(c.create)}</a>
      </div>
    </div>
  </div>
</header>
<main id="contenido">${body}</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">
      <a class="brand" href="${homeHref}"><span class="brand-mark">${MARK}</span><span>La Homa<small>${escapeHtml(c.brandSub)}</small></span></a>
      <p>${escapeHtml(c.footerTag)}</p>
    </div>
    <nav aria-label="La Homa">
      <b>La Homa</b>
      <a href="${howHref}">${escapeHtml(c.how)}</a>
      <a href="${famHref}">${escapeHtml(c.forWhom)}</a>
      <a href="/blog">${escapeHtml(c.blog)}</a>
    </nav>
    <nav aria-label="${escapeHtml(c.footerApp)}">
      <b>${escapeHtml(c.footerApp)}</b>
      <a href="${PUBLIC.app}">${escapeHtml(c.enter)}</a>
      <a href="${PUBLIC.app}">${escapeHtml(c.create)}</a>
    </nav>
    <nav aria-label="${escapeHtml(c.footerInfo)}">
      <b>${escapeHtml(c.footerInfo)}</b>
      <a href="${privHref}">${escapeHtml(c.privacy)}</a>
    </nav>
  </div>
  <div class="wrap footer-bottom">
    <span>© ${new Date().getFullYear()} La Homa</span>
    <span>${escapeHtml(c.tagline)}</span>
  </div>
  <div class="wrap footer-langs">${langSwitcher(loc.code, bare === '' ? '/' : bare)}</div>
</footer>
</body>
</html>`;
}

export const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy': "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
};

export function htmlResponse(document, status = 200, extra = {}) {
  return new Response(document, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      ...extra
    }
  });
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(date);
}

export async function publishedPosts(filters = '') {
  const query = `site_posts?select=slug,title,excerpt,body,seo_title,seo_description,published_at&status=eq.published&order=published_at.desc${filters || '&limit=200'}`;
  const response = await fetch(`${PUBLIC.url}/rest/v1/${query}`, {
    headers: {
      apikey: PUBLIC.anonKey,
      authorization: `Bearer ${PUBLIC.anonKey}`,
      accept: 'application/json'
    }
  });
  if (!response.ok) return { ok: false, posts: [] };
  const posts = await response.json();
  return { ok: true, posts: Array.isArray(posts) ? posts : [] };
}

export function blogIndexDocument(posts, ready) {
  const list = posts.length
    ? `<ul class="post-list">${posts.map(post => `<li><a href="/blog/${escapeHtml(post.slug)}"><time datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(formatDate(post.published_at))}</time><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.excerpt || '')}</p></a></li>`).join('')}</ul>`
    : `<div class="empty-note"><h2>Todavía no hay artículos</h2><p>Estamos escribiendo los primeros. Mientras tanto, puedes ver <a href="/como-funciona">cómo es una semana con La Homa</a>.</p></div>`;
  return layout({
    title: 'Blog',
    description: 'Ideas y guías de La Homa para organizar la casa, la semana y el dinero familiar.',
    path: '/blog',
    robots: posts.length ? 'index,follow' : 'noindex,follow',
    body: `<article class="wrap page narrow"><p class="eyebrow">Blog</p><h1>Ideas para organizar la casa</h1><p class="lede">Artículos sobre tareas, paga, convivencia y cocina en familia, escritos a partir de lo que funciona en casas reales.</p>${ready ? list : '<div class="empty-note"><h2>No hemos podido cargar los artículos</h2><p>Vuelve a intentarlo en un momento.</p></div>'}</article>`
  });
}

export function articleDocument(post) {
  const title = (post.seo_title || post.title).slice(0, 70);
  const description = (post.seo_description || post.excerpt || post.title).slice(0, 180);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.published_at,
    dateModified: post.published_at,
    description,
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'La Homa' },
    publisher: { '@type': 'Organization', name: 'La Homa' }
  };
  return layout({
    title,
    description,
    path: `/blog/${post.slug}`,
    article: true,
    jsonLd,
    body: `<article class="wrap page narrow article"><p class="eyebrow"><a href="/blog">Blog</a></p><h1>${escapeHtml(post.title)}</h1><p class="byline"><time datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(formatDate(post.published_at))}</time></p><div class="prose">${renderMarkdown(post.body)}</div><aside class="article-cta"><h2>Organiza tu casa con La Homa</h2><p>Tareas con puntos, paga y ahorro, calendario y menú de toda la familia en un mismo sitio.</p><a class="button" href="${PUBLIC.app}">Crear mi casa</a></aside><p class="back"><a href="/blog">Volver al blog</a></p></article>`
  });
}

export function notFoundDocument(locale = 'es') {
  const c = getChrome(locale);
  return layout({
    title: c.notFoundTitle,
    description: c.notFoundLede,
    path: '/404',
    robots: 'noindex,follow',
    locale,
    body: `<article class="wrap page narrow"><p class="eyebrow">404</p><h1>${escapeHtml(c.notFoundH1)}</h1><p class="lede">${escapeHtml(c.notFoundLede)}</p><div class="actions"><a class="button" href="${localePath(locale, '/')}">${escapeHtml(c.homeLink)}</a><a class="button quiet" href="${PUBLIC.app}">${escapeHtml(c.enterApp)}</a></div></article>`
  });
}

export function sitemap(posts) {
  const base = ['/', '/como-funciona', '/familias', '/blog', '/privacidad', ...posts.map(post => `/blog/${post.slug}`)];
  const urls = [];
  for (const path of base) {
    for (const loc of LOCALES) {
      if (path.startsWith('/blog') && loc.code !== 'es') continue;
      const p = localePath(loc.code, path);
      urls.push(p === '/' ? '/' : p);
    }
  }
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(path => `  <url><loc>${SITE}${path === '/' ? '/' : path}</loc></url>`),
    '</urlset>',
    ''
  ].join('\n');
  return body;
}

export { PUBLIC, SITE };
