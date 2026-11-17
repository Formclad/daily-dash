/*
 * BRIEFINGS: results of your scheduled Claude briefings and tasks, delivered by the "briefing" Supabase function.
 * They arrive as ordinary synced records 'brief:<id>' = { id, source, title, summary, items:[{t,due,action}], kind, at }.
 * Ticked-off action items are remembered in 'data:briefstate' = { done: { 'briefId|index': 1 } }.
 */
(function () {
  const WEEKS = 14 * 864e5;
  const state = () => Object.assign({ done: {}, imported: {} }, Store.get('data:briefstate', {}));

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
    setDone(bid, i, v) {
      const k = `${bid}|${i}`;
      Store.update('data:briefstate', { done: {}, imported: {} }, s => { v ? (s.done[k] = 1) : delete s.done[k]; });
      const tid = (state().imported || {})[k];
      if (tid && Matrix.all().some(t => t.id === tid)) Matrix.patch(tid, { done: !!v });     // tick here = tick in the Matrix
    },
    tick(bid, i) { Briefings.setDone(bid, i, !state().done[`${bid}|${i}`]); },

    /** Which area a briefing's tasks belong to. */
    area(source) { return /(bills|estimate|marianne|triage|morning briefing|weekly status|formclad)/i.test(source) ? 'Formclad' : 'Personal'; },

    /**
     * Every "needs you" item becomes a Matrix task (once), so there is ONE list of things to do.
     * Due date: the one in the briefing, otherwise two days after it arrived.
     */
    importToMatrix() {
      const st = state(), made = {};
      Briefings.actions().forEach(a => {
        const k = `${a.bid}|${a.i}`;
        if (st.imported[k]) return;
        const arrived = U.ymd(new Date(a.at));
        made[k] = Matrix.add({ t: a.t, due: a.due || U.addDays(arrived, 2), imp: true, cat: Briefings.area(a.source), src: 'briefing', sk: k });
      });
      if (Object.keys(made).length) Store.update('data:briefstate', { done: {}, imported: {} }, s => { s.imported = Object.assign(s.imported || {}, made); });
    },

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
