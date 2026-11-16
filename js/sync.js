/*
 * SYNC: talks to Supabase with plain fetch (no libraries, no tracking).
 *  - Signs in with email + password (one private account, signups switched off).
 *  - Pulls rows changed since last time, pushes locally edited rows.
 *  - Newest edit wins (the database also refuses older overwrites).
 * Only the PUBLIC "anon" key is ever used here. Row-level security does the guarding.
 */
(function () {
  const CFG = 'dd:supabase', SES = 'dd:session';
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let status = 'off';           // off | idle | syncing | offline | error | signedout
  let lastError = '';
  const listeners = new Set();
  const setStatus = (s, err) => { status = s; lastError = err || ''; listeners.forEach(f => f(s)); };

  const cfg = () => {
    const mine = read(CFG) || {};
    const file = window.DD_CONFIG || {};
    const url = (mine.url || file.supabaseUrl || '').replace(/\/+$/, '');
    const key = mine.key || file.supabaseAnonKey || '';
    return url && key ? { url, key } : null;
  };

  async function authFetch(path, body) {
    const c = cfg();
    const r = await fetch(`${c.url}/auth/v1/${path}`, {
      method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.msg || j.error_description || j.error || `Sign-in failed (${r.status})`);
    return j;
  }
  const keepSession = j => write(SES, { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in - 60) * 1000, uid: j.user.id, email: j.user.email });

  async function token() {
    let s = read(SES);
    if (!s) return null;
    if (Date.now() > s.exp) {
      try { keepSession(await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh })); s = read(SES); }
      catch (e) { if (!navigator.onLine) throw e; write(SES, null); setStatus('signedout'); return null; }
    }
    return s;
  }

  async function rest(path, opts = {}) {
    const c = cfg(), s = await token();
    if (!s) throw new Error('Not signed in');
    const r = await fetch(`${c.url}/rest/v1/${path}`, {
      ...opts, headers: { apikey: c.key, Authorization: `Bearer ${s.access}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (!r.ok) throw new Error(`Server said ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return opts.method === 'POST' ? null : r.json();
  }

  let running = false, again = false;
  async function run() {
    if (!cfg() || !read(SES)) return;
    if (!navigator.onLine) return setStatus('offline');
    if (running) { again = true; return; }
    running = true; setStatus('syncing');
    try {
      // 1) pull: everything edited since the newest row we have seen
      const since = Store.meta('lastPull') || 0;
      const rows = await rest(`entries?select=key,data,updated_at&updated_at=gt.${since}&order=updated_at.asc`);
      if (rows && rows.length) {
        Store.applyRemote(rows);
        Store.setMeta('lastPull', rows[rows.length - 1].updated_at);
      }
      // 2) push local edits that the server has not seen
      const dirty = Store.dirtyRows();
      if (dirty.length) {
        const uid = read(SES).uid;
        await rest('entries?on_conflict=user_id,key', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(dirty.map(r => ({ user_id: uid, key: r.key, data: r.data, updated_at: r.updated_at })))
        });
        Store.markClean(dirty);
      }
      Store.setMeta('lastSync', Date.now());
      setStatus('idle');
      if (window.Calendar) Calendar.refresh();
    } catch (e) {
      setStatus(navigator.onLine ? 'error' : 'offline', e.message);
    } finally {
      running = false;
      if (again) { again = false; setTimeout(run, 500); }
    }
  }
  const soon = U.debounce(run, 1500);

  const Sync = {
    configured: () => !!cfg(),
    signedIn: () => !!read(SES),
    email: () => (read(SES) || {}).email || '',
    savedConfig: () => read(CFG) || {},
    saveConfig(url, key) { write(CFG, { url: url.trim(), key: key.trim() }); },
    get status() { return status; },
    get error() { return lastError; },
    async signIn(email, password) {
      keepSession(await authFetch('token?grant_type=password', { email, password }));
      Store.setMeta('lastPull', 0);   // first sign-in on a device: fetch everything
      run();
    },
    signOut() { write(SES, null); setStatus('signedout'); },
    now: run,
    /** For other modules that call Supabase functions. */
    async accessToken() { const s = await token(); if (!s) throw new Error('Not signed in'); return s.access; },
    connection: cfg,
    onChange(f) { listeners.add(f); },
    start() {
      setStatus(cfg() ? (read(SES) ? 'idle' : 'signedout') : 'off');
      Store.subscribe(i => { if (i.type === 'local' || i.type === 'import') soon(); });
      window.addEventListener('online', run);
      window.addEventListener('offline', () => setStatus('offline'));
      document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
      setInterval(() => { if (!document.hidden) run(); }, 60000);
      run();
    }
  };
  window.Sync = Sync;
})();
