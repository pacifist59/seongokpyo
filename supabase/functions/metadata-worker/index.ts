import { createClient } from 'npm:@supabase/supabase-js@2';

type MetadataJob = { id: number; entity_id: string; job_type: 'metadata' | 'geocode' };
type Venue = { id: string; name: string; road_address: string | null; province: string | null; district: string | null; address_detail: string | null };

const required = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

function venueAddress(venue: Venue) {
  return [venue.road_address, venue.province, venue.district, venue.address_detail].filter(Boolean).join(' ').trim();
}

async function geocode(address: string) {
  const response = await fetch(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`, {
    headers: {
      'x-ncp-apigw-api-key-id': required('NAVER_GEOCODING_CLIENT_ID'),
      'x-ncp-apigw-api-key': required('NAVER_GEOCODING_CLIENT_SECRET'),
    },
  });
  if (!response.ok) throw new Error(`Naver geocoding returned ${response.status}.`);
  const data = await response.json() as { addresses?: Array<{ x: string; y: string }> };
  const result = data.addresses?.[0];
  if (!result) return null;
  const longitude = Number(result.x);
  const latitude = Number(result.y);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Naver returned invalid coordinates.');
  return { latitude, longitude };
}

Deno.serve(async (request) => {
  try {
    const expectedToken = required('METADATA_WORKER_TOKEN');
    if (request.headers.get('x-metadata-worker-token') !== expectedToken) return json({ error: 'Unauthorized.' }, 401);

    const url = required('SUPABASE_URL');
    const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 20);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 20;
    const { data: jobs, error } = await supabase.rpc('claim_metadata_jobs', { p_job_type: 'geocode', p_limit: limit });
    if (error) throw error;

    const results = [];
    for (const job of (jobs ?? []) as MetadataJob[]) {
      const { data: venue, error: venueError } = await supabase.from('venues').select('id,name,road_address,province,district,address_detail').eq('id', job.entity_id).maybeSingle<Venue>();
      if (venueError || !venue) {
        await supabase.from('metadata_jobs').update({ status: 'failed', last_error: venueError?.message || 'Venue was deleted.', completed_at: new Date().toISOString() }).eq('id', job.id);
        results.push({ id: job.id, status: 'failed' });
        continue;
      }
      const address = venueAddress(venue);
      try {
        if (!address) throw new Error('No usable venue address.');
        const point = await geocode(address);
        if (!point) {
          await supabase.from('venues').update({ geocode_status: 'not_available', geocode_error: 'No matching address found.', geocoded_at: new Date().toISOString() }).eq('id', venue.id);
          await supabase.from('metadata_jobs').update({ status: 'skipped', last_error: 'No matching address found.', completed_at: new Date().toISOString() }).eq('id', job.id);
          results.push({ id: job.id, status: 'not_found' });
          continue;
        }
        const completedAt = new Date().toISOString();
        await supabase.from('venues').update({ ...point, geocode_status: 'complete', geocode_source: 'naver-geocode-v2', geocode_error: null, geocoded_at: completedAt }).eq('id', venue.id);
        await supabase.from('metadata_jobs').update({ status: 'complete', last_error: null, completed_at: completedAt }).eq('id', job.id);
        results.push({ id: job.id, status: 'complete' });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Geocoding failed.';
        await supabase.from('venues').update({ geocode_status: 'failed', geocode_error: message }).eq('id', venue.id);
        await supabase.from('metadata_jobs').update({ status: 'failed', last_error: message, completed_at: new Date().toISOString() }).eq('id', job.id);
        results.push({ id: job.id, status: 'failed' });
      }
    }
    return json({ processed: results.length, results });
  } catch (reason) {
    return json({ error: reason instanceof Error ? reason.message : 'Worker failed.' }, 500);
  }
});
