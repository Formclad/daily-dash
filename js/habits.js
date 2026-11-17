/*
 * HABITS: pure logic for habit stacking, streaks and "never miss twice".
 * A day counts as done if EITHER the full or the easy (smaller) version was ticked.
 * The day record stores habits as { habitId: 'full' | 'mini' }.
 */
(function () {
  const Habits = {
    list() { return Store.get('config:habits', U.clone(DD_DEFAULTS.habits)); },

    done(id, date) { const d = Store.peek('day:' + date); return !!(d && d.habits && d.habits[id]); },
    scheduled(h, date) { return h.perWeek ? true : (h.days || []).includes(U.dow(date)); },

    /** Habits to show on the daily page: scheduled today, or weekly-target habits. */
    forDay(date) { return Habits.list().filter(h => Habits.scheduled(h, date)); },

    /** Count of ticks in the Mon-Sun week containing `date`. */
    weekCount(h, date) {
      const start = U.weekStart(date);
      let n = 0;
      for (let i = 0; i < 7; i++) if (Habits.done(h.id, U.addDays(start, i))) n++;
      return n;
    },

    /**
     * Streak info for a day-scheduled habit.
     *  streak     scheduled days done in a row (today included once ticked)
     *  missed     scheduled days missed immediately before today
     *  everDone   has it ever been ticked (so we don't nag brand-new habits)
     */
    streak(h, date) {
      const days = Store.keys('day:').map(k => k.slice(4)).sort();
      const earliest = days[0] || date;
      const everDone = days.some(d => Habits.done(h.id, d));
      const todayDone = Habits.done(h.id, date);
      let run = 0, missed = 0;
      // Walk back over the scheduled days before `date` (today gets a grace period).
      for (let i = 0, d = U.addDays(date, -1); i < 400 && d >= earliest; i++, d = U.addDays(d, -1)) {
        if (!Habits.scheduled(h, d)) continue;
        if (Habits.done(h.id, d)) { if (missed > 0) break; run++; }
        else { if (run > 0) break; missed++; }
      }
      return { streak: (todayDone ? 1 : 0) + (missed > 0 ? 0 : run), missed: everDone ? missed : 0, everDone };
    },

    /** A Strava activity on `date` that fits this habit, if it isn't already ticked (else null). */
    stravaMatch(h, date) {
      if (!h.strava || Habits.done(h.id, date) || !window.Strava || !Strava.connected) return null;
      return Strava.forDate(date).find(a => h.strava.includes(a.sport)) || null;
    },

    /** Gentle one-line message for the habit row. */
    note(h, date) {
      const done = Habits.done(h.id, date);
      if (h.perWeek) {
        const n = Habits.weekCount(h, date);
        return { text: `${n} of ${h.perWeek} this week`, tone: n >= h.perWeek ? 'good' : '' };
      }
      const s = Habits.streak(h, date);
      if (done) return { text: s.streak > 1 ? `🌱 ${s.streak} in a row` : '🌱 Done, lovely', tone: 'good' };
      if (s.missed === 1) return { text: 'Never miss twice: today is the day (the easy version counts)', tone: 'nudge' };
      if (s.missed > 1) return { text: 'Fresh start today. The easy version is plenty', tone: 'nudge' };
      return { text: '', tone: '' };
    }
  };
  window.Habits = Habits;
})();
