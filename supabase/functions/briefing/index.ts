// Supabase Edge Function: "briefing"  (the dashboard's drop-box)
// Your scheduled Claude briefings and tasks send their results here; the dashboard then shows them on Home
// and on the Briefings page. Deploy with "Verify JWT" OFF (scheduled tasks have no login), so security is the
// secret key below. Secrets to add (Edge Functions > Secrets):
//   BRIEFING_KEY      a long random password you invent (the sender must present it)
//   BRIEFING_USER_ID  your own user id (Authentication > Users > copy the "User UID")
const SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;   // provided by Supabase to functions automatically
const KEY = Deno.env.get("BRIEFING_KEY") ?? "";
const USER = Deno.env.get("BRIEFING_USER_ID") ?? "";
const JSON_HEADERS = { "Content-Type": "application/json" };
const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: JSON_HEADERS });

/** Compare secrets without leaking timing information. */
function same(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  if (!KEY || !USER || !same(req.headers.get("x-briefing-key") ?? "", KEY)) return reply({ error: "not allowed" }, 401);
  try {
    const text = await req.text();
    if (text.length > 80000) return reply({ error: "too large" }, 413);
    const b = JSON.parse(text);
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i: any) => ({
      t: String(i.t ?? "").slice(0, 240),
      due: /^\d{4}-\d{2}-\d{2}$/.test(String(i.due ?? "")) ? i.due : "",
      action: !!i.action,                       // true = "needs Sofia's decision / action"
    })).filter((i: any) => i.t);
    const now = Date.now();
    const data = {
      id: now.toString(36),
      source: String(b.source ?? "Briefing").slice(0, 80),     // e.g. the scheduled task's name
      title: String(b.title ?? b.source ?? "Briefing").slice(0, 160),
      summary: String(b.summary ?? "").slice(0, 20000),         // plain text; **bold**, "- " bullets and blank lines are shown nicely
      items,
      kind: b.kind === "task" ? "task" : "briefing",
      at: now,
    };
    const r = await fetch(`${SB}/rest/v1/entries?on_conflict=user_id,key`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, ...JSON_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: USER, key: `brief:${data.id}`, data, updated_at: now }),
    });
    if (!r.ok) return reply({ error: "could not save" }, 500);
    return reply({ ok: true, id: data.id });
  } catch (_) {
    return reply({ error: "bad request" }, 400);
  }
});
