/*
 * BRIEFINGS PAGE: "needs you" actions pulled out of every briefing, then each briefing in full.
 */
(function () {
  let filter = '';
  const fmt = at => new Date(at).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  function html() {
    const acts = Briefings.actions();
    const list = Briefings.recent().filter(b => !filter || b.source === filter);
    const needs = `<section class="card"><header class="card-h"><span class="stamp">!</span><h2>Needs you</h2><span class="no">${acts.length}</span></header>` +
      (acts.length ? acts.map(a => `<div class="task"><button class="box-btn" data-b="tick" data-id="${a.bid}" data-i="${a.i}" role="checkbox" aria-checked="false" aria-label="Done"><span class="box"></span></button>` +
        `<div class="tk-main"><div class="tk-t">${U.esc(a.t)}</div><div class="tk-m"><span class="cdot s" style="background:${Briefings.color(a.source)}"></span>${U.esc(a.source)}${a.due ? ' · due ' + U.esc(Matrix.fmtDue({ due: a.due }, U.today())) : ''}</div></div>` +
        `<button class="pill ghost sm" data-b="matrix" data-id="${a.bid}" data-i="${a.i}">+ Matrix</button></div>`).join('') : '<p class="hint">Nothing waiting on you from your briefings.</p>') + `</section>`;
    const chips = Briefings.sources().length > 1 ? `<div class="chips"><button class="chip ${filter ? '' : 'on'}" data-b="filter" data-v="">All</button>${Briefings.sources().map(s => `<button class="chip ${filter === s ? 'on' : ''}" data-b="filter" data-v="${U.esc(s)}"><i class="cdot s" style="background:${Briefings.color(s)}"></i>${U.esc(s)}</button>`).join('')}</div>` : '';
    const cards = list.map((b, n) => `<details class="card brief" ${n === 0 ? 'open' : ''}><summary><span class="cdot s" style="background:${Briefings.color(b.source)}"></span><span class="bt">${U.esc(b.title)}</span><span class="bw">${U.esc(fmt(b.at))}</span></summary>` +
      `<div class="bbody">${Briefings.md(b.summary)}${(b.items || []).filter(i => !i.action).length ? '<ul>' + b.items.filter(i => !i.action).map(i => `<li>${U.esc(i.t)}</li>`).join('') + '</ul>' : ''}</div></details>`).join('');
    return `<header class="dayhead"><div class="dh-mid"><h1>Briefings</h1><div class="dh-sub">What your scheduled Claude tasks found</div></div></header>` + needs + chips +
      (cards || '<p class="hint center">No briefings yet. Once your scheduled tasks send their results, they appear here (see the README).</p>');
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'briefings';

  function bind(app) {
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-b]');
      if (!b || !mine()) return;
      const a = b.dataset.b;
      if (a === 'filter') filter = b.dataset.v;
      else if (a === 'tick') Briefings.tick(b.dataset.id, b.dataset.i);
      else if (a === 'matrix') {
        const it = (Store.peek('brief:' + b.dataset.id).items || [])[+b.dataset.i];
        Matrix.add({ t: it.t, due: it.due, imp: true, cat: 'Formclad' === Store.peek('brief:' + b.dataset.id).source ? 'Formclad' : '' });
        Briefings.tick(b.dataset.id, b.dataset.i);
      } else return;
      render(app);
    });
  }
  Store.subscribe(i => { if (i.type === 'remote' && window.App && App.route === 'briefings') render(document.getElementById('app')); });
  window.BriefingsPage = { render, bind };
})();
