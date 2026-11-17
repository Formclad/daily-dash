/*
 * PLAN and JOURNAL pages: the planner spread, split into two tabs.
 *   plan    = top three (auto-suggested) + schedule
 *   journal = morning mindset, habit stack, energy & body, evening review
 * Each card is a small function in CARDS; VIEWS says which cards sit in which column.
 */
(function () {
  const D = DD_DEFAULTS;

  // ---------- building blocks (also used by the Home dashboard) ----------
  const card = (icon, title, inner, extra = '') =>
    `<section class="card ${extra}"><header class="card-h"><span class="stamp" aria-hidden="true">${icon}</span><h2>${U.esc(title)}</h2></header>${inner}</section>`;

  const field = (path, val, ph, rows = 1) =>
    `<textarea class="line" rows="${rows}" data-path="${path}" placeholder="${U.esc(ph || '')}" aria-label="${U.esc(ph || path)}">${U.esc(val)}</textarea>`;

  const tick = (path, on, label) =>
    `<button class="tick ${on ? 'on' : ''}" data-act="toggle" data-path="${path}" role="checkbox" aria-checked="${!!on}"><span class="box">${on ? '✓' : ''}</span><span class="tl">${U.esc(label)}</span></button>`;

  const rating = (path, val, label) =>
    `<div class="rate"><span class="rl">${U.esc(label)}</span><span class="dots" role="radiogroup" aria-label="${U.esc(label)}">` +
    [1, 2, 3, 4, 5].map(n => `<button class="dot ${val === n ? 'on' : ''}" data-act="rate" data-path="${path}" data-val="${n}" role="radio" aria-checked="${val === n}" aria-label="${n}">${n}</button>`).join('') +
    `</span></div>`;

  const priRows = day => day.pri.map((x, i) =>
    `<div class="pri"><button class="box-btn ${x.d ? 'on' : ''}" data-act="toggle" data-path="pri.${i}.d" role="checkbox" aria-checked="${!!x.d}" aria-label="Done"><span class="box">${x.d ? '✓' : ''}</span></button>` +
    `<textarea class="line ${x.d ? 'struck' : ''}" rows="1" data-path="pri.${i}.t" placeholder="Priority ${i + 1}" aria-label="Priority ${i + 1}">${U.esc(x.t)}</textarea></div>`).join('');

  /** "Suggested by your matrix" strip, shown when the matrix has picks. */
  const suggestBox = () => {
    const s = Matrix.suggest(U.today());
    if (!s.length) return `<p class="hint">Add tasks in <a href="#/matrix">Matrix</a> and the top three will be suggested here.</p>`;
    return `<div class="suggest"><span class="sg-h">Suggested by your matrix</span><ol>${s.map(t => `<li>${U.esc(t.t)}</li>`).join('')}</ol>` +
      `<button class="pill" data-act="use-suggest">Use these three</button></div>`;
  };

  /** "Strava has a run today. Count it?" (only when a matching activity exists and the habit isn't ticked). */
  const stravaPrompt = (h, date) => {
    const a = Habits.stravaMatch(h, date);
    return a ? `<button class="strava-q" data-act="strava-count" data-id="${h.id}">Strava has “${U.esc(a.name)}”${a.km ? ' (' + a.km + ' km)' : ''}. Count it?</button>` : '';
  };
  window.stravaPrompt = stravaPrompt;

  // ---------- cards ----------
  const CARDS = {
    morning(day) {
      const p = Store.get('config:prompts', U.clone(D.prompts));
      const rows = p.morning.map((q, i) => `<label class="qa"><span class="q">${U.esc(q)}</span>${field('mind.' + i, day.mind[i] || '', 'a line is plenty')}</label>`).join('');
      return card('☀', 'Morning mindset', rows + '<p class="hint">About three minutes. One line each.</p>');
    },

    priorities(day, date) {
      const p = Store.get('config:prompts', U.clone(D.prompts));
      return card('✎', 'Top three', priRows(day) + (date === U.today() ? suggestBox() : '') +
        `<p class="ferriss"><span>Ferriss question</span>${U.esc(p.ferriss)}</p>`);
    },

    schedule(day, date, ext) {
      const { startHour: a, endHour: z } = D.schedule;
      const items = day.sched.map((s, i) => ({ ...s, i })).concat((ext || []).map(e => ({ t: e.time, x: e.text, ext: e.source })));
      const hourOf = t => Math.min(z, Math.max(a, parseInt((t || '0').slice(0, 2), 10) || a));
      let rows = '';
      for (let h = a; h <= z; h++) {
        const here = items.filter(s => hourOf(s.t) === h).sort((p, q) => (p.t || '').localeCompare(q.t || ''));
        rows += `<div class="hr ${here.length ? 'has' : ''}"><span class="hl">${h % 12 || 12}<small>${h < 12 ? 'am' : 'pm'}</small></span><div class="hc">` +
          here.map(s => `<div class="ev"${s.ext && Calendar.colorFor(s.ext) ? ` style="--c:${Calendar.colorFor(s.ext)}"` : ''}><span class="et">${U.esc(s.t || '')}</span><span class="ex">${U.esc(s.x)}</span>${s.ext ? `<em class="src">${U.esc(s.ext)}</em>` : `<button class="x" data-act="sched-del" data-i="${s.i}" aria-label="Remove ${U.esc(s.x)}">×</button>`}</div>`).join('') +
          `</div></div>`;
      }
      const add = `<form class="add" data-act="sched-add"><input type="time" name="t" aria-label="Time" required><input type="text" name="x" placeholder="Add to the day" aria-label="What" required autocomplete="off"><button class="pill" type="submit">Add</button></form>`;
      return card('◷', 'Today’s schedule', `<div class="strip">${rows}</div>${add}`);
    },

    habits(day, date) {
      const list = Habits.forDay(date);
      if (!list.length) return card('✿', 'Habits', '<p class="hint">Nothing scheduled today. Rest counts too.</p>');
      const rows = list.map(h => {
        const st = day.habits[h.id];
        const n = Habits.note(h, date);
        return `<div class="habit ${st ? 'done' : ''}">` +
          `<div class="hb-main"><div class="hb-name">${U.esc(h.name)}</div><div class="hb-anchor">${U.esc(h.anchor)}</div>` +
          `<div class="hb-v"><b>Full:</b> ${U.esc(h.full)}<br><b>Easy:</b> ${U.esc(h.mini)}</div>` +
          (n.text ? `<div class="hb-note ${n.tone}">${U.esc(n.text)}</div>` : '') + stravaPrompt(h, date) + `</div>` +
          `<div class="hb-btns"><button class="hbtn ${st === 'full' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="full" aria-pressed="${st === 'full'}">✓<small>full</small></button>` +
          `<button class="hbtn mini ${st === 'mini' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="mini" aria-pressed="${st === 'mini'}">✓<small>easy</small></button></div></div>`;
      }).join('');
      return card('✿', 'Habit stack', rows + '<p class="hint"><b>Full</b> is the plan. <b>Easy</b> is a smaller version for a hard day. Either one counts and keeps your streak. A missed day is just information.</p>');
    },

    body(day) {
      const ticks = D.bodyChecks.map(c => tick('body.' + c.id, day.body[c.id], c.label)).join('');
      const rates = D.morningRatings.map(r => rating('rate.' + r.id, day.rate[r.id], r.label)).join('');
      return card('☾', 'Energy & body', `<div class="ticks">${ticks}</div><div class="rates">${rates}</div>`);
    },

    evening(day) {
      const rates = D.eveningRatings.map(r => rating('rate.' + r.id, day.rate[r.id], r.label)).join('');
      return card('★', 'Evening review',
        `<label class="qa"><span class="q">What went well?</span>${field('eve.well', day.eve.well, 'a line or two', 2)}</label>` +
        `<label class="qa"><span class="q">What I’d do differently</span>${field('eve.diff', day.eve.diff, 'no judgement, just notes', 2)}</label>` +
        `<label class="qa"><span class="q">Who did I show up well for today?</span>${field('eve.showed', day.eve.showed, '', 1)}</label>` +
        `<div class="rates">${rates}</div>` +
        `<label class="qa good"><span class="q">One good thing</span>${field('eve.good', day.eve.good, '✿', 1)}</label>`, 'evening');
    }
  };

  // Which cards go in which column (columns stack on phones).
  const VIEWS = {
    plan:    { left: ['priorities'], right: ['schedule'] },
    journal: { left: ['morning', 'body'], right: ['habits', 'evening'] }
  };

  // ---------- page ----------
  let current = null, view = 'plan';

  function html(date) {
    const day = Day.get(date);
    const isToday = date === U.today();
    const go = d => `#/${view}/${d}`;
    const head = `<header class="dayhead"><a class="arrow" href="${go(U.addDays(date, -1))}" aria-label="Previous day">‹</a>` +
      `<div class="dh-mid"><h1>${U.esc(U.fmtLong(date))}</h1>` +
      `<div class="dh-sub">${isToday ? '<span class="stamp-today">today</span>' : `<a href="${go(U.today())}">back to today</a>`}</div></div>` +
      `<a class="arrow" href="${go(U.addDays(date, 1))}" aria-label="Next day">›</a></header>`;
    const col = names => `<div class="col">${names.map(n => CARDS[n](day, date, Calendar.external(date))).join('')}</div>`;
    const v = VIEWS[view];
    return head + `<div class="cols">${col(v.left)}${col(v.right)}</div><p class="foot">Be kind to yourself. Tomorrow is a fresh page.</p>`;
  }

  const isEditing = () => /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');

  function render(app, date, v) {
    current = date; view = v || view;
    const y = window.scrollY;
    app.innerHTML = html(date);
    window.scrollTo(0, y);
  }

  const mine = () => window.App && (App.route === 'plan' || App.route === 'journal');

  /** One-time event wiring (delegation, so re-rendering never loses handlers). */
  function bind(app) {
    app.addEventListener('input', e => {
      const t = e.target;
      if (mine() && t.matches('[data-path]')) Day.update(current, d => U.setPath(d, t.dataset.path, t.value));
    });

    app.addEventListener('click', e => {
      if (!mine()) return;
      const b = e.target.closest('[data-act]');
      if (!b || b.tagName === 'FORM') return;
      if (Day.act(b, current)) render(app, current);
    });

    app.addEventListener('submit', e => {
      if (!mine()) return;
      const f = e.target.closest('form[data-act="sched-add"]');
      if (!f) return;
      e.preventDefault();
      const t = f.t.value, x = f.x.value.trim();
      if (!t || !x) return;
      Day.update(current, d => { d.sched.push({ t, x }); d.sched.sort((p, q) => p.t.localeCompare(q.t)); });
      render(app, current);
    });
  }

  Calendar.onChange(() => { if (window.App && (App.route === 'plan' || App.route === 'journal') && !isEditing()) render(document.getElementById('app'), current); });
  window.TodayPage = { render, bind, isEditing };
  window.Cards = { card, field, tick, rating, priRows, suggestBox };   // reused by Home
})();
