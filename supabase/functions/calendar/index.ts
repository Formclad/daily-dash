// Supabase Edge Function: "calendar"
// Fetches your private iCal (.ics) calendar links on the server (browsers are blocked from doing
// this directly), expands repeating events, and returns a simple list of events.
// Deploy with "Verify JWT" ON (the default) so only your signed-in login can call it.
// Your calendar links are sent by the app each time and are never stored by this function.
import ICAL from "npm:ical.js@1.5.0";

const ALLOWED_HOSTS = ["calendar.google.com", "outlook.live.com", "outlook.office365.com", "outlook.office.com", "calendar.live.com"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type Ev = { title: string; start: string; end: string; allDay: boolean; date?: string; feed: string };

const day = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** Parse ICS text and return the events overlapping [fromMs, toMs]. */
export function expand(ics: string, feed: string, fromMs: number, toMs: number): Ev[] {
  const out: Ev[] = [];
  const root = new ICAL.Component(ICAL.parse(ics));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(tz); } catch (_) { /* already registered */ }
  }
  const push = (title: string, s: any, e: any) => {
    const allDay = s.isDate;
    const sMs = s.toJSDate().getTime(), eMs = e.toJSDate().getTime();
    if (eMs < fromMs || sMs > toMs) return;
    if (allDay) {
      // one entry per calendar day the event covers (end date is exclusive)
      for (let t = sMs, n = 0; t < eMs && n < 31; t += 864e5, n++) {
        if (t + 864e5 > fromMs && t <= toMs) out.push({ title, start: s.toString(), end: e.toString(), allDay: true, date: day(new Date(t)), feed });
      }
    } else out.push({ title, start: new Date(sMs).toISOString(), end: new Date(eMs).toISOString(), allDay: false, feed });
  };
  for (const v of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(v);
    if (ev.isRecurrenceException()) continue;                       // handled through its parent
    const title = ev.summary || "(no title)";
    if (!ev.isRecurring()) { push(title, ev.startDate, ev.endDate); continue; }
    const it = ev.iterator();
    for (let next, n = 0; (next = it.next()) && n < 400; n++) {
      if (next.toJSDate().getTime() > toMs) break;
      const d = ev.getOccurrenceDetails(next);                      // applies edited/moved occurrences
      push(d.item.summary || title, d.startDate, d.endDate);
    }
  }
  return out;
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { feeds, from, to } = await req.json();
    const fromMs = Date.parse(from), toMs = Date.parse(to);
    if (!Array.isArray(feeds) || isNaN(fromMs) || isNaN(toMs) || toMs - fromMs > 120 * 864e5) throw new Error("bad request");
    const events: Ev[] = [], errors: string[] = [];
    await Promise.all(feeds.slice(0, 10).map(async (f: { name: string; url: string }) => {
      try {
        const u = new URL(String(f.url).replace(/^webcal:/i, "https:"));
        if (u.protocol !== "https:" || !ALLOWED_HOSTS.includes(u.hostname)) throw new Error("link must be a Google or Outlook calendar link");
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error(`calendar server said ${r.status}`);
        events.push(...expand(await r.text(), f.name, fromMs, toMs));
      } catch (e) { errors.push(`${f.name}: ${(e as Error).message}`); }
    }));
    return new Response(JSON.stringify({ events, errors }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ events: [], errors: [(e as Error).message] }), { status: 400, headers: CORS });
  }
}

// @ts-ignore: Deno exists on Supabase
if (typeof Deno !== "undefined") Deno.serve(handle);
