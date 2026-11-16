/* Small helpers shared by every page. */
(function () {
  const pad = n => String(n).padStart(2, '0');

  const U = {
    /** Escape text for safe use inside innerHTML. */
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    /** Date -> 'YYYY-MM-DD' in the device's local time (Adelaide for you). */
    ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    /** 'YYYY-MM-DD' -> Date at local noon (avoids daylight-saving edge cases). */
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); },
    today() { return U.ymd(new Date()); },
    addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d); },
    /** Monday of the week containing the date. */
    weekStart(s) { const d = U.parse(s); const dow = (d.getDay() + 6) % 7; return U.addDays(s, -dow); },
    dow(s) { return U.parse(s).getDay(); },
    fmtLong(s) { return U.parse(s).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }); },
    id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    /** Read/write a nested value using a path like 'eve.well' or 'pri.0.t'. */
    getPath(o, path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o); },
    setPath(o, path, val) {
      const keys = path.split('.');
      const last = keys.pop();
      let cur = o;
      for (const k of keys) { if (cur[k] == null) cur[k] = /^\d+$/.test(k) ? [] : {}; cur = cur[k]; }
      cur[last] = val;
    },
    debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  };
  window.U = U;
})();
