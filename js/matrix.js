/*
 * MATRIX: tasks sorted with the Eisenhower method.
 *   Urgent    = due within DD_DEFAULTS.urgentDays days (or overdue)
 *   Important = you flagged it with the star
 *   Q1 Do first (urgent+important)  Q2 Schedule it (important)
 *   Q3 Quick / delegate (urgent)    Q4 Later / drop (neither)
 * suggest() picks the day's top three from Q1 then Q2, so priorities are decided for you.
 */
(function () {
  const D = DD_DEFAULTS;
  const KEY = 'data:tasks';
  const items = () => Store.get(KEY, { items: [] }).items;
  const save = list => Store.set(KEY, { items: list });
  const diff = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 864e5);   // days from a to b

  const Matrix = {
    QUADS: [
      { n: 1, name: 'Do first',     sub: 'urgent + important' },
      { n: 2, name: 'Schedule it',  sub: 'important, not urgent' },
      { n: 3, name: 'Quick or hand off', sub: 'urgent, less important' },
      { n: 4, name: 'Later or drop', sub: 'neither' }
    ],
    all: items,
    open: () => items().filter(t => !t.done),
    add({ t, due, imp, cat }) { const l = items(); l.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, due: due || '', imp: !!imp, cat: cat || '', done: false }); save(l); },
    patch(id, obj) { const l = items(); const x = l.find(i => i.id === id); if (x) { Object.assign(x, obj); save(l); } },
    setDone(id, v) { Matrix.patch(id, { done: !!v }); },
    remove(id) { save(items().filter(i => i.id !== id)); },

    isUrgent: (t, today) => !!t.due && diff(today, t.due) <= D.urgentDays,
    quad(t, today) { const u = Matrix.isUrgent(t, today); return t.imp ? (u ? 1 : 2) : (u ? 3 : 4); },
    /** Higher = do sooner. Quadrant first, then how close the due date is. */
    score(t, today) {
      const left = t.due ? Math.max(-30, Math.min(60, diff(today, t.due))) : 61;
      return (4 - Matrix.quad(t, today)) * 1000 + (100 - left);
    },
    ranked(today) { return Matrix.open().sort((a, b) => Matrix.score(b, today) - Matrix.score(a, today)); },
    /** The three things the matrix says matter most today (Q1, then Q2). */
    suggest(today) { return Matrix.ranked(today).filter(t => Matrix.quad(t, today) <= 2).slice(0, 3); },
    counts(today) { const c = { 1: 0, 2: 0, 3: 0, 4: 0 }; Matrix.open().forEach(t => c[Matrix.quad(t, today)]++); return c; },
    fmtDue(t, today) {
      if (!t.due) return 'no date';
      const n = diff(today, t.due);
      if (n < 0) return `overdue (${U.parse(t.due).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})`;
      if (n === 0) return 'today';
      if (n === 1) return 'tomorrow';
      return U.parse(t.due).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };
  window.Matrix = Matrix;
})();
