/*
 * STRAVA: recent activities (Garmin and Runna workouts arrive here too if they sync to Strava).
 * All Strava secrets live on the server (Supabase "strava" function); this file only shows the data.
 * Activities are cached on the device so they show instantly and offline.
 */
(function () {
  const CACHE = 'dd:strava:v1', STALE = 15 * 60 * 1000;
  let st = (() => { try { return JSON.parse(localStorage.getItem(CACHE)) || {}; } catch (e) { return {}; } })();
  let busy = false;
  const listeners = new Set();
  const persist = () => { try { localStorage.setItem(CACHE, JSON.stringify(st)); } catch (e) {} };
  const done = () => { busy = false; persist(); listeners.forEach(f => f()); };

  async function call(action, extra) {
    const c = Sync.connection(), tok = await Sync.accessToken();
    const r = await fetch(`${c.url}/functions/v1/strava`, {
      method: 'POST', headers: { apikey: c.key, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra })
    });
    if (r.status === 404) throw new Error('The Strava function is not set up in Supabase yet (see the README).');
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  }

  const Strava = {
    onChange(f) { listeners.add(f); },
    /** True when your scheduled Claude task supplies the data (no Strava app needed). */
    get viaClaude() { return !!Store.peek('feed:strava'); },
    get connected() { return Strava.viaClaude || !!st.connected; },
    get athlete() { return (Store.peek('feed:strava') || {}).athlete || st.athlete || ''; },
    get error() { return st.error || ''; },
    get fetchedAt() { return (Store.peek('feed:strava') || {}).at || st.at || 0; },
    get configured() { return st.configured !== false; },
    activities: () => (Store.peek('feed:strava') || {}).activities || st.acts || [],

    /** Where to send you to approve access on Strava. */
    connectUrl() {
      const redirect = location.origin + location.pathname;
      return `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(st.clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&approval_prompt=auto&scope=activity:read_all`;
    },
    canConnect: () => !!st.clientId,

    async refresh(force) {
      if (Strava.viaClaude || busy || !Sync.signedIn() || !navigator.onLine) return;
      if (!force && st.connected && Date.now() - (st.at || 0) < STALE) return;
      busy = true;
      try {
        const s = await call('status');
        Object.assign(st, { connected: s.connected, athlete: s.athlete, clientId: s.clientId, configured: s.configured, error: '' });
        if (s.connected) {
          const after = Math.floor(new Date(U.addDays(U.weekStart(U.today()), -7 * 11) + 'T00:00:00').getTime() / 1000);   // ~12 weeks
          st.acts = (await call('activities', { after })).activities;
          st.at = Date.now();
        }
      } catch (e) { st.error = e.message; }
      done();
    },

    /** Called once after Strava sends you back with ?code=... */
    async finishConnect(code) {
      try { await call('connect', { code }); st.connected = true; st.error = ''; }
      catch (e) { st.error = e.message; }
      await Strava.refresh(true);
    },
    async disconnect() {
      try { await call('disconnect'); st = { clientId: st.clientId }; } catch (e) { st.error = e.message; }
      done();
    },

    // ---- summaries ----
    inWeek(weekStart) { const end = U.addDays(weekStart, 6); return Strava.activities().filter(a => a.date >= weekStart && a.date <= end); },
    isRun: a => /run/i.test(a.sport),
    fmtTime(s) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`; },
    pace(a) { if (!a.km) return ''; const p = a.secs / a.km; return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')}/km`; },
    forDate: date => Strava.activities().filter(a => a.date === date)
  };
  window.Strava = Strava;

  // Show Strava activities on the day's schedule (read-only).
  Calendar.register('strava', date => Strava.forDate(date).map(a => ({ time: a.time, text: `${a.sport.replace(/([a-z])([A-Z])/g, '$1 $2')}${a.km ? ' · ' + a.km + ' km' : ''}`, source: 'Strava' })));
})();
