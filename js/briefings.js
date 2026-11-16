/*
 * BRIEFINGS: results of your scheduled Claude briefings and tasks, delivered by the "briefing" Supabase function.
 * They arrive as ordinary synced records 'brief:<id>' = { id, source, title, summary, items:[{t,due,action}], kind, at }.
 * Ticked-off action items are remembered in 'data:briefstate' = { done: { 'briefId|index': 1 } }.
 */
(function () {
  const WEEKS = 14 * 864e5;
  const state = () => Store.get('data:briefstate', { done: {} });

  const Briefings = {
    all() { return Store.keys('brief:').map(k => Store.peek(k)).filter(Boolean).sort((a, b) => b.at - a.at); },
    recent() { const cut = Date.now() - 30 * 864e5; return Briefings.all().filter(b => b.at > cut && !b.hidden).slice(0, 60); },
    sources() { return [...new Set(Briefings.recent().map(b => b.source))]; },
    color(source) { let h = 0; for (const c of source) h = (h * 31 + c.charCodeAt(0)) >>> 0; return U.PALETTE[h % U.PALETTE.length]; },

    /** Items marked "needs Sofia" in the last two weeks that she hasn't ticked off yet. */
    actions() {
      const done = state().done, cut = Date.now() - WEEKS, out = [];
      Briefings.all().filter(b => b.at > cut && !b.hidden).forEach(b => (b.items || []).forEach((it, i) => { if (it.action && !done[`${b.id}|${i}`]) out.push({ ...it, bid: b.id, i, source: b.source, at: b.at }); }));
      return out;
    },
    /** Hide a briefing (it stays in the database, but disappears from every screen). */
    hide(id) { Store.update('brief:' + id, {}, d => { d.hidden = true; }); },
    tick(bid, i) { Store.update('data:briefstate', { done: {} }, s => { const k = `${bid}|${i}`; s.done[k] ? delete s.done[k] : (s.done[k] = 1); }); },

    ago(at) {
      const m = Math.round((Date.now() - at) / 60000);
      if (m < 60) return `${Math.max(m, 1)} min ago`;
      if (m < 1440) return `${Math.round(m / 60)} h ago`;
      return new Date(at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    },

    /** Safe mini-formatting: **bold**, "- " bullets, "## " headings, blank-line paragraphs. */
    md(text) {
      const inline = s => U.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      let html = '', list = false;
      String(text || '').split('\n').forEach(line => {
        const l = line.trim(), li = /^[-•*]\s+(.*)/.exec(l);
        if (li) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(li[1])}</li>`; return; }
        if (list) { html += '</ul>'; list = false; }
        if (/^#{1,3}\s/.test(l)) html += `<h4>${inline(l.replace(/^#+\s*/, ''))}</h4>`;
        else if (l) html += `<p>${inline(l)}</p>`;
      });
      return html + (list ? '</ul>' : '');
    }
  };
  window.Briefings = Briefings;
})();
