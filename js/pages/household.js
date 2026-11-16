/* HOUSEHOLD PAGE: set up repeating jobs once; they then appear on the day they are due. */
(function () {
  const html = () => {
    const items = Rhythms.all();
    const groups = Rhythms.AREAS.map(a => ({ a, rows: items.filter(r => r.area === a) })).filter(g => g.rows.length);
    return `<header class="dayhead"><div class="dh-mid"><h1>Household</h1><div class="dh-sub">Jobs that repeat, remembered for you</div></div></header>` +
      `<form class="card addtask" data-h="add"><input name="t" id="hh-t" type="text" placeholder="A job that repeats, e.g. Bins out" required autocomplete="off" aria-label="Job">` +
      `<div class="chips">${Rhythms.SUGGESTIONS.map(s => `<button type="button" class="chip" data-h-fill="${U.esc(s)}">${U.esc(s)}</button>`).join('')}</div>` +
      `<div class="at-row"><select name="area" aria-label="Area">${Rhythms.AREAS.map(a => `<option>${a}</option>`).join('')}</select>` +
      `<select name="every" aria-label="How often">${Rhythms.EVERY.map(([v, l]) => `<option value="${v}" ${v === 'weekly' ? 'selected' : ''}>${l}</option>`).join('')}</select>` +
      `<input name="date" type="date" value="${U.today()}" aria-label="First day"><button class="pill" type="submit">Add</button></div>` +
      `<p class="hint">Pick the first day it falls on (the weekday, date or month is taken from it).</p></form>` +
      (groups.length ? groups.map(g => `<section class="card"><header class="card-h"><h2>${g.a}</h2></header>${g.rows.map(r => `<div class="task"><div class="tk-main"><div class="tk-t">${U.esc(r.t)}</div><div class="tk-m">${U.esc(Rhythms.describe(r))}</div></div><button class="x" data-h-del="${r.id}" aria-label="Delete">×</button></div>`).join('')}</section>`).join('') : '<p class="hint center">Nothing set up yet. Tap a suggestion above to start.</p>');
  };
  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'household';
  function bind(app) {
    app.addEventListener('click', e => {
      if (!mine()) return;
      const f = e.target.closest('[data-h-fill]'), d = e.target.closest('[data-h-del]');
      if (f) { document.getElementById('hh-t').value = f.dataset.hFill; return; }
      if (d) { Rhythms.remove(d.dataset.hDel); render(app); }
    });
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-h="add"]');
      if (!f || !mine()) return;
      e.preventDefault();
      Rhythms.add({ t: f.t.value.trim(), area: f.area.value, every: f.every.value, date: f.date.value });
      render(app);
    });
  }
  window.HouseholdPage = { render, bind };
})();
