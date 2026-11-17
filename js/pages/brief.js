/*
 * HOME: your day, sorted. Read top to bottom on a phone:
 *   1 Next up   2 Today's focus   3 Today in order   4 Heads-up   5 At a glance   6 Coach
 * On a wide screen the same cards sit in two columns.
 * Today's focus is chosen from your Matrix (the one list of things to do), so nothing is repeated here.
 */
(function () {
  let timer = null;
  const dow = d => U.parse(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const ev = (e, cls = '') => `<div class="tlr ${cls}" ${Calendar.colorFor(e.source) ? `style="--c:${Calendar.colorFor(e.source)}"` : ''}><span class="tt">${U.esc(e.time || 'all day')}</span><span class="tx">${U.esc(e.text)}</span><em class="src">${U.esc(e.source || '')}</em></div>`;
  const row = (k, v) => `<div class="mini"><span>${k}</span><b>${v}</b></div>`;

  /**
   * Choose today's top three. Runs on every view: it fills them in when empty, and keeps them up to date
   * as new information arrives, until you tick or edit one (then they are yours and stay put).
   */
  function autoPriorities(date) {
    if (date !== U.today()) return;
    const day = Day.get(date);
    const empty = day.pri.every(p => !p.t.trim());
    const untouched = day.autoPicked && JSON.stringify(day.pri.map(p => p.t)) === JSON.stringify(day.autoPicked) && !day.pri.some(p => p.d);
    if (!empty && !untouched) return;
    const s = Brief.focus(date);
    const next = [0, 1, 2].map(i => (s[i] ? s[i].t : ''));
    if (JSON.stringify(next) === JSON.stringify(day.pri.map(p => p.t))) return;
    if (empty && !s.length) return;
    Day.update(date, x => { for (let i = 0; i < 3; i++) x.pri[i] = s[i] ? { t: s[i].t, d: false, tid: s[i].tid } : { t: '', d: false }; x.autoPicked = next; });
  }

  function html() {
    const date = U.today();
    Briefings.importToMatrix();     // briefing "needs you" items become Matrix tasks
    Schedule.run();                 // prep tasks from the schedule ahead; retire ones that have passed
    autoPriorities(date);
    const day = Day.get(date), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), hour = now.getHours();
    const events = Brief.events(date), nx = Brief.nextUp(date);
    const allDay = events.filter(e => !e.time), timed = events.filter(e => e.time);
    const due = Rhythms.dueOn(date), rt = Rhythms.ticks(date);
    const hab = Habits.forDay(date), habDone = hab.filter(h => day.habits[h.id]).length;

    // 1 NEXT UP
    const hero = nx
      ? `<section class="card hero o1"><div class="h-k">Next up · ${U.esc(Brief.until(nx.time))}</div><div class="h-t">${U.esc(nx.text)}</div><div class="h-s">${U.esc(nx.time)}${nx.source ? ' · ' + U.esc(nx.source) : ''}</div></section>`
      : `<section class="card hero calm o1"><div class="h-k">${hour < 12 ? 'Clear morning ahead' : 'Nothing else timed today'}</div><div class="h-s">Use the gaps for your focus below.</div></section>`;

    // 2 TODAY'S FOCUS
    const open = day.pri.filter(p => p.t.trim() && !p.d), slots = Brief.slots(date, open.length);
    const hasFocus = day.pri.some(p => p.t.trim());
    const later = Brief.focusLater(date, 2);
    const dueToday = Matrix.open().filter(t => t.due && t.due <= date).length;
    const more = Math.max(0, dueToday - day.pri.filter(p => p.t.trim()).length);
    const undated = Brief.undated();
    const focus = `<section class="card o2"><header class="card-h"><span class="stamp">✎</span><h2>Today’s focus</h2><a class="more" href="#/matrix">Matrix ›</a></header>` +
      (hasFocus ? Cards.priRows(day) : `<p class="calm-line">Nothing is urgent today. That’s a good thing.</p>`) +
      (open.length && slots.length ? `<div class="plan"><span>Suggested times</span>${open.map((p, i) => slots[i] ? `<div class="slot"><b>${U.esc(slots[i])}</b> ${U.esc(p.t)}</div>` : '').join('')}</div>` : '') +
      (more ? `<p class="hint"><a href="#/matrix">${more} more due today or overdue</a></p>` : '') +
      (later.length ? `<h3 class="aisle">When there’s room</h3>${later.map(t => `<div class="task"><button class="box-btn" data-m-done="${t.tid}" aria-label="Done"><span class="box"></span></button><div class="tk-main"><div class="tk-t">${U.esc(t.t)}</div><div class="tk-m">${U.esc(t.why)}</div></div></div>`).join('')}` : '') +
      (undated ? `<p class="hint">${undated} task${undated === 1 ? ' has' : 's have'} no date, so I can’t pick ${undated === 1 ? 'it' : 'them'}. <a href="#/matrix">Add dates</a></p>` : '') +
      `<div class="btn-row"><button class="pill ghost sm" data-act="use-suggest">Re-pick my focus</button></div></section>`;

    // 3 TODAY IN ORDER
    const tl = `<section class="card o3"><header class="card-h"><span class="stamp">◷</span><h2>Today, in order</h2><a class="more" href="#/plan">Edit ›</a></header>` +
      (allDay.length ? `<div class="chips">${allDay.map(e => `<span class="chip tag" ${Calendar.colorFor(e.source) ? `style="border-color:${Calendar.colorFor(e.source)}"` : ''}>${U.esc(e.text)}</span>`).join('')}</div>` : '') +
      (timed.length ? timed.map(e => ev(e, (parseInt(e.time.slice(0, 2), 10) * 60 + parseInt(e.time.slice(3, 5), 10) < nowM ? 'past' : '') + (nx === e ? ' next' : ''))).join('') : '<p class="hint">No timed events today.</p>') +
      (day.sched.length ? day.sched.map(s => ev({ time: s.t, text: s.x, source: '' })).join('') : '') +
      `<h3 class="aisle">Around the house</h3>` +
      (due.length ? due.map(r => `<div class="task ${rt[r.id] ? 'done' : ''}"><button class="box-btn ${rt[r.id] ? 'on' : ''}" data-r-tick="${r.id}" role="checkbox" aria-checked="${!!rt[r.id]}"><span class="box">${rt[r.id] ? '✓' : ''}</span></button><div class="tk-main"><div class="tk-t">${U.esc(Rhythms.label(r, date))}</div><div class="tk-m">${U.esc(r.area)}</div></div></div>`).join('') : '<p class="hint">No household jobs due today.</p>') + `</section>`;

    // 4 HEADS-UP
    const hu = Brief.headsUp(14);
    const heads = `<section class="card o4"><header class="card-h"><span class="stamp">☆</span><h2>Heads-up, next two weeks</h2></header>` +
      (hu.length ? hu.map(h => `<div class="hu"><div class="hu-d">${U.esc(dow(h.d))}${h.time ? ' · ' + U.esc(h.time) : ''}<small>in ${h.i} day${h.i === 1 ? '' : 's'}</small></div><div class="hu-m"><div class="hu-t">${U.esc(h.text)}</div><div class="hu-n">${U.esc(h.nudge)}</div></div></div>`).join('') : '<p class="hint">Nothing coming up that needs preparing.</p>') + `</section>`;

    // 5 AT A GLANCE (replaces the old grid dashboard)
    const moved = Strava.connected ? Strava.inWeek(U.weekStart(date)) : [], runs = moved.filter(Strava.isRun);
    const conf = Brief.confirmations(date).map(c => `<div class="conf"><span>${U.esc(c.t)}</span><button class="pill sm" data-act="strava-count" data-id="${c.id}">Yes</button></div>`).join('');
    const fam = Family.todaySummary(date).map(x => `${U.esc(x.name)} ${x.done}/${x.total}`).join(' · ');
    const goal = Goals.upcoming(1)[0], dinner = Meals.dinner(date);
    const glance = `<section class="card o5"><header class="card-h"><span class="stamp">▤</span><h2>At a glance</h2></header>` +
      row('Habits', `<a href="#/journal">${habDone} of ${hab.length} done</a>`) +
      row('Movement', Strava.connected ? `<a href="#/health">${moved.length} session${moved.length === 1 ? '' : 's'} this week${runs.length ? ' · ' + runs.reduce((n, a) => n + a.km, 0).toFixed(1) + ' km' : ''}</a>` : '<a href="#/health">Not connected</a>') + conf +
      row('Dinner', dinner ? U.esc(dinner) : '<a href="#/meals">Not planned yet</a>') +
      row('Shopping', `<a href="#/meals">${Meals.toBuy()} to get</a>`) +
      (fam ? row('Chores today', `<a href="#/family">${fam}</a>`) : '') +
      (goal ? row('Next milestone', `<a href="#/goals">${U.esc(goal.t)}${goal.due ? ' (' + U.esc(U.parse(goal.due).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })) + ')' : ''}</a>`) : '') + `</section>`;

    // 6 COACH
    const cm = Coach.message(date);
    const coach = `<section class="card coach o6"><header class="card-h"><span class="stamp">❀</span><h2>Your coach</h2><a class="more" href="#/coach">Check in ›</a></header>` +
      `<p class="coach-n">${U.esc(cm.noticed)}</p><p class="coach-t"><span>Try this</span>${U.esc(cm.tryThis)}</p></section>`;

    return `<header class="dayhead"><div class="dh-mid"><h1>${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</h1><div class="dh-sub">${U.esc(U.fmtLong(date))}</div></div></header>` +
      `<p class="headline">${U.esc(Brief.headline(date))}</p>` +
      `<div class="cols homecols"><div class="col">${hero}${focus}${glance}${coach}</div><div class="col">${tl}${heads}</div></div>`;
  }

  const mine = () => window.App && App.route === 'home';
  function render(app) {
    const y = window.scrollY;
    app.innerHTML = html();
    window.scrollTo(0, y);
    clearInterval(timer);
    timer = setInterval(() => { if (mine() && !TodayPage.isEditing()) render(app); }, 60000);   // keep "in 20 min" current
  }

  function bind(app) {
    app.addEventListener('click', e => {
      if (!mine()) return;
      let t;
      if ((t = e.target.closest('[data-m-done]'))) Matrix.setDone(t.dataset.mDone, true);
      else if ((t = e.target.closest('[data-r-tick]'))) Rhythms.tick(U.today(), t.dataset.rTick);
      else if ((t = e.target.closest('[data-act]')) && Day.act(t, U.today())) { /* handled */ }
      else return;
      render(app);
    });
    app.addEventListener('input', e => { if (mine() && e.target.matches('[data-path]')) Day.update(U.today(), d => U.setPath(d, e.target.dataset.path, e.target.value)); });
  }
  Calendar.onChange(() => { if (mine() && !TodayPage.isEditing()) render(document.getElementById('app')); });
  window.BriefPage = { render, bind };
})();
