import { PUBLIC } from './_public.js';

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

export function layout({ title, description, path = '/', body, robots = 'index,follow', jsonLd = null, article = false }) {
  const canonical = SITE + (path === '/' ? '/' : path);
  const fullTitle = title.includes('La Homa') ? title : `${title} · La Homa`;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="robots" content="${escapeHtml(robots)}">
<meta name="theme-color" content="#7851b5">
<meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="La Homa">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site.css">
${ld}
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="site-header">
  <a class="brand" href="/"><span class="brand-mark">${MARK}</span><span>La Homa<small>Organización familiar</small></span></a>
  <input id="menu" class="menu-check" type="checkbox">
  <label class="menu-button" for="menu">Menú</label>
  <nav class="site-nav" aria-label="Secciones">
    <a href="/como-funciona">Cómo funciona</a>
    <a href="/familias">Familias</a>
    <a href="/blog">Blog</a>
    <a href="/privacidad">Privacidad</a>
  </nav>
  <a class="button" href="${PUBLIC.app}">Abrir la app</a>
</header>
<main id="contenido">${body}</main>
<footer class="site-footer">
  <div>
    <strong>La Homa</strong>
    <p>Tu vida familiar, organizada.</p>
  </div>
  <nav aria-label="Pie">
    <a href="/como-funciona">Cómo funciona</a>
    <a href="/familias">Familias</a>
    <a href="/blog">Blog</a>
    <a href="/privacidad">Privacidad</a>
    <a href="${PUBLIC.app}">Entrar</a>
  </nav>
</footer>
</body>
</html>`;
}

export function htmlResponse(document, status = 200, extra = {}) {
  return new Response(document, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
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
  const query = `site_posts?select=slug,title,excerpt,body,seo_title,seo_description,published_at&status=eq.published&order=published_at.desc${filters}`;
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
    : `<div class="empty-note"><h2>Todavía no hay artículos</h2><p>Cuando publiquemos el primero, aparecerá aquí con su propia dirección.</p></div>`;
  return layout({
    title: 'Blog',
    description: 'Ideas y guías de La Homa para organizar la casa, la semana y el dinero familiar.',
    path: '/blog',
    robots: posts.length ? 'index,follow' : 'noindex,follow',
    body: `<article class="page narrow"><p class="eyebrow">Blog</p><h1>Notas para la casa</h1><p class="lede">Textos claros sobre organización familiar. Cada artículo tiene su dirección para que pueda encontrarse.</p>${ready ? list : '<div class="empty-note"><h2>El blog se está preparando</h2><p>Vuelve en un momento. La página ya está reservada.</p></div>'}</article>`
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
    body: `<article class="page narrow article"><p class="eyebrow">Blog</p><h1>${escapeHtml(post.title)}</h1><p class="byline"><time datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(formatDate(post.published_at))}</time></p><div class="prose">${renderMarkdown(post.body)}</div><p class="back"><a href="/blog">Volver al blog</a></p></article>`
  });
}

export function notFoundDocument() {
  return layout({
    title: 'Página no encontrada',
    description: 'Esa dirección no existe en La Homa.',
    path: '/404',
    robots: 'noindex,follow',
    body: `<article class="page narrow"><p class="eyebrow">404</p><h1>Esta página no está</h1><p class="lede">Puedes volver al inicio o entrar en la app.</p><p><a class="button" href="/">Ir al inicio</a></p></article>`
  });
}

export function sitemap(posts) {
  const urls = ['/', '/como-funciona', '/familias', '/blog', '/privacidad', ...posts.map(post => `/blog/${post.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path => `  <url><loc>${SITE}${path === '/' ? '/' : path}</loc></url>`).join('\n')}\n</urlset>\n`;
  return body;
}

export { PUBLIC, SITE };
