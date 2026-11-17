/*
 * SCHEDULE -> MATRIX: reads the calendar ahead and turns events into prep tasks for the Matrix
 * (e.g. "Write questions for the dietitian", "Arrange childcare for the pupil-free day").
 * Each suggestion has a stable key, so it is added once and never nags again.
 * Data: 'data:suggest' = { auto: true, added: { key: 1 }, dismissed: { key: 1 } }
 */
(function () {
  const KEY = 'data:suggest';
  const DEF = { auto: true, added: {}, dismissed: {} };
  const st = () => Object.assign({}, DEF, Store.get(KEY, DEF));
  const SKIP_SOURCES = ['Tenders', 'Runna', 'Holidays', 'Strava'];

  // A rule matches an event title and says what prep task to create and when it is due.
  const RULES = [
    { id: 'appt',   re: /(\bdr\b|doctor|mri|scan|clinic|dentist|dietitian|physio|specialist|appointment|teeth clean)/i,
      task: e => `Write questions to ask: ${e.text}`, lead: 1, imp: true, cat: 'Health' },
    { id: 'care',   re: /(pupil free|oshc closure|closure day|closed)/i,
      task: e => `Arrange childcare for: ${e.text}`, lead: 5, imp: true, cat: 'Family' },
    { id: 'vac',    re: /(vacation care)/i,
      task: e => `Confirm vacation care bookings: ${e.text}`, lead: 7, imp: true, cat: 'Family' },
    { id: 'school', re: /(concert|graduation|transition|meet the teacher|sports day|carols|end of year)/i,
      task: e => `Plan for: ${e.text} (what to wear or bring, time off)`, lead: 2, imp: false, cat: 'Family' },
    { id: 'trip',   re: /(staying at|trip|holiday park|flight|accommodation)/i,
      task: e => `Prepare for: ${e.text} (pack and confirm bookings)`, lead: 2, imp: true, cat: 'Family' },
    { id: 'party',  re: /(party|birthday)/i,
      task: e => `Gift and RSVP: ${e.text}`, lead: 3, imp: false, cat: 'Family' },
    { id: 'work',   re: /(review|renewal|presentation|workshop|interview)/i, not: /(team meeting|ezybills|working hours|quotes review)/i,
      task: e => `Prepare for: ${e.text}`, lead: 1, imp: true, cat: 'Formclad' }
  ];

  const Schedule = {
    isAuto: () => st().auto,
    setAuto(v) { Store.update(KEY, DEF, s => { s.auto = !!v; }); },

    /** Every prep task the next two weeks of events suggest. */
    candidates(days = 14) {
      const today = U.today(), out = [], seen = new Set();
      for (let i = 0; i <= days; i++) {
        const date = U.addDays(today, i);
        for (const e of Calendar.external(date)) {
          if (SKIP_SOURCES.includes(e.source)) continue;
          const r = RULES.find(x => x.re.test(e.text) && !(x.not && x.not.test(e.text)));
          if (!r) continue;
          const key = `${r.id}|${e.text.toLowerCase().slice(0, 60)}`;       // same event on several days = one task
          if (seen.has(key)) continue;
          seen.add(key);
          let due = U.addDays(date, -r.lead);
          if (due < today) due = today;
          out.push({ key, t: r.task(e).slice(0, 140), due, imp: r.imp, cat: r.cat, date, days: i });
        }
      }
      return out;
    },
    pending() { const s = st(); return Schedule.candidates().filter(c => !s.added[c.key] && !s.dismissed[c.key]); },

    /** Add due-soon suggestions to the Matrix automatically (once each). Returns how many were added. */
    /** Prep tasks are pointless once their event has happened: quietly retire them. */
    expire() {
      const today = U.today(), cands = Schedule.candidates();
      Matrix.open().filter(t => t.src === 'schedule').forEach(t => {
        let evd = t.evd;
        if (!evd) { const c = cands.find(x => x.key === t.sk); evd = c ? c.date : ''; if (evd) Matrix.patch(t.id, { evd }); }
        // older tasks have no event date: if the event is no longer ahead of us and the task is overdue, it is over
        if ((evd && evd < today) || (!evd && t.due && t.due < today)) Matrix.patch(t.id, { done: true, expired: true });
      });
    },

    run() {
      Schedule.expire();
      if (!st().auto) return 0;
      const p = Schedule.pending().filter(c => c.days <= 10).slice(0, 5);
      p.forEach(c => Matrix.add({ t: c.t, due: c.due, imp: c.imp, cat: c.cat, src: 'schedule', sk: c.key, evd: c.date }));
      if (p.length) Store.update(KEY, DEF, s => p.forEach(c => { s.added[c.key] = 1; }));
      return p.length;
    },
    addOne(key) {
      const c = Schedule.candidates().find(x => x.key === key);
      if (!c) return;
      Matrix.add({ t: c.t, due: c.due, imp: c.imp, cat: c.cat, src: 'schedule', sk: c.key, evd: c.date });
      Store.update(KEY, DEF, s => { s.added[key] = 1; });
    },
    dismiss(key) { Store.update(KEY, DEF, s => { s.dismissed[key] = 1; }); }
  };
  window.Schedule = Schedule;
})();
