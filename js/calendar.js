/*
 * CALENDAR: shows events from your Google / Outlook calendars on Home and Plan.
 * Your private calendar links are stored in YOUR database (config:calendars), never in the code.
 * The Supabase "calendar" function fetches them (browsers can't) and returns plain events.
 * Events are cached on the device so they show instantly and offline.
 * Other sources (e.g. Strava) can add events with Calendar.register(name, async (date) => [...]).
 */
(function () {
  const CACHE = 'dd:cal:v1';
  const STALE = 10 * 60 * 1000;
  const read = () => { try { return JSON.parse(localStorage.getItem(CACHE)) || {}; } catch (e) { return {}; } };
  let cache = read(), busy = false, lastError = '';
  const listeners = new Set();
  const extra = {};

  const feeds = () => {
    const seen = new Set();   // ignore duplicate links
    return (Store.get('config:calendars', { feeds: [] }).feeds || []).filter(f => f.url && !seen.has(f.url) && seen.add(f.url));
  };

  const Calendar = {
    feeds,
    register(name, fn) { extra[name] = fn; },
    onChange(fn) { listeners.add(fn); },
    hasProviders: () => feeds().length > 0 || Object.keys(extra).length > 0,
    get error() { return lastError; },
    get fetchedAt() { return cache.at || 0; },

    /** Events on a local date 'YYYY-MM-DD', from the cache (instant). Shape: { time, text, source }. */
    eventsFor(date) {
      return (cache.events || []).filter(e => e.d === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .map(e => ({ time: e.time, text: e.text, source: e.source }));
    },

    /** Fetch from the server if the cache is old (or force = true). */
    async refresh(force) {
      const list = feeds();
      if (!list.length || busy || !Sync.signedIn() || !navigator.onLine) return;
      if (!force && Date.now() - (cache.at || 0) < STALE && cache.sig === JSON.stringify(list)) return;
      busy = true;
      try {
        const s = await Sync.accessToken();
        const c = Sync.connection();
        const from = U.addDays(U.today(), -7), to = U.addDays(U.today(), 60);
        const r = await fetch(`${c.url}/functions/v1/calendar`, {
          method: 'POST',
          headers: { apikey: c.key, Authorization: `Bearer ${s}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ feeds: list.map(f => ({ name: f.name, url: f.url })), from: from + 'T00:00:00+10:30', to: to + 'T23:59:59+10:30' })
        });
        if (r.status === 404) throw new Error('The calendar function is not set up in Supabase yet (see the README).');
        const j = await r.json();
        const events = (j.events || []).map(e => e.allDay
          ? { d: e.date, time: '', text: e.title, source: e.feed }
          : { d: U.ymd(new Date(e.start)), time: new Date(e.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), text: e.title, source: e.feed });
        cache = { at: Date.now(), sig: JSON.stringify(list), events };
        try { localStorage.setItem(CACHE, JSON.stringify(cache)); } catch (e) {}
        lastError = (j.errors || []).join('; ');
      } catch (e) { lastError = e.message; }
      busy = false;
      listeners.forEach(f => f());
    },

    /** Everything to show on a date: calendar feeds + any registered sources (synchronous part). */
    external(date) { return Calendar.eventsFor(date); }
  };
  window.Calendar = Calendar;
})();
