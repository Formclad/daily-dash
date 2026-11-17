/*
 * RHYTHMS: household jobs that repeat (bins, sheets, car rego, smoke alarms...).
 * They appear on the day they are due, so nothing has to be remembered.
 * Data: 'data:rhythms' = { items: [{ id, t, area, every, dow, dom, month, start }] }
 *       'rhythm:<date>'  = { <id>: 1 }   (ticked off that day)
 */
(function () {
  const KEY = 'data:rhythms';
  const items = () => Store.get(KEY, { items: [] }).items;
  const save = l => Store.set(KEY, { items: l });

  const Rhythms = {
    AREAS: ['Home', 'Cleaning', 'Laundry', 'Kids', 'Pets', 'Car', 'Garden', 'Admin & bills', 'Health'],
    EVERY: [['daily', 'Every day'], ['weekdays', 'Weekdays (Mon to Fri)'], ['weekly', 'Every week'], ['fortnightly', 'Every fortnight'], ['monthly', 'Every month'], ['yearly', 'Every year']],
    SUGGESTIONS: ['Bins out', 'Change bed sheets', 'Clean bathrooms', 'Vacuum floors', 'Wash towels', 'Wipe kitchen surfaces', 'Pet flea and worm treatment',
      'Check car tyres and oil', 'Car registration', 'Test smoke alarms', 'Service air conditioner', 'Water the garden', 'Clear out the fridge',
      'Review bills and budget', 'Plan next week’s meals', 'Grocery order'],
    all: items,
    add({ t, area, every, date, rot }) {
      const d = U.parse(date || U.today());
      const l = items();
      const r = { id: U.id(), t, area, every, dow: d.getDay(), dom: d.getDate(), month: d.getMonth() + 1, start: U.ymd(d) };
      if (rot) r.rot = rot;
      l.push(r);
      save(l);
    },
    /** The text to show on a date. Rotating jobs (like the weekly cleaning zone) change each week. */
    label(r, date) {
      if (!r.rot || !r.rot.length) return r.t;
      const weeks = Math.round((U.parse(U.weekStart(date)) - U.parse(U.weekStart(r.start || date))) / 6048e5);
      return `${r.t}: ${r.rot[((weeks % r.rot.length) + r.rot.length) % r.rot.length]}`;
    },
    /**
     * A starter routine in the spirit of the FlyLady method: shine the sink, a 15-minute zone mission
     * that moves round the house each week, short morning and evening routines, a weekly plan and a declutter.
     * Safe to press twice: jobs that already exist are skipped.
     */
    addStarter() {
      const have = new Set(items().map(r => r.t.toLowerCase())), monday = U.weekStart(U.today());
      const want = [
        { t: 'Shine the sink (5 minutes)', area: 'Cleaning', every: 'daily', date: monday },
        { t: 'Morning routine: dressed, shoes on, bed made', area: 'Home', every: 'daily', date: monday },
        { t: 'Evening routine: sink shined, bags and clothes ready for tomorrow', area: 'Home', every: 'daily', date: monday },
        { t: '15-minute zone mission', area: 'Cleaning', every: 'weekdays', date: monday, rot: ['Zone 1: entrance, porch and dining room', 'Zone 2: kitchen', 'Zone 3: main bathroom and one extra room', 'Zone 4: master bedroom, its bathroom and wardrobe', 'Zone 5: living room'] },
        { t: 'Weekly plan: look at the week ahead, meals, appointments and laundry', area: 'Admin & bills', every: 'weekly', date: U.addDays(monday, 6) },
        { t: 'Declutter 27 things (bin, donate or return)', area: 'Home', every: 'weekly', date: U.addDays(monday, 5) }
      ].filter(w => !have.has(w.t.toLowerCase()));
      want.forEach(w => Rhythms.add(w));
      return want.length;
    },
    remove(id) { save(items().filter(r => r.id !== id)); },

    /** Is this rhythm due on `date`? */
    isDue(r, date) {
      const d = U.parse(date);
      switch (r.every) {
        case 'daily': return true;
        case 'weekdays': return d.getDay() >= 1 && d.getDay() <= 5;
        case 'weekly': return d.getDay() === r.dow;
        case 'fortnightly': {
          if (d.getDay() !== r.dow) return false;
          const weeks = Math.round((U.parse(U.weekStart(date)) - U.parse(U.weekStart(r.start || date))) / 6048e5);
          return ((weeks % 2) + 2) % 2 === 0;
        }
        case 'monthly': return d.getDate() === Math.min(r.dom, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
        case 'yearly': return d.getMonth() + 1 === r.month && d.getDate() === r.dom;
      }
      return false;
    },
    dueOn: date => items().filter(r => Rhythms.isDue(r, date)),
    ticks: date => Store.peek('rhythm:' + date) || {},
    tick(date, id) { Store.update('rhythm:' + date, {}, t => { t[id] ? delete t[id] : (t[id] = 1); }); },
    describe(r) {
      const dn = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      return { daily: 'every day', weekdays: 'Monday to Friday', weekly: dn[r.dow], fortnightly: 'every second ' + dn[r.dow], monthly: 'monthly, day ' + r.dom, yearly: 'yearly on ' + r.dom + '/' + r.month }[r.every] || '';
    }
  };
  window.Rhythms = Rhythms;
})();
