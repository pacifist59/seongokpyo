import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.argv[2]?.replace(/\/$/, '');
const origin = process.env.VITE_SITE_URL || 'https://probable-memory-98c.pages.dev';
async function read(path, type) {
  if (!base) return readFile(resolve('dist', path === '/' ? 'index.html' : `${path.slice(1)}${type === 'html' ? '.html' : ''}`), type === 'png' ? undefined : 'utf8');
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Twitterbot/1.0' } });
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get('content-type')?.includes({ html: 'text/html', xml: 'xml', txt: 'text/plain', png: 'image/png' }[type]), `${path}: wrong MIME type`);
  return type === 'png' ? Buffer.from(await response.arrayBuffer()) : response.text();
}
const sitemap = await read('/sitemap.xml', 'xml');
assert.ok(sitemap.startsWith('<?xml'));
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.ok(locations.length >= 6);
assert.equal(new Set(locations).size, locations.length);
assert.ok(locations.every((url) => url.startsWith(origin + '/') && !/login|mypage|\/new|\/edit|setup/.test(url)));
const robots = await read('/robots.txt', 'txt');
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
for (const location of locations) {
  const path = new URL(location).pathname;
  const html = await read(path, 'html');
  assert.ok(html.includes(`<link rel="canonical" href="${location}"`), path);
  for (const key of ['og:title', 'og:description', 'og:image', 'og:locale', 'og:site_name', 'twitter:card', 'twitter:image']) {
    assert.equal((html.match(new RegExp(`(?:name|property)="${key}"`, 'g')) || []).length, 1, `${path}: ${key}`);
  }
  assert.ok(html.includes('<h1'), `${path}: missing initial heading`);
  assert.ok(html.includes('id="initial-data"'), `${path}: missing data`);
  assert.ok(!html.includes('데이터베이스 연결 대기 중'), `${path}: missing database configuration`);
  if (path.startsWith('/setlist/')) {
    assert.ok(html.includes('class="song-number"') || html.includes('아직 곡이 없습니다'), `${path}: missing songs`);
  }
  console.log(`PASS ${path}`);
}
for (const path of ['/login', '/mypage', '/setlists/new', '/about/setup']) {
  assert.ok((await read(path, 'html')).includes('content="noindex, follow"'), `${path}: must be noindex`);
}
const png = await read('/share-card.png', 'png');
assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log(`SEO checks passed: ${locations.length} public URLs, private noindex pages, robots, sitemap, PNG${base ? ', HTTP status and MIME types' : ''}.`);
