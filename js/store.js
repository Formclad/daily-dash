/*
 * STORE: all data lives in one flat map of "records" in localStorage, so the
 * app opens instantly and works offline.
 *   key     e.g. 'day:2026-11-15', 'config:habits', 'config:prompts'
 *   data    any JSON
 *   ts      time of last edit in ms (the newest edit wins when syncing)
 *   dirty   true if not yet uploaded
 * Pages never talk to the network; sync.js moves records to and from Supabase.
 */
(function () {
  const REC = 'dd:records:v1';
  const META = 'dd:meta:v1';
  let rec = {};
  let meta = {};
  const listeners = new Set();

  try { rec = JSON.parse(localStorage.getItem(REC)) || {}; } catch (e) { rec = {}; }
  try { meta = JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { meta = {}; }

  const save = () => { try { localStorage.setItem(REC, JSON.stringify(rec)); } catch (e) { /* storage full/blocked */ } };
  const saveMeta = () => { try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) {} };
  const emit = (info) => listeners.forEach(fn => fn(info));

  const Store = {
    /** Get a copy of a record's data (or the fallback). */
    get(key, fallback) { return rec[key] ? U.clone(rec[key].data) : fallback; },
    /** Read-only peek without copying (do not mutate the result). */
    peek(key) { return rec[key] ? rec[key].data : undefined; },
    has(key) { return !!rec[key]; },
    /** Replace a record locally and mark it for upload. */
    set(key, data) {
      rec[key] = { data: U.clone(data), ts: Date.now(), dirty: true };
      save();
      emit({ type: 'local', key });
    },
    /** Read-modify-write helper: mutate(copy) then store. */
    update(key, fallback, mutate) {
      const d = Store.get(key, U.clone(fallback));
      mutate(d);
      Store.set(key, d);
      return d;
    },
    keys(prefix) { return Object.keys(rec).filter(k => k.startsWith(prefix || '')); },

    // ---- used by sync.js ----
    dirtyRows() { return Object.entries(rec).filter(([, r]) => r.dirty).map(([key, r]) => ({ key, data: r.data, updated_at: r.ts })); },
    markClean(rows) { rows.forEach(r => { const x = rec[r.key]; if (x && x.ts === r.updated_at) x.dirty = false; }); save(); },
    /** Merge rows from the server: newest edit wins. Returns keys that changed. */
    applyRemote(rows) {
      const changed = [];
      rows.forEach(r => {
        const x = rec[r.key];
        if (!x || r.updated_at > x.ts) { rec[r.key] = { data: r.data, ts: r.updated_at, dirty: false }; changed.push(r.key); }
      });
      if (changed.length) { save(); emit({ type: 'remote', keys: changed }); }
      return changed;
    },

    // ---- backup ----
    exportAll() { return { app: 'daily-dash', version: 1, exportedAt: new Date().toISOString(), records: Object.fromEntries(Object.entries(rec).map(([k, r]) => [k, r.data])) }; },
    importAll(obj) {
      if (!obj || obj.app !== 'daily-dash' || typeof obj.records !== 'object') throw new Error('That does not look like a Daily Dash backup.');
      const now = Date.now();
      Object.entries(obj.records).forEach(([k, d]) => { rec[k] = { data: d, ts: now, dirty: true }; });
      save();
      emit({ type: 'import' });
    },

    // ---- small bits of non-synced bookkeeping ----
    meta(k) { return meta[k]; },
    setMeta(k, v) { meta[k] = v; saveMeta(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  window.Store = Store;
})();
