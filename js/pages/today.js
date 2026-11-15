/*
 * TODAY PAGE: the planner spread for one day.
 * Layout is split into small section functions (one per card) so a new card
 * is: write a function, add it to SECTIONS. All text/labels come from DD_DEFAULTS
 * or the saved config, never hard-coded in here.
 */
(function () {
  const D = DD_DEFAULTS;
  const key = date => 'day:' + date;

  /** What a brand-new day looks like. */
  const blankDay = () => ({
    mind: ['', '', '', '', ''],
    pri: [{ t: '', d: false }, { t: '', d: false }, { t: '', d: false }],
    sched: [],            // [{ t: 'HH:MM', x: 'text' }]
    habits: {},           // { habitId: 'full' | 'mini' }
    body: {},             // { sun: true, ... }
    rate: {},             // { energy: 4, ... }
    eve: { well: '', diff: '', showed: '', good: '' }
  });
  const getDay = date => Object.assign(blankDay(), Store.get(key(date), {}));

  // ---------- small building blocks ----------
  const card = (n, icon, title, inner, extra = '') =>
    `<section class="card ${extra}"><header class="card-h"><span class="stamp" aria-hidden="true">${icon}</span><h2>${U.esc(title)}</h2><span class="no">No.${n}</span></header>${inner}</section>`;

  const field = (path, val, ph, rows = 1) =>
    `<textarea class="line" rows="${rows}" data-path="${path}" placeholder="${U.esc(ph || '')}" aria-label="${U.esc(ph || path)}">${U.esc(val)}</textarea>`;

  const tick = (path, on, label) =>
    `<button class="tick ${on ? 'on' : ''}" data-act="toggle" data-path="${path}" role="checkbox" aria-checked="${!!on}"><span class="box">${on ? '✓' : ''}</span><span class="tl">${U.esc(label)}</span></button>`;

  const rating = (path, val, label) =>
    `<div class="rate"><span class="rl">${U.esc(label)}</span><span class="dots" role="radiogroup" aria-label="${U.esc(label)}">` +
    [1, 2, 3, 4, 5].map(n => `<button class="dot ${val === n ? 'on' : ''}" data-act="rate" data-path="${path}" data-val="${n}" role="radio" aria-checked="${val === n}" aria-label="${n}">${n}</button>`).join('') +
    `</span></div>`;

  // ---------- sections ----------
  const SECTIONS = [
    function morning(day) {
      const p = Store.get('config:prompts', U.clone(D.prompts));
      const rows = p.morning.map((q, i) => `<label class="qa"><span class="q">${U.esc(q)}</span>${field('mind.' + i, day.mind[i] || '', 'a line is plenty')}</label>`).join('');
      return card(1, '☀', 'Morning mindset', rows + '<p class="hint">About three minutes. One line each.</p>');
    },

    function priorities(day) {
      const p = Store.get('config:prompts', U.clone(D.prompts));
      const rows = day.pri.map((x, i) =>
        `<div class="pri"><button class="box-btn ${x.d ? 'on' : ''}" data-act="toggle" data-path="pri.${i}.d" role="checkbox" aria-checked="${!!x.d}" aria-label="Done"><span class="box">${x.d ? '✓' : ''}</span></button>` +
        `<textarea class="line ${x.d ? 'struck' : ''}" rows="1" data-path="pri.${i}.t" placeholder="Priority ${i + 1}" aria-label="Priority ${i + 1}">${U.esc(x.t)}</textarea></div>`).join('');
      return card(2, '✎', 'Top three', rows + `<p class="ferriss"><span>Ferriss question</span>${U.esc(p.ferriss)}</p>`);
    },

    function schedule(day, date, ext) {
      const { startHour: a, endHour: z } = D.schedule;
      const items = day.sched.map((s, i) => ({ ...s, i })).concat((ext || []).map(e => ({ t: e.time, x: e.text, ext: e.source })));
      const hourOf = t => Math.min(z, Math.max(a, parseInt((t || '0').slice(0, 2), 10) || a));
      let rows = '';
      for (let h = a; h <= z; h++) {
        const here = items.filter(s => hourOf(s.t) === h).sort((p, q) => (p.t || '').localeCompare(q.t || ''));
        rows += `<div class="hr ${here.length ? 'has' : ''}"><span class="hl">${h % 12 || 12}<small>${h < 12 ? 'am' : 'pm'}</small></span><div class="hc">` +
          here.map(s => `<div class="ev"><span class="et">${U.esc(s.t || '')}</span><span class="ex">${U.esc(s.x)}</span>${s.ext ? `<em class="src">${U.esc(s.ext)}</em>` : `<button class="x" data-act="sched-del" data-i="${s.i}" aria-label="Remove ${U.esc(s.x)}">×</button>`}</div>`).join('') +
          `</div></div>`;
      }
      const add = `<form class="add" data-act="sched-add"><input type="time" name="t" aria-label="Time" required><input type="text" name="x" placeholder="Add to the day" aria-label="What" required autocomplete="off"><button class="pill" type="submit">Add</button></form>`;
      return card(3, '◷', 'Today’s schedule', `<div class="strip">${rows}</div>${add}`);
    },

    function habits(day, date) {
      const list = Habits.forDay(date);
      if (!list.length) return card(4, '✿', 'Habits', '<p class="hint">Nothing scheduled today. Rest counts too.</p>');
      const rows = list.map(h => {
        const st = day.habits[h.id];
        const n = Habits.note(h, date);
        return `<div class="habit ${st ? 'done' : ''}">` +
          `<div class="hb-main"><div class="hb-name">${U.esc(h.name)}</div><div class="hb-anchor">${U.esc(h.anchor)}</div>` +
          `<div class="hb-v"><b>Full:</b> ${U.esc(h.full)}<br><b>2-min:</b> ${U.esc(h.mini)}</div>` +
          (n.text ? `<div class="hb-note ${n.tone}">${U.esc(n.text)}</div>` : '') + `</div>` +
          `<div class="hb-btns"><button class="hbtn ${st === 'full' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="full" aria-pressed="${st === 'full'}">✓<small>full</small></button>` +
          `<button class="hbtn mini ${st === 'mini' ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-level="mini" aria-pressed="${st === 'mini'}">✓<small>2 min</small></button></div></div>`;
      }).join('');
      return card(4, '✿', 'Habit stack', rows + '<p class="hint">Either version counts. A missed day is just information.</p>');
    },

    function body(day) {
      const ticks = D.bodyChecks.map(c => tick('body.' + c.id, day.body[c.id], c.label)).join('');
      const rates = D.morningRatings.map(r => rating('rate.' + r.id, day.rate[r.id], r.label)).join('');
      return card(5, '☾', 'Energy & body', `<div class="ticks">${ticks}</div><div class="rates">${rates}</div>`);
    },

    function evening(day) {
      const rates = D.eveningRatings.map(r => rating('rate.' + r.id, day.rate[r.id], r.label)).join('');
      return card(6, '★', 'Evening review',
        `<label class="qa"><span class="q">What went well?</span>${field('eve.well', day.eve.well, 'a line or two', 2)}</label>` +
        `<label class="qa"><span class="q">What I’d do differently</span>${field('eve.diff', day.eve.diff, 'no judgement, just notes', 2)}</label>` +
        `<label class="qa"><span class="q">Who did I show up well for today?</span>${field('eve.showed', day.eve.showed, '', 1)}</label>` +
        `<div class="rates">${rates}</div>` +
        `<label class="qa good"><span class="q">One good thing</span>${field('eve.good', day.eve.good, '✿', 1)}</label>`, 'evening');
    }
  ];

  // ---------- page ----------
  let current = null, extCache = {};

  function html(date) {
    const day = getDay(date);
    const isToday = date === U.today();
    const head = `<header class="dayhead"><a class="arrow" href="#/today/${U.addDays(date, -1)}" aria-label="Previous day">‹</a>` +
      `<div class="dh-mid"><h1>${U.esc(U.fmtLong(date))}</h1>` +
      `<div class="dh-sub">${isToday ? '<span class="stamp-today">today</span>' : `<a href="#/today/${U.today()}">back to today</a>`}</div></div>` +
      `<a class="arrow" href="#/today/${U.addDays(date, 1)}" aria-label="Next day">›</a></header>`;
    return head + SECTIONS.map(fn => fn(day, date, extCache[date])).join('') + '<p class="foot">Be kind to yourself. Tomorrow is a fresh page.</p>';
  }

  const isEditing = () => /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');

  function render(app, date) {
    current = date;
    const y = window.scrollY;
    app.innerHTML = html(date);
    window.scrollTo(0, y);
    if (Calendar.hasProviders() && !extCache[date]) {
      Calendar.external(date).then(ev => { extCache[date] = ev; if (current === date && !isEditing()) render(app, date); });
    }
  }

  /** One-time event wiring (delegation, so re-rendering never loses handlers). */
  function bind(app) {
    const save = (mut) => Store.update(key(current), blankDay(), mut);

    app.addEventListener('input', e => {
      const t = e.target;
      if (current && t.matches('[data-path]')) save(d => U.setPath(d, t.dataset.path, t.value));
    });

    app.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || !current || b.tagName === 'FORM') return;
      const act = b.dataset.act;
      if (act === 'toggle') save(d => U.setPath(d, b.dataset.path, !U.getPath(d, b.dataset.path)));
      else if (act === 'rate') save(d => { const v = +b.dataset.val; U.setPath(d, b.dataset.path, U.getPath(d, b.dataset.path) === v ? null : v); });
      else if (act === 'habit') save(d => { const id = b.dataset.id; if (d.habits[id] === b.dataset.level) delete d.habits[id]; else d.habits[id] = b.dataset.level; });
      else if (act === 'sched-del') save(d => d.sched.splice(+b.dataset.i, 1));
      else return;
      render(app, current);
    });

    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-act="sched-add"]');
      if (!f) return;
      e.preventDefault();
      const t = f.t.value, x = f.x.value.trim();
      if (!t || !x) return;
      save(d => { d.sched.push({ t, x }); d.sched.sort((p, q) => p.t.localeCompare(q.t)); });
      render(app, current);
    });
  }

  window.TodayPage = { render, bind, isEditing, current: () => current };
})();
