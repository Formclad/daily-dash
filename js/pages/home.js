/*
 * HOME: the dashboard. A grid of tiles, each a small summary with quick actions.
 * Add a tile = write a function in TILES and list it in ORDER.
 */
(function () {
  const D = DD_DEFAULTS;
  const tile = (icon, title, link, inner, cls = '') =>
    `<section class="card tile ${cls}"><header class="card-h"><span class="stamp" aria-hidden="true">${icon}</span><h2>${U.esc(title)}</h2>${link ? `<a class="more" href="${link[0]}">${link[1]} ›</a>` : ''}</header>${inner}</section>`;

  const TILES = {
    focus(day) {
      const body = Cards.priRows(day) + (Matrix.suggest(U.today()).length ? Cards.suggestBox() : '');
      return tile('✎', 'Today’s focus', ['#/plan', 'Plan'], body, 'wide');
    },

    schedule(day, date, ext) {
      const items = day.sched.map(s => ({ t: s.t, x: s.x })).concat((ext || []).map(e => ({ t: e.time, x: e.text, ext: e.source })))
        .sort((a, b) => (a.t || '').localeCompare(b.t || ''));
      const rows = items.slice(0, 7).map(s => `<div class="ev"${s.ext && Calendar.colorFor(s.ext) ? ` style="--c:${Calendar.colorFor(s.ext)}"` : ''}><span class="et">${U.esc(s.t || '')}</span><span class="ex">${U.esc(s.x)}</span>${s.ext ? `<em class="src">${U.esc(s.ext)}</em>` : ''}</div>`).join('');
      return tile('◷', 'Schedule', ['#/plan', 'Edit'], rows || '<p class="hint">A clear day so far.</p>');
    },

    habits(day, date) {
      const list = Habits.forDay(date);
      const n = list.filter(h => day.habits[h.id]).length;
      const rows = list.map(h => {
        const st = day.habits[h.id];
        return `<div class="mh-wrap"><div class="mh ${st ? 'done' : ''}"><span class="mh-n">${U.esc(h.name)}</span>` +
          `<button class="hbtn ${st === 'full' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="full" aria-pressed="${st === 'full'}" aria-label="${U.esc(h.name)} full">✓<small>full</small></button>` +
          `<button class="hbtn mini ${st === 'mini' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="mini" aria-pressed="${st === 'mini'}" aria-label="${U.esc(h.name)} 2 minute">✓<small>2 min</small></button></div>${window.stravaPrompt(h, date)}</div>`;
      }).join('');
      const bar = list.length ? `<div class="prog" aria-hidden="true"><i style="width:${Math.round(100 * n / list.length)}%"></i></div><p class="hint">${n} of ${list.length} today</p>` : '';
      return tile('✿', 'Habits', ['#/journal', 'Details'], bar + (rows || '<p class="hint">Nothing scheduled today. Rest counts too.</p>'));
    },

    matrix(day, date) {
      const c = Matrix.counts(date);
      const cells = Matrix.QUADS.map(q => `<a class="qc q${q.n}" href="#/matrix"><b>${c[q.n]}</b><span>${q.name}</span></a>`).join('');
      return tile('▦', 'Matrix', ['#/matrix', 'Open'], `<div class="qgrid">${cells}</div>`);
    },

    body(day) {
      const ticks = D.bodyChecks.map(b => Cards.tick('body.' + b.id, day.body[b.id], b.label)).join('');
      return tile('☾', 'Energy & body', ['#/journal', 'More'], `<div class="ticks">${ticks}</div>${Cards.rating('rate.energy', day.rate.energy, 'Energy')}`);
    },

    goals() {
      const up = Goals.upcoming(3);
      const rows = up.map(m => `<div class="ev"><span class="et">${m.due ? U.esc(U.parse(m.due).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })) : ''}</span><span class="ex">${U.esc(m.t)}<br><small class="soft">${U.esc(m.goal)}</small></span></div>`).join('');
      return tile('◎', 'Goals', ['#/goals', 'Open'], rows || '<p class="hint">No milestones yet. Add a goal to start.</p>');
    },

    meals(day, date) {
      const dinner = Meals.dinner(date), n = Meals.toBuy();
      return tile('❋', 'Meals', ['#/meals', 'Plan'], `<p class="hint">Tonight’s dinner</p><p class="big">${dinner ? U.esc(dinner) : '<span class="soft">Not planned yet</span>'}</p><p class="hint">${n ? n + ' on the shopping list' : 'Shopping list is empty'}</p>`);
    },

    move() {
      if (!Strava.connected) return tile('♡', 'Movement', ['#/health', 'Open'], '<p class="hint">Connect Strava to see your runs and workouts here.</p>');
      const ws = U.weekStart(U.today()), acts = Strava.inWeek(ws), runs = acts.filter(Strava.isRun);
      const last = Strava.activities().slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
      return tile('♡', 'Movement', ['#/health', 'Open'], `<p class="big">${acts.length} session${acts.length === 1 ? '' : 's'} this week</p><p class="hint">${runs.length} run${runs.length === 1 ? '' : 's'} · ${runs.reduce((n, a) => n + a.km, 0).toFixed(1)} km · ${Strava.fmtTime(acts.reduce((n, a) => n + a.secs, 0))}</p>` +
        (last ? `<p class="hint">Latest: ${U.esc(last.name)} (${U.parse(last.date).toLocaleDateString('en-AU', { weekday: 'short' })})</p>` : ''));
    },

    family(day, date) {
      const rows = Family.todaySummary(date).map(x => `<div class="mh"><span class="mh-n">${U.esc(x.name)}</span><span class="hint">${x.done} of ${x.total} chores${x.done === x.total ? ' ★' : ''}</span></div>`).join('');
      return tile('☺', 'Family', ['#/family', 'Open'], rows || '<p class="hint">Add your family, chores and routines to see today here.</p>');
    },

    briefings() {
      const acts = Briefings.actions(), latest = Briefings.recent().slice(0, 3);
      const rows = acts.slice(0, 3).map(a => `<div class="mh"><button class="box-btn" data-b-tick="${a.bid}|${a.i}" aria-label="Done"><span class="box"></span></button><span class="mh-n small">${U.esc(a.t)}</span></div>`).join('');
      const recent = latest.map(b => `<div class="ev"><span class="et">${U.esc(Briefings.ago(b.at))}</span><span class="ex">${U.esc(b.title)}</span></div>`).join('');
      return tile('✉', 'Briefings', ['#/briefings', acts.length ? acts.length + ' need you' : 'Open'], (rows ? `<p class="hint">Needs you</p>${rows}` : '') + (recent || '<p class="hint">Results from your scheduled tasks appear here.</p>'), acts.length ? 'wide' : '');
    },

    journal(day) {
      const answered = day.mind.filter(x => x.trim()).length;
      const eve = ['well', 'diff', 'showed'].filter(k => (day.eve[k] || '').trim()).length;
      return tile('✿', 'Journal', ['#/journal', 'Open'],
        `<p class="hint">Morning mindset: ${answered} of 5 answered<br>Evening review: ${eve ? eve + ' of 3 written' : 'not started'}</p>` +
        `<label class="qa good"><span class="q">One good thing</span>${Cards.field('eve.good', day.eve.good, '✿', 1)}</label>`);
    }
  };
  const ORDER = ['focus', 'briefings', 'schedule', 'habits', 'matrix', 'move', 'goals', 'family', 'meals', 'body', 'journal'];

  let date = U.today();
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  function render(app) {
    date = U.today();
    const day = Day.get(date);
    const y = window.scrollY;
    app.innerHTML = `<header class="dayhead home"><div class="dh-mid"><h1>${greeting()}</h1><div class="dh-sub">${U.esc(U.fmtLong(date))}</div></div></header>` +
      `<div class="dash">${ORDER.map(k => TILES[k](day, date, Calendar.external(date))).join('')}</div>`;
    window.scrollTo(0, y);
  }

  const mine = () => window.App && App.route === 'home';
  function bind(app) {
    app.addEventListener('input', e => { if (mine() && e.target.matches('[data-path]')) Day.update(date, d => U.setPath(d, e.target.dataset.path, e.target.value)); });
    app.addEventListener('click', e => {
      if (!mine()) return;
      const t = e.target.closest('[data-b-tick]');
      if (t) { const [id, i] = t.dataset.bTick.split('|'); Briefings.tick(id, i); render(app); return; }
      const b = e.target.closest('[data-act]');
      if (b && Day.act(b, date)) render(app);
    });
  }
  Strava.onChange(() => { if (window.App && App.route === 'home' && !TodayPage.isEditing()) render(document.getElementById('app')); });
  Calendar.onChange(() => { if (window.App && App.route === 'home' && !TodayPage.isEditing()) render(document.getElementById('app')); });
  window.HomePage = { render, bind };
})();
