/*
 * DAY: the shape of one day's record and the actions that change it.
 * Shared by the Home dashboard, Plan page and Journal page so they never disagree.
 */
(function () {
  const key = date => 'day:' + date;
  const blank = () => ({
    mind: ['', '', '', '', ''],
    pri: [{ t: '', d: false }, { t: '', d: false }, { t: '', d: false }],   // may carry tid = linked matrix task
    sched: [],            // [{ t: 'HH:MM', x: 'text' }]
    habits: {},           // { habitId: 'full' | 'mini' }
    body: {},             // { sun: true, ... }
    rate: {},             // { energy: 4, ... }
    eve: { well: '', diff: '', showed: '', good: '' }
  });

  const Day = {
    blank,
    get: date => Object.assign(blank(), Store.get(key(date), {})),
    update: (date, fn) => Store.update(key(date), blank(), fn),

    /** Handle a click on any [data-act] button. Returns true if it was a day action. */
    act(btn, date) {
      const a = btn.dataset.act, path = btn.dataset.path;
      if (a === 'toggle') {
        const d = Day.update(date, x => U.setPath(x, path, !U.getPath(x, path)));
        const m = /^pri\.(\d+)\.d$/.exec(path || '');
        if (m && d.pri[m[1]].tid) Matrix.setDone(d.pri[m[1]].tid, !!d.pri[m[1]].d);   // tick a priority = tick its matrix task
      } else if (a === 'rate') {
        Day.update(date, x => { const v = +btn.dataset.val; U.setPath(x, path, U.getPath(x, path) === v ? null : v); });
      } else if (a === 'habit') {
        Day.update(date, x => { const id = btn.dataset.id; if (x.habits[id] === btn.dataset.level) delete x.habits[id]; else x.habits[id] = btn.dataset.level; });
      } else if (a === 'sched-del') {
        Day.update(date, x => x.sched.splice(+btn.dataset.i, 1));
      } else if (a === 'use-suggest') {
        const s = Matrix.suggest(U.today());
        Day.update(date, x => { s.forEach((t, i) => { x.pri[i] = { t: t.t, d: false, tid: t.id }; }); });
      } else return false;
      return true;
    }
  };
  window.Day = Day;
})();
