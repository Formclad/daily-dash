/*
 * FAMILY PAGE: who's in the family, a weekly chore chart, and daily routines (morning, after school, bedtime...).
 * Names and tasks live only in your database; this code ships with none.
 * Data:
 *   config:family     { members: [{ id, name }] }
 *   data:chores       { items: [{ id, t, who: [memberId], days: [0-6] }] }     days: 0=Sun..6=Sat
 *   chores:<Monday>   { 'choreId|memberId|YYYY-MM-DD': 1 }                     ticks for that week
 *   data:routines     { items: [{ id, name, when, who: [memberId] (empty = everyone), steps: [{ id, t }] }] }
 *   routines:<date>   { 'routineId|memberId|stepId': 1 }                       ticks for that day
 */
(function () {
  const DAYS = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];   // Monday first
  const get = (k, f) => Store.get(k, f);
  const members = () => get('config:family', { members: [] }).members;
  const chores = () => get('data:chores', { items: [] }).items;
  const routines = () => get('data:routines', { items: [] }).items;
  const saveMembers = m => Store.set('config:family', { members: m });
  const saveChores = i => Store.set('data:chores', { items: i });
  const saveRoutines = i => Store.set('data:routines', { items: i });
  const tickKey = d => Store.peek('chores:' + U.weekStart(d)) || {};

  const STARTERS = [
    { name: 'Morning', when: 'Before school', steps: ['Get dressed', 'Breakfast', 'Teeth', 'Hair', 'Pack bag', 'Shoes on'] },
    { name: 'After school', when: 'Afternoon', steps: ['Unpack bag', 'Snack', 'Reading or homework', 'Tidy up'] },
    { name: 'Bedtime', when: 'Evening', steps: ['Bath or shower', 'Pyjamas', 'Teeth', 'Story', 'Lights out'] }
  ];

  /** Used by Home: chore progress today for each member. */
  window.Family = {
    todaySummary(date) {
      const ticks = tickKey(date), dow = U.dow(date);
      return members().map(m => {
        const mine = chores().filter(c => c.who.includes(m.id) && c.days.includes(dow));
        return { name: m.name, total: mine.length, done: mine.filter(c => ticks[`${c.id}|${m.id}|${date}`]).length };
      }).filter(x => x.total);
    }
  };

  let tab = 'chores', sel = null, week = U.weekStart(U.today()), day = U.today();

  const chips = () => {
    const ms = members();
    if (!ms.length) return '';
    if (!ms.find(m => m.id === sel)) sel = ms[0].id;
    return `<div class="chips">${ms.map(m => `<button class="chip ${m.id === sel ? 'on' : ''}" data-f="sel" data-id="${m.id}" style="${m.id === sel && m.color ? 'border-color:' + m.color : ''}"><i class="cdot s" style="background:${m.color || '#a39e94'}"></i>${U.esc(m.name)}</button>`).join('')}</div>`;
  };
  const whoBoxes = () => members().map(m => `<label class="chip chk"><input type="checkbox" name="who" value="${m.id}"><span>${U.esc(m.name)}</span></label>`).join('');

  function membersCard() {
    const ms = members();
    return `<section class="card"><header class="card-h"><span class="stamp">☺</span><h2>Our family</h2><a class="more" href="#/meals">Meals &amp; shopping ›</a></header>` +
      (ms.length ? `<div class="chips">${ms.map(m => `<span class="chip"><i class="cdot s" style="background:${m.color || '#a39e94'}"></i>${U.esc(m.name)}<button class="x sm" data-f="m-del" data-id="${m.id}" aria-label="Remove ${U.esc(m.name)}">×</button></span>`).join('')}</div>` : '<p class="hint">Add everyone who takes part: kids, you, partner.</p>') +
      `<form class="add" data-f="m-add"><input type="text" name="name" placeholder="Add a name" required autocomplete="off" aria-label="Name"><button class="pill" type="submit">Add</button></form></section>`;
  }

  // ----- chores -----
  function choresView() {
    const ms = members();
    if (!ms.length) return '';
    const ticks = Store.peek('chores:' + week) || {};
    const dates = DAYS.map(([dow, l]) => ({ dow, l, d: U.addDays(week, (dow + 6) % 7) }));
    const mine = chores().filter(c => c.who.includes(sel));
    let total = 0, got = 0;
    const rows = mine.map(c => `<div class="chore"><div class="c-t">${U.esc(c.t)}</div><div class="c-days">` + dates.map(x => {
      if (!c.days.includes(x.dow)) return `<span class="cd off"><small>${x.l}</small>–</span>`;
      const on = !!ticks[`${c.id}|${sel}|${x.d}`]; total++; if (on) got++;
      return `<button class="cd ${on ? 'on' : ''} ${x.d === U.today() ? 'now' : ''}" data-f="chore" data-key="${c.id}|${sel}|${x.d}" aria-pressed="${on}" aria-label="${U.esc(c.t)} ${x.d}"><small>${x.l}</small>${on ? '★' : ''}</button>`;
    }).join('') + `</div></div>`).join('');
    const label = `${U.parse(week).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} to ${U.parse(U.addDays(week, 6)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    const manage = chores().map(c => `<div class="task"><div class="tk-main"><div class="tk-t">${U.esc(c.t)}</div><div class="tk-m">${c.who.map(id => (ms.find(m => m.id === id) || {}).name).filter(Boolean).map(U.esc).join(', ') || 'nobody yet'} · ${c.days.length === 7 ? 'every day' : DAYS.filter(([d]) => c.days.includes(d)).map(([, l], i) => l).join(' ')}</div></div><button class="x" data-f="c-del" data-id="${c.id}" aria-label="Delete chore">×</button></div>`).join('');
    return `<section class="card"><header class="card-h"><span class="stamp">★</span><h2>Chore chart</h2><span class="no">${got} of ${total} ★</span></header>` +
      `<div class="wknav"><button class="arrow sm" data-f="wk" data-n="-7" aria-label="Previous week">‹</button><span>${label}</span><button class="arrow sm" data-f="wk" data-n="7" aria-label="Next week">›</button></div>` +
      (rows || '<p class="hint">No chores for this person yet. Add one below.</p>') + `</section>` +
      `<section class="card"><header class="card-h"><span class="stamp">＋</span><h2>Add a chore</h2></header>` +
      `<form class="stack" data-f="c-add"><input class="tin" type="text" name="t" placeholder="e.g. Feed the pet" required autocomplete="off" aria-label="Chore"><div class="chips">${whoBoxes()}</div>` +
      `<div class="chips">${DAYS.map(([d, l]) => `<label class="chip chk dayc"><input type="checkbox" name="day" value="${d}" checked><span>${l}</span></label>`).join('')}</div><button class="pill" type="submit">Add chore</button></form>` +
      (manage ? `<h3 class="aisle">All chores</h3>${manage}` : '') + `</section>`;
  }

  // ----- routines -----
  function routinesView() {
    const ms = members();
    const ticks = Store.peek('routines:' + day) || {};
    const list = routines().filter(r => !r.who.length || r.who.includes(sel));
    const nav = `<div class="wknav"><button class="arrow sm" data-f="dy" data-n="-1" aria-label="Previous day">‹</button><span>${day === U.today() ? 'Today' : U.fmtLong(day)}</span><button class="arrow sm" data-f="dy" data-n="1" aria-label="Next day">›</button></div>`;
    const cards = list.map(r => {
      const done = r.steps.filter(s => ticks[`${r.id}|${sel || '_'}|${s.id}`]).length;
      return `<section class="card"><header class="card-h"><span class="stamp">◔</span><h2>${U.esc(r.name)}</h2><span class="no">${done}/${r.steps.length}</span></header>` +
        (r.when ? `<p class="hint">${U.esc(r.when)}${r.who.length ? ' · ' + r.who.map(id => (ms.find(m => m.id === id) || {}).name).filter(Boolean).map(U.esc).join(', ') : ' · everyone'}</p>` : '') +
        r.steps.map(s => { const on = !!ticks[`${r.id}|${sel || '_'}|${s.id}`]; return `<div class="task ${on ? 'done' : ''}"><button class="box-btn ${on ? 'on' : ''}" data-f="step" data-key="${r.id}|${sel || '_'}|${s.id}" role="checkbox" aria-checked="${on}" aria-label="${U.esc(s.t)}"><span class="box">${on ? '✓' : ''}</span></button><div class="tk-main"><div class="tk-t">${U.esc(s.t)}</div></div><button class="x" data-f="s-del" data-id="${r.id}" data-sid="${s.id}" aria-label="Remove step">×</button></div>`; }).join('') +
        `<form class="add" data-f="s-add" data-id="${r.id}"><input type="text" name="t" placeholder="Add a step" required autocomplete="off" aria-label="Step"><button class="pill" type="submit">Add</button></form>` +
        `<div class="btn-row"><button class="pill ghost" data-f="r-del" data-id="${r.id}">Delete routine</button></div></section>`;
    }).join('');
    const addRoutine = `<section class="card"><header class="card-h"><span class="stamp">＋</span><h2>Add a routine</h2></header><form class="stack" data-f="r-add">` +
      `<input class="tin" type="text" name="name" placeholder="e.g. Morning, Bedtime, Saturday reset" required autocomplete="off" aria-label="Routine name"><input class="tin" type="text" name="when" placeholder="When (optional), e.g. 7:00am" autocomplete="off" aria-label="When">` +
      `<p class="hint">Who is it for? (none ticked = everyone)</p><div class="chips">${whoBoxes()}</div><button class="pill" type="submit">Add routine</button></form>` +
      (routines().length ? '' : `<div class="btn-row"><button class="pill ghost" data-f="starters">Add starter routines</button></div><p class="hint">Starters: morning, after school and bedtime, which you can edit.</p>`) + `</section>`;
    return nav + (cards || '<p class="hint">No routines for this person yet.</p>') + addRoutine;
  }

  function html() {
    const ms = members();
    const seg = `<div class="seg" role="tablist">${[['chores', 'Chore chart'], ['routines', 'Routines']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-f="tab" data-v="${k}" role="tab" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;
    return `<header class="dayhead"><div class="dh-mid"><h1>Family</h1><div class="dh-sub">Chores and routines for everyone</div></div></header>` +
      membersCard() + (ms.length ? seg + chips() + (tab === 'chores' ? choresView() : routinesView()) : '');
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'family';
  const checked = (f, name) => [...f.querySelectorAll(`input[name=${name}]:checked`)].map(i => i.value);

  function bind(app) {
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-f]');
      if (!f || !mine()) return;
      e.preventDefault();
      const a = f.dataset.f;
      if (a === 'm-add') { const m = members(); const id = U.id(); m.push({ id, name: f.name.value.trim(), color: U.nextColor(m.map(x => x.color)) }); saveMembers(m); sel = sel || id; }
      else if (a === 'c-add') { const l = chores(); l.push({ id: U.id(), t: f.t.value.trim(), who: checked(f, 'who').length ? checked(f, 'who') : [sel], days: checked(f, 'day').map(Number) }); saveChores(l); }
      else if (a === 'r-add') { const l = routines(); l.push({ id: U.id(), name: f.name.value.trim(), when: f.when.value.trim(), who: checked(f, 'who'), steps: [] }); saveRoutines(l); }
      else if (a === 's-add') { const l = routines(); l.find(r => r.id === f.dataset.id).steps.push({ id: U.id(), t: f.t.value.trim() }); saveRoutines(l); }
      render(app);
    });

    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-f]');
      if (!b || !mine()) return;
      const a = b.dataset.f, id = b.dataset.id;
      if (a === 'tab') tab = b.dataset.v;
      else if (a === 'sel') sel = id;
      else if (a === 'wk') week = U.addDays(week, +b.dataset.n);
      else if (a === 'dy') day = U.addDays(day, +b.dataset.n);
      else if (a === 'chore') { const k = 'chores:' + week; Store.update(k, {}, t => { t[b.dataset.key] ? delete t[b.dataset.key] : (t[b.dataset.key] = 1); }); }
      else if (a === 'step') { const k = 'routines:' + day; Store.update(k, {}, t => { t[b.dataset.key] ? delete t[b.dataset.key] : (t[b.dataset.key] = 1); }); }
      else if (a === 'm-del') { if (!confirm('Remove this person? Their ticks stay saved but the chart will hide them.')) return; saveMembers(members().filter(m => m.id !== id)); saveChores(chores().map(c => ({ ...c, who: c.who.filter(w => w !== id) }))); if (sel === id) sel = null; }
      else if (a === 'c-del') saveChores(chores().filter(c => c.id !== id));
      else if (a === 'r-del') { if (!confirm('Delete this routine?')) return; saveRoutines(routines().filter(r => r.id !== id)); }
      else if (a === 's-del') { const l = routines(); const r = l.find(x => x.id === id); r.steps = r.steps.filter(s => s.id !== b.dataset.sid); saveRoutines(l); }
      else if (a === 'starters') saveRoutines(STARTERS.map(s => ({ id: U.id(), name: s.name, when: s.when, who: [], steps: s.steps.map(t => ({ id: U.id(), t })) })));
      else return;
      render(app);
    });
  }
  window.FamilyPage = { render, bind };
})();
