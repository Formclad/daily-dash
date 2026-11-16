/*
 * BRIEF: the "assistant" logic. It reads everything the dashboard knows and works out
 * what matters today: what's next, what needs a decision, and what's coming up.
 * No data is stored here; it is all derived, so it is always current.
 */
(function () {
  const pad = n => String(n).padStart(2, '0');
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const mins = hm => parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3, 5), 10);

  // Words in a calendar event that deserve a heads-up, with the nudge to show.
  const RULES = [
    { re: /(pupil free|oshc|vacation care|closure|closed|last day of school|graduation|concert|transition|meet the teacher)/i, tag: 'School and childcare', nudge: 'Check childcare and what to bring' },
    { re: /(\bdr\b|doctor|mri|scan|clinic|dentist|dietitian|physio|\bgp\b|specialist|appointment|counselling|teeth)/i, tag: 'Appointment', nudge: 'Jot questions to ask beforehand' },
    { re: /(staying|trip|holiday park|flight|accommodation|booking|reservation)/i, tag: 'Trip or booking', nudge: 'Confirm details and what to pack' },
    { re: /(car off|repair|service|rego|registration|grooming)/i, tag: 'Errand', nudge: 'Allow travel time' }
  ];

  const Brief = {
    /** Calendar events on a date: all-day first, then timed. */
    events(date) { return Calendar.external(date).filter(e => e.source !== 'Strava'); },

    nextUp(date) {
      if (date !== U.today()) return null;
      const now = mins(nowHM());
      return Brief.events(date).filter(e => e.time && mins(e.time) >= now)[0] || null;
    },
    until(time) {
      const m = mins(time) - mins(nowHM());
      if (m <= 0) return 'now';
      return m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)}h ${pad(m % 60)}m`;
    },

    /** Things Sofia has to decide or do, drawn from every source. */
    needsYou(date) {
      const out = [];
      Briefings.actions().slice(0, 6).forEach(a => out.push({ kind: 'brief', t: a.t, sub: a.source, bid: a.bid, i: a.i }));
      const today = U.today();
      Matrix.ranked(today).filter(t => Matrix.quad(t, today) === 1 || (t.due && t.due < today)).slice(0, 4)
        .forEach(t => out.push({ kind: 'task', t: t.t, sub: Matrix.fmtDue(t, today), id: t.id }));
      Habits.forDay(date).forEach(h => { const a = Habits.stravaMatch(h, date); if (a) out.push({ kind: 'strava', t: `Count “${a.name}” for ${h.name}?`, sub: 'Strava', id: h.id }); });
      return out;
    },

    /** Spot things in the next `days` days that need preparing, booking or deciding. */
    headsUp(days = 14) {
      const out = [], seen = new Set(), today = U.today();
      for (let i = 1; i <= days; i++) {
        const d = U.addDays(today, i);
        for (const e of Brief.events(d)) {
          if (e.source === 'Tenders' || e.source === 'Runna') continue;
          const rule = RULES.find(r => r.re.test(e.text));
          if (!rule) continue;
          const k = e.text.toLowerCase() + rule.tag;
          if (seen.has(k)) continue;           // multi-day events: show once, on their first day
          seen.add(k);
          out.push({ d, i, text: e.text, tag: rule.tag, nudge: rule.nudge, time: e.time, source: e.source });
        }
      }
      return out.slice(0, 7);
    },

    /**
     * Today's focus, chosen for you: overdue or urgent-and-important Matrix tasks first, then things your
     * briefings say need you, then important-but-not-urgent tasks. A busy day gets fewer items.
     */
    focus(date) {
      const today = U.today();
      const timed = Brief.events(date).filter(e => e.time).length;
      const slots = timed >= 4 ? 2 : 3;
      const ranked = Matrix.ranked(today), out = [], seen = new Set(), spill = [];
      let prep = 0;
      // Prep tasks created from the schedule are limited to one in the focus, so real deadlines are never crowded out.
      const push = (c, fromSchedule) => {
        const k = c.t.toLowerCase();
        if (out.length >= slots || seen.has(k)) return;
        if (fromSchedule && prep >= 1) { spill.push(c); return; }
        seen.add(k); if (fromSchedule) prep++; out.push(c);
      };
      ranked.filter(t => Matrix.quad(t, today) === 1 || (t.due && t.due <= today)).forEach(t => push({ t: t.t, tid: t.id, why: Matrix.fmtDue(t, today) }, t.src === 'schedule'));
      Briefings.actions().forEach(a => push({ t: a.t, bid: `${a.bid}|${a.i}`, why: a.source }, false));
      ranked.filter(t => Matrix.quad(t, today) === 2).forEach(t => push({ t: t.t, tid: t.id, why: Matrix.fmtDue(t, today) }, t.src === 'schedule'));
      spill.forEach(c => { if (out.length < slots && !seen.has(c.t.toLowerCase())) { seen.add(c.t.toLowerCase()); out.push(c); } });
      return out;
    },

    /** Free gaps in today's schedule (approximate: each event is assumed to last an hour). */
    slots(date, count = 3) {
      if (date !== U.today()) return [];
      const n = new Date(), nowM = n.getHours() * 60 + n.getMinutes();
      let cursor = Math.max(8 * 60, Math.ceil(nowM / 15) * 15);
      const end = 18 * 60, free = [];
      const busy = Brief.events(date).filter(e => e.time).map(e => [mins(e.time), mins(e.time) + 60]).sort((a, b) => a[0] - b[0]);
      for (const [s, e] of busy) {
        if (s - cursor >= 45) free.push([cursor, Math.min(s, cursor + 90)]);
        cursor = Math.max(cursor, e);
      }
      if (end - cursor >= 45) free.push([cursor, Math.min(end, cursor + 90)]);
      const f = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      return free.slice(0, count).map(([a, b]) => `${f(a)} to ${f(b)}`);
    },

    headline(date) {
      const n = Brief.needsYou(date).length, nx = Brief.nextUp(date);
      const a = n ? `${n} thing${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} you` : 'Nothing needs you';
      const b = nx ? `Next: ${nx.text} at ${nx.time} (${Brief.until(nx.time)})` : (date === U.today() ? 'Nothing else timed today' : '');
      return [a, b].filter(Boolean).join('. ');
    }
  };
  window.Brief = Brief;
})();
