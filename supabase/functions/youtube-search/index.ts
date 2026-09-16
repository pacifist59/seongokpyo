const allowedOrigins = new Set(['https://probable-memory-98c.pages.dev', 'http://localhost:5173']);

function headers(request: Request) {
  const origin = request.headers.get('origin') || '';
  return {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://probable-memory-98c.pages.dev',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8',
    vary: 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!allowedOrigins.has(request.headers.get('origin') || '')) return json(request, { error: 'Origin not allowed.' }, 403);
  try {
    const body = await request.json() as { artist?: unknown; title?: unknown };
    const artist = cleanText(body.artist, 120);
    const title = cleanText(body.title, 160);
    if (!artist || !title) return json(request, { error: 'Artist and title are required.' }, 400);
    const key = Deno.env.get('YOUTUBE_DATA_API_KEY')?.trim();
    if (!key) return json(request, { error: 'YouTube search is not configured.' }, 503);
    const query = `${artist} ${title}`;
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&type=video&videoEmbeddable=true&maxResults=1&q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`);
    if (response.status === 403 || response.status === 429) return json(request, { error: 'YouTube search quota is temporarily unavailable.' }, 429);
    if (!response.ok) throw new Error(`YouTube Data API returned ${response.status}.`);
    const payload = await response.json() as { items?: Array<{ id?: { videoId?: string } }> };
    const videoId = payload.items?.[0]?.id?.videoId;
    if (!videoId) return json(request, { error: 'No playable video found.' }, 404);
    return json(request, { url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` });
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'YouTube search failed.' }, 500);
  }
});
