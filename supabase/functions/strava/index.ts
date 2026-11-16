// Supabase Edge Function: "strava"
// Connects your Strava account and returns your recent activities (Garmin and Runna workouts show up
// here too if they sync to Strava). Your Strava client secret and tokens stay on the server.
// Deploy with "Verify JWT" ON. Secrets needed (Edge Functions > Secrets): STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET.
const SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;   // provided by Supabase to functions automatically
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: CORS });

/** Who is calling? (the signed-in user's id, from their login token) */
async function userId(req: Request): Promise<string> {
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: ANON, Authorization: req.headers.get("Authorization") ?? "" } });
  if (!r.ok) throw new Error("not signed in");
  return (await r.json()).id;
}

const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const row = (uid: string) => `${SB}/rest/v1/private_tokens?user_id=eq.${uid}&provider=eq.strava`;

async function loadTokens(uid: string) {
  const r = await fetch(`${row(uid)}&select=data`, { headers: svc });
  const j = await r.json();
  return Array.isArray(j) && j[0] ? j[0].data : null;
}
async function saveTokens(uid: string, data: unknown) {
  await fetch(`${SB}/rest/v1/private_tokens?on_conflict=user_id,provider`, {
    method: "POST", headers: { ...svc, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: uid, provider: "strava", data }),
  });
}

async function tokenRequest(params: Record<string, string>) {
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Strava refused the request");
  return j;
}

/** A valid access token, refreshing it with Strava when it has expired. */
async function accessToken(uid: string, t: any) {
  if (t.expires_at * 1000 > Date.now() + 60000) return t.access_token;
  const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  await saveTokens(uid, { ...t, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at });
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const uid = await userId(req);
    const body = await req.json().catch(() => ({}));
    const tokens = await loadTokens(uid);

    if (body.action === "status") {
      return json({ connected: !!tokens, athlete: tokens?.athlete ?? "", clientId: CLIENT_ID, configured: !!(CLIENT_ID && CLIENT_SECRET) });
    }

    if (body.action === "connect") {            // finish the Strava sign-in using the one-time code
      const j = await tokenRequest({ grant_type: "authorization_code", code: String(body.code) });
      await saveTokens(uid, {
        access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at,
        athlete: [j.athlete?.firstname, j.athlete?.lastname].filter(Boolean).join(" "),
      });
      return json({ connected: true });
    }

    if (body.action === "disconnect") {
      await fetch(row(uid), { method: "DELETE", headers: svc });
      return json({ connected: false });
    }

    if (body.action === "activities") {
      if (!tokens) return json({ connected: false, activities: [] });
      const access = await accessToken(uid, tokens);
      const after = Math.floor(Number(body.after) || (Date.now() / 1000 - 90 * 86400));
      const out: unknown[] = [];
      for (let page = 1; page <= 3; page++) {       // up to 300 activities
        const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${access}` } });
        if (!r.ok) throw new Error(`Strava said ${r.status}`);
        const list = await r.json();
        for (const a of list) out.push({
          id: a.id, name: a.name, sport: a.sport_type || a.type,
          date: String(a.start_date_local).slice(0, 10), time: String(a.start_date_local).slice(11, 16),   // already local time
          km: Math.round(a.distance / 10) / 100, secs: a.moving_time, up: Math.round(a.total_elevation_gain || 0),
          hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        });
        if (list.length < 100) break;
      }
      return json({ connected: true, activities: out });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
