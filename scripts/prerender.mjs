import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { collectPages, renderPage, renderMetadata, canonicalUrl, SITE_ORIGIN } from '../.prerender/entry-prerender.js';

const output = resolve('dist');
const template = (await readFile(resolve(output, 'index.html'), 'utf8'))
  .replace(/<title>[\s\S]*?<\/title>/g, '')
  .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/g, '')
  .replace(/<link\s+rel="canonical"[^>]*>/g, '');
// Protected edit pages use the production SPA shell without prerendered home data.
await writeFile(resolve(output, 'edit-shell.html'), template);
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const urls = [];
const routes = [];
for await (const page of collectPages()) {
  if (!/^\/(?:[a-zA-Z0-9/-]*)$/.test(page.path)) throw new Error(`Unsafe output path: ${page.path}`);
  const target = resolve(output, page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`);
  await mkdir(dirname(target), { recursive: true });
  const data = JSON.stringify(page.data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = template.replace('</head>', `${renderMetadata(page.path, page.metadata)}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${renderPage(page)}</div>\n<script id="initial-data" type="application/json">${data}</script>`);
  await writeFile(target, html);
  routes.push(page.path);
  if (!page.metadata.noindex) urls.push({ loc: canonicalUrl(page.path), lastmod: page.lastmod });
}
if (urls.length > 45000) throw new Error('Split the sitemap before exceeding its URL limit.');
await writeFile(resolve(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc>${lastmod && !Number.isNaN(Date.parse(lastmod)) ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
await writeFile(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
console.log(`Prerendered ${routes.length} routes; sitemap contains ${urls.length} public URLs.`);
