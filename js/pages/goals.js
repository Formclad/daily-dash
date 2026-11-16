/*
 * GOALS PAGE: bigger goals with a target date, broken into milestones you tick off.
 * Data: 'data:goals' = { items: [{ id, t, area, target, done, ms: [{ id, t, due, done }] }] }
 */
(function () {
  const D = DD_DEFAULTS;
  const KEY = 'data:goals';
  const all = () => Store.get(KEY, { items: [] }).items;
  const save = items => Store.set(KEY, { items });
  const change = (id, fn) => { const l = all(); const g = l.find(x => x.id === id); if (g) { fn(g); save(l); } };

  const Goals = {
    all,
    /** Next unfinished milestones across all goals, soonest first (used by Home). */
    upcoming(n) {
      const out = [];
      all().filter(g => !g.done).forEach(g => (g.ms || []).filter(m => !m.done).forEach(m => out.push({ goal: g.t, ...m })));
      return out.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, n);
    }
  };
  window.Goals = Goals;

  const fmt = d => d ? U.parse(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'no date';

  function goalCard(g) {
    const ms = g.ms || [], n = ms.filter(m => m.done).length;
    const pct = ms.length ? Math.round(100 * n / ms.length) : (g.done ? 100 : 0);
    return `<section class="card goal ${g.done ? 'achieved' : ''}"><header class="card-h"><span class="stamp">${g.done ? '★' : '◎'}</span><h2>${U.esc(g.t)}</h2><button class="x" data-g="del" data-id="${g.id}" aria-label="Delete goal">×</button></header>` +
      `<p class="hint">${U.esc(g.area || 'Goal')} · target ${fmt(g.target)}</p>` +
      `<div class="prog" aria-hidden="true"><i style="width:${pct}%"></i></div><p class="hint">${ms.length ? `${n} of ${ms.length} milestones` : 'Add a first milestone below'}</p>` +
      ms.map(m => `<div class="task ${m.done ? 'done' : ''}"><button class="box-btn ${m.done ? 'on' : ''}" data-g="ms-done" data-id="${g.id}" data-mid="${m.id}" role="checkbox" aria-checked="${!!m.done}" aria-label="Done"><span class="box">${m.done ? '✓' : ''}</span></button>` +
        `<div class="tk-main"><div class="tk-t">${U.esc(m.t)}</div><div class="tk-m">${fmt(m.due)}</div></div><button class="x" data-g="ms-del" data-id="${g.id}" data-mid="${m.id}" aria-label="Remove milestone">×</button></div>`).join('') +
      `<form class="add" data-g="ms-add" data-id="${g.id}"><input type="text" name="t" placeholder="Add a milestone" required autocomplete="off" aria-label="Milestone"><input type="date" name="due" aria-label="Milestone date"><button class="pill" type="submit">Add</button></form>` +
      `<div class="btn-row"><button class="pill ghost" data-g="achieved" data-id="${g.id}">${g.done ? 'Reopen goal' : 'Mark achieved ★'}</button></div></section>`;
  }

  function html() {
    const items = all().sort((a, b) => (a.done - b.done) || (a.target || '9999').localeCompare(b.target || '9999'));
    return `<header class="dayhead"><div class="dh-mid"><h1>Goals</h1><div class="dh-sub">Big things, one small milestone at a time</div></div></header>` +
      `<form class="card addtask" data-g="add"><input name="t" type="text" placeholder="A goal I'm working towards" required autocomplete="off" aria-label="Goal">` +
      `<div class="at-row"><select name="area" aria-label="Area"><option value="">Area</option>${D.categories.map(c => `<option>${U.esc(c)}</option>`).join('')}</select><input name="target" type="date" aria-label="Target date"><button class="pill" type="submit">Add goal</button></div></form>` +
      (items.length ? `<div class="cols"><div class="col">${items.filter((_, i) => i % 2 === 0).map(goalCard).join('')}</div><div class="col">${items.filter((_, i) => i % 2 === 1).map(goalCard).join('')}</div></div>` : '<p class="hint center">No goals yet. Start with one that matters.</p>');
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'goals';

  function bind(app) {
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-g]');
      if (!f || !mine()) return;
      e.preventDefault();
      if (f.dataset.g === 'add') { const l = all(); l.push({ id: U.id(), t: f.t.value.trim(), area: f.area.value, target: f.target.value, done: false, ms: [] }); save(l); }
      else if (f.dataset.g === 'ms-add') change(f.dataset.id, g => { (g.ms = g.ms || []).push({ id: U.id(), t: f.t.value.trim(), due: f.due.value, done: false }); g.ms.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')); });
      render(app);
    });
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-g]');
      if (!b || !mine()) return;
      const id = b.dataset.id, mid = b.dataset.mid;
      if (b.dataset.g === 'del') { if (!confirm('Delete this goal and its milestones?')) return; save(all().filter(g => g.id !== id)); }
      else if (b.dataset.g === 'ms-done') change(id, g => { const m = g.ms.find(x => x.id === mid); m.done = !m.done; });
      else if (b.dataset.g === 'ms-del') change(id, g => { g.ms = g.ms.filter(x => x.id !== mid); });
      else if (b.dataset.g === 'achieved') change(id, g => { g.done = !g.done; });
      else return;
      render(app);
    });
  }
  window.GoalsPage = { render, bind };
})();
