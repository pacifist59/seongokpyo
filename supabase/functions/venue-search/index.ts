import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'access-control-allow-origin': 'https://probable-memory-98c.pages.dev', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', 'content-type': 'application/json; charset=utf-8' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const required = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

Deno.serve(async (request) => {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Login required.' }, 401);
    const auth = createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) return json({ error: 'Login required.' }, 401);
    const { query } = await request.json() as { query?: unknown };
    if (typeof query !== 'string' || query.trim().length < 2 || query.length > 100) return json({ error: 'Use a venue name between 2 and 100 characters.' }, 400);

    // One deliberate search returns at most five choices. The REST key stays in
    // Edge Function secrets and is never included in the browser bundle.
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query.trim())}&size=5`, {
      headers: { Authorization: `KakaoAK ${required('KAKAO_REST_API_KEY')}` },
    });
    if (response.status === 429) return json({ error: '지도 검색 한도에 도달했습니다. 잠시 후 다시 시도해주세요.' }, 429);
    if (!response.ok) throw new Error(`Kakao Local API returned ${response.status}.`);
    const data = await response.json() as { documents?: Array<{ place_name: string; road_address_name: string; address_name: string }> };
    return json({ places: (data.documents ?? []).map((place) => ({ name: place.place_name, roadAddress: place.road_address_name, address: place.address_name })) });
  } catch (reason) {
    return json({ error: reason instanceof Error ? reason.message : 'Venue search failed.' }, 500);
  }
});
