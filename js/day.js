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
    eve: { well: '', diff: '', showed: '', good: '' },
    feel: '',             // how you said you feel (Coach check-in)
    autoPicked: null      // texts the assistant last chose for the top three (it keeps refreshing them until you edit or tick one)
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
        if (m && d.pri[m[1]].bid) { const [b, i] = d.pri[m[1]].bid.split('|'); Briefings.setDone(b, i, !!d.pri[m[1]].d); }   // ...or its briefing item
      } else if (a === 'rate') {
        Day.update(date, x => { const v = +btn.dataset.val; U.setPath(x, path, U.getPath(x, path) === v ? null : v); });
      } else if (a === 'habit') {
        Day.update(date, x => { const id = btn.dataset.id; if (x.habits[id] === btn.dataset.level) delete x.habits[id]; else x.habits[id] = btn.dataset.level; });
      } else if (a === 'strava-count') {
        Day.update(date, x => { x.habits[btn.dataset.id] = 'full'; });
      } else if (a === 'sched-del') {
        Day.update(date, x => x.sched.splice(+btn.dataset.i, 1));
      } else if (a === 'use-suggest') {
        const s = Brief.focus(U.today());
        Day.update(date, x => { for (let i = 0; i < 3; i++) x.pri[i] = s[i] ? { t: s[i].t, d: false, tid: s[i].tid, bid: s[i].bid } : { t: '', d: false }; x.autoPicked = x.pri.map(p => p.t); });
      } else return false;
      return true;
    }
  };
  window.Day = Day;
})();
