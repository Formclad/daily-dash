/*
 * COACH: a supportive, evidence-informed nudge based on what the dashboard knows about you.
 * Rule-based (no AI call, nothing leaves your device): it notices wins and strain, then offers one small step.
 * Techniques are borrowed from CBT (thought records, reframing, behavioural activation), habit science and
 * self-compassion. This is self-help support, NOT therapy or medical advice.
 */
(function () {
  const dayOf = d => Store.peek('day:' + d) || {};
  const dayNo = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const pick = list => list[dayNo() % list.length];

  const REFRAMES = [
    'What would I say to a friend who was in my position right now?',
    'Is this a fact, or is it a feeling that is telling me a story?',
    'Am I mind-reading? What do I actually know, as opposed to what I am guessing?',
    'What is the smallest next step, and can I do it for just two minutes?',
    'If this went “okay” instead of “badly”, what would that look like?',
    'What is within my control today, and what can I let go of?',
    'Where am I treating a mistake as proof I am failing? What is the more balanced view?',
    'What has helped me get through something like this before?'
  ];
  const STRENGTHS = [
    'You carry a lot and you still show up. That is strength, not luck.',
    'Progress is not a straight line. A messy day still counts as a day you kept going.',
    'You do not have to do it all. Doing the next right thing is enough.',
    'Rest is part of the work, not a reward for finishing it.',
    'Small and consistent beats big and occasional. You are building something.'
  ];

  /** How to respond to each feeling: a short, practical set of steps. */
  const FEELINGS = [
    { id: 'great', label: 'Good', emoji: '☀', say: 'Lovely. Notice what is helping today so you can repeat it.', steps: ['Write one thing that is going well.', 'Use the energy on your hardest priority first.'] },
    { id: 'okay', label: 'Okay', emoji: '☁', say: 'Steady is a good place to build from.', steps: ['Do the first of your top three.', 'Have a glass of water and some protein.'] },
    { id: 'flat', label: 'Flat or tired', emoji: '☾', say: 'Low energy is information, not failure. Lower the bar, not the kindness.', steps: ['Step outside for 5 minutes of daylight.', 'Pick only ONE must-do today; the rest can be the two-minute version.', 'Aim for an earlier wind-down tonight.'] },
    { id: 'low', label: 'Low or sad', emoji: '☂', say: 'I am sorry it is heavy. You do not have to fix it, only take one gentle step.', steps: ['Behavioural activation: choose one small, easy thing (shower, short walk, text a friend).', 'Do it for 10 minutes, then check in again.', 'Write one thing, however small, that was okay today.'] },
    { id: 'stressed', label: 'Stressed', emoji: '⚡', say: 'Too many things at once. Let us shrink the list.', steps: ['Open Matrix and look only at “Do first”.', 'Tick off one thing, then decide if the next truly has to be today.', 'Take 5 slow breaths: in for 4, out for 6.'] },
    { id: 'overwhelmed', label: 'Overwhelmed', emoji: '☁', say: 'When everything feels urgent, nothing is clear. Just pick one.', steps: ['Do a brain dump: write everything down for 2 minutes.', 'Circle the ONE thing that would make the rest easier.', 'Do only the first 2 minutes of it.'] },
    { id: 'anxious', label: 'Anxious or worried', emoji: '❍', say: 'Worry is your mind trying to protect you. Let us slow it down.', steps: ['Ground yourself: name 5 things you can see, 4 you can feel, 3 you can hear.', 'Try a Thought check below: what am I predicting, and how likely is it?', 'Decide on one action you can take, or choose a “worry time” later to set it down until then.'] }
  ];

  const Coach = {
    FEELINGS, REFRAMES,
    feeling: id => FEELINGS.find(f => f.id === id),
    reframe: () => pick(REFRAMES),

    /** A short message for Home: one thing noticed, one thing to try. */
    message(date) {
      const today = U.today(), y = U.addDays(today, -1), yd = dayOf(y), td = dayOf(today);
      const noticed = [], tryThis = [];

      // wins to notice
      const best = Habits.list().map(h => ({ h, s: Habits.streak(h, today).streak })).sort((a, b) => b.s - a.s)[0];
      if (best && best.s >= 3) noticed.push(`You are ${best.s} in a row with ${best.h.name.toLowerCase()}. That is a habit taking root.`);
      const moved = Strava.connected ? Strava.inWeek(U.weekStart(today)).length : 0;
      if (moved) noticed.push(`You have moved ${moved} time${moved === 1 ? '' : 's'} this week. That counts.`);
      const didPri = (yd.pri || []).filter(p => p.d).length;
      if (didPri) noticed.push(`Yesterday you finished ${didPri} of your top three. Well done.`);
      const good = ((yd.eve || {}).good || '').trim();
      if (good) noticed.push(`Yesterday’s good thing: “${good.slice(0, 80)}”.`);

      // strain to respond to
      const r = yd.rate || {};
      if (td.feel) { const f = Coach.feeling(td.feel); if (f) tryThis.push(f.say); }
      else if (r.sleep && r.sleep <= 2) tryThis.push('Sleep was rough. Protect one priority today and keep tonight’s wind-down early.');
      else if ((r.mood && r.mood <= 2) || (r.energy && r.energy <= 2)) tryThis.push('Yesterday felt low. Today, aim for one gentle win and some daylight early.');
      const missed = Habits.forDay(y).filter(h => !Habits.done(h.id, y)).length;
      if (!tryThis.length && missed && Object.keys(yd).length) tryThis.push('A missed day is information, not failure. Never miss twice: the two-minute version counts today.');
      if (!tryThis.length && Matrix.open().filter(t => t.due && t.due <= today).length > 4) tryThis.push('There is a lot on the list. Pick ONE thing; the rest can wait.');
      if (!tryThis.length) tryThis.push(Coach.reframe());

      return { noticed: noticed[0] || pick(STRENGTHS), tryThis: tryThis[0] };
    },

    /** Last 7 days of wins, gathered automatically (for the "Wins" tab). */
    wins() {
      const out = [], today = U.today();
      for (let i = 0; i < 7; i++) {
        const d = U.addDays(today, -i), day = dayOf(d);
        const h = Object.keys(day.habits || {}).length, p = (day.pri || []).filter(x => x.d).length, good = ((day.eve || {}).good || '').trim();
        const s = Strava.connected ? Strava.forDate(d) : [];
        const bits = [];
        if (h) bits.push(`${h} habit${h === 1 ? '' : 's'} done`);
        if (p) bits.push(`${p} priorit${p === 1 ? 'y' : 'ies'} finished`);
        s.forEach(a => bits.push(a.name));
        if (good) bits.push(`good thing: ${good.slice(0, 70)}`);
        if (bits.length) out.push({ d, bits });
      }
      return out;
    }
  };
  window.Coach = Coach;
})();
