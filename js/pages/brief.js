/*
 * HOME (the assistant view): "Your day, sorted". Read top to bottom; tick as you go.
 */
(function () {
  const D = DD_DEFAULTS;
  let timer = null;

  const dow = d => U.parse(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const ev = (e, cls = '') => `<div class="tlr ${cls}" ${Calendar.colorFor(e.source) ? `style="--c:${Calendar.colorFor(e.source)}"` : ''}><span class="tt">${U.esc(e.time || 'all day')}</span><span class="tx">${U.esc(e.text)}</span><em class="src">${U.esc(e.source || '')}</em></div>`;

  /** Auto-pick today's top three from the matrix when nothing is set yet. */
  function autoPriorities(date) {
    if (date !== U.today()) return;
    const day = Day.get(date);
    if (day.pri.some(p => p.t.trim())) return;
    const s = Brief.focus(date);
    if (s.length) Day.update(date, x => s.forEach((c, i) => { x.pri[i] = { t: c.t, d: false, tid: c.tid, bid: c.bid }; }));
  }

  function html() {
    const date = U.today();
    Schedule.run();                 // add prep tasks from the schedule ahead, then choose the focus
    autoPriorities(date);
    const day = Day.get(date);
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const events = Brief.events(date), nx = Brief.nextUp(date);
    const allDay = events.filter(e => !e.time), timed = events.filter(e => e.time);
    const dinner = Meals.dinner(date), due = Rhythms.dueOn(date), rt = Rhythms.ticks(date);
    const hab = Habits.forDay(date), habDone = hab.filter(h => day.habits[h.id]).length;
    const needs = Brief.needsYou(date);
    const hour = new Date().getHours();

    const hero = nx
      ? `<section class="card hero"><div class="h-k">Next up · ${U.esc(Brief.until(nx.time))}</div><div class="h-t">${U.esc(nx.text)}</div><div class="h-s">${U.esc(nx.time)}${nx.source ? ' · ' + U.esc(nx.source) : ''}</div></section>`
      : `<section class="card hero calm"><div class="h-k">${hour < 12 ? 'Clear morning ahead' : 'Nothing else timed today'}</div><div class="h-s">Use the gaps for your top three below.</div></section>`;

    const needsCard = `<section class="card"><header class="card-h"><span class="stamp">!</span><h2>Needs you</h2><a class="more" href="#/briefings">Briefings ›</a></header>` +
      (needs.length ? needs.map(n => n.kind === 'brief'
        ? `<div class="task"><button class="box-btn" data-b-tick="${n.bid}|${n.i}" aria-label="Done"><span class="box"></span></button><div class="tk-main"><div class="tk-t">${U.esc(n.t)}</div><div class="tk-m">${U.esc(n.sub)}</div></div></div>`
        : n.kind === 'task'
          ? `<div class="task"><button class="box-btn" data-m-done="${n.id}" aria-label="Done"><span class="box"></span></button><div class="tk-main"><div class="tk-t">${U.esc(n.t)}</div><div class="tk-m hot">${U.esc(n.sub)}</div></div></div>`
          : `<div class="task"><button class="pill sm" data-act="strava-count" data-id="${n.id}">Yes</button><div class="tk-main"><div class="tk-t">${U.esc(n.t)}</div></div></div>`).join('')
        : '<p class="hint">You’re clear. Nothing is waiting on a decision from you.</p>') + `</section>`;

    const open = day.pri.filter(p => p.t.trim() && !p.d), slots = Brief.slots(date, open.length);
    const top = `<section class="card"><header class="card-h"><span class="stamp">✎</span><h2>Today’s focus</h2><a class="more" href="#/plan">Plan ›</a></header>${Cards.priRows(day)}` +
      (open.length && slots.length ? `<div class="plan"><span>Suggested times</span>${open.map((p, i) => slots[i] ? `<div class="slot"><b>${U.esc(slots[i])}</b> ${U.esc(p.t)}</div>` : '').join('')}</div>` : '') +
      (day.pri.some(p => p.t.trim()) ? '' : '<p class="hint">Add tasks in Matrix and I’ll choose these for you each morning.</p>') +
      `<div class="btn-row"><button class="pill ghost sm" data-act="use-suggest">Re-pick my focus</button></div></section>`;

    // One timeline: all-day chips, timed events, then anything that has no time.
    const tl = `<section class="card"><header class="card-h"><span class="stamp">◷</span><h2>Today, in order</h2><a class="more" href="#/plan">Edit ›</a></header>` +
      (allDay.length ? `<div class="chips">${allDay.map(e => `<span class="chip tag" ${Calendar.colorFor(e.source) ? `style="border-color:${Calendar.colorFor(e.source)}"` : ''}>${U.esc(e.text)}</span>`).join('')}</div>` : '') +
      (timed.length ? timed.map(e => ev(e, (parseInt(e.time.slice(0, 2), 10) * 60 + parseInt(e.time.slice(3, 5), 10) < nowM ? 'past' : '') + (nx === e ? ' next' : ''))).join('') : '<p class="hint">No timed events today.</p>') +
      (day.sched.length ? day.sched.map(s => ev({ time: s.t, text: s.x, source: '' })).join('') : '') +
      (Matrix.open().filter(t => t.due === date).length ? `<h3 class="aisle">Due today</h3>` + Matrix.open().filter(t => t.due === date).map(t => `<div class="task"><button class="box-btn" data-m-done="${t.id}" aria-label="Done"><span class="box"></span></button><div class="tk-main"><div class="tk-t">${U.esc(t.t)}</div><div class="tk-m">${U.esc(t.src === 'schedule' ? 'from your schedule' : (t.cat || 'Matrix'))}</div></div></div>`).join('') : '') +
      `<h3 class="aisle">Around the house</h3>` +
      (due.length ? due.map(r => `<div class="task ${rt[r.id] ? 'done' : ''}"><button class="box-btn ${rt[r.id] ? 'on' : ''}" data-r-tick="${r.id}" role="checkbox" aria-checked="${!!rt[r.id]}"><span class="box">${rt[r.id] ? '✓' : ''}</span></button><div class="tk-main"><div class="tk-t">${U.esc(r.t)}</div><div class="tk-m">${U.esc(r.area)}</div></div></div>`).join('') : '<p class="hint">No household jobs due today.</p>') +
      `<div class="mini"><span>Dinner</span><b>${dinner ? U.esc(dinner) : '<a href="#/meals">Not planned yet</a>'}</b></div>` +
      `<div class="mini"><span>Shopping</span><b><a href="#/meals">${Meals.toBuy()} to get</a></b></div>` +
      `<div class="mini"><span>Habits</span><b><a href="#/journal">${habDone} of ${hab.length} done</a></b></div>` +
      `</section>`;

    const cm = Coach.message(date);
    const coach = `<section class="card coach"><header class="card-h"><span class="stamp">❀</span><h2>Your coach</h2><a class="more" href="#/coach">Check in ›</a></header>` +
      `<p class="coach-n">${U.esc(cm.noticed)}</p><p class="coach-t"><span>Try this</span>${U.esc(cm.tryThis)}</p></section>`;

    const hu = Brief.headsUp(14);
    const heads = `<section class="card"><header class="card-h"><span class="stamp">☆</span><h2>Heads-up, next two weeks</h2></header>` +
      (hu.length ? hu.map(h => `<div class="hu"><div class="hu-d">${U.esc(dow(h.d))}${h.time ? ' · ' + U.esc(h.time) : ''}<small>in ${h.i} day${h.i === 1 ? '' : 's'}</small></div><div class="hu-m"><div class="hu-t">${U.esc(h.text)}</div><div class="hu-n">${U.esc(h.nudge)}</div></div></div>`).join('') : '<p class="hint">Nothing coming up that needs preparing.</p>') + `</section>`;

    return `<header class="dayhead home"><div class="dh-mid"><h1>${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</h1><div class="dh-sub">${U.esc(U.fmtLong(date))}</div></div></header>` +
      `<p class="headline">${U.esc(Brief.headline(date))}</p>` +
      `<div class="cols"><div class="col">${hero}${needsCard}${top}${coach}</div><div class="col">${tl}${heads}</div></div>`;
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
      if ((t = e.target.closest('[data-b-tick]'))) { const [id, i] = t.dataset.bTick.split('|'); Briefings.tick(id, i); }
      else if ((t = e.target.closest('[data-m-done]'))) Matrix.setDone(t.dataset.mDone, true);
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
