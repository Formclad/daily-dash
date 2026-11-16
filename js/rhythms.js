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
    EVERY: [['daily', 'Every day'], ['weekly', 'Every week'], ['fortnightly', 'Every fortnight'], ['monthly', 'Every month'], ['yearly', 'Every year']],
    SUGGESTIONS: ['Bins out', 'Change bed sheets', 'Clean bathrooms', 'Vacuum floors', 'Wash towels', 'Wipe kitchen surfaces', 'Pet flea and worm treatment',
      'Check car tyres and oil', 'Car registration', 'Test smoke alarms', 'Service air conditioner', 'Water the garden', 'Clear out the fridge',
      'Review bills and budget', 'Plan next week’s meals', 'Grocery order'],
    all: items,
    add({ t, area, every, date }) {
      const d = U.parse(date || U.today());
      const l = items();
      l.push({ id: U.id(), t, area, every, dow: d.getDay(), dom: d.getDate(), month: d.getMonth() + 1, start: U.ymd(d) });
      save(l);
    },
    remove(id) { save(items().filter(r => r.id !== id)); },

    /** Is this rhythm due on `date`? */
    isDue(r, date) {
      const d = U.parse(date);
      switch (r.every) {
        case 'daily': return true;
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
      return { daily: 'every day', weekly: dn[r.dow], fortnightly: 'every second ' + dn[r.dow], monthly: 'monthly, day ' + r.dom, yearly: 'yearly on ' + r.dom + '/' + r.month }[r.every] || '';
    }
  };
  window.Rhythms = Rhythms;
})();
