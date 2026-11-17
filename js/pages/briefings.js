/*
 * BRIEFINGS: two columns. Left: what needs you (the same items as in your Matrix, ticked in both places).
 * Right: today's briefings grouped by time of day, then earlier ones tucked away.
 */
(function () {
  const when = at => new Date(at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  const dayLabel = at => new Date(at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  const card = (b, open) => `<details class="card brief" ${open ? 'open' : ''}><summary><span class="cdot s" style="background:${Briefings.color(b.source)}"></span><span class="bt">${U.esc(b.title)}</span><span class="bw">${U.esc(when(b.at))}</span></summary>` +
    `<div class="bbody">${Briefings.md(b.summary)}${(b.items || []).filter(i => !i.action).length ? '<ul>' + b.items.filter(i => !i.action).map(i => `<li>${U.esc(i.t)}</li>`).join('') + '</ul>' : ''}<div class="btn-row"><button class="pill ghost sm" data-b="hide" data-id="${b.id}">Hide this briefing</button></div></div></details>`;

  function html() {
    Briefings.importToMatrix();
    const acts = Briefings.actions(), all = Briefings.recent(), today = U.ymd(new Date());
    const todays = all.filter(b => U.ymd(new Date(b.at)) === today), earlier = all.filter(b => U.ymd(new Date(b.at)) !== today).slice(0, 12);
    const part = (label, test) => { const l = todays.filter(b => test(new Date(b.at).getHours())); return l.length ? `<h3 class="aisle">${label}</h3>${l.map(b => card(b, true)).join('')}` : ''; };

    const needs = `<section class="card"><header class="card-h"><span class="stamp">!</span><h2>Needs you</h2><span class="no">${acts.length}</span></header>` +
      (acts.length ? acts.map(a => `<div class="task"><button class="box-btn" data-b="tick" data-id="${a.bid}" data-i="${a.i}" role="checkbox" aria-checked="false" aria-label="Done"><span class="box"></span></button>` +
        `<div class="tk-main"><div class="tk-t">${U.esc(a.t)}</div><div class="tk-m"><span class="cdot s" style="background:${Briefings.color(a.source)}"></span>${U.esc(a.source)} · ${U.esc(dayLabel(a.at))}</div></div></div>`).join('') + `<p class="hint">These are also in your <a href="#/matrix">Matrix</a>, with a due date, so they can become today’s focus. Ticking here or there does both.</p>` : '<p class="hint">Nothing waiting on you from your briefings.</p>') + `</section>`;

    const right = (todays.length ? part('Morning', h => h < 12) + part('Afternoon', h => h >= 12 && h < 17) + part('Evening', h => h >= 17) : '<p class="hint">No briefings yet today.</p>') +
      (earlier.length ? `<details class="card"><summary class="how">Earlier (${earlier.length})</summary>${earlier.map(b => `<div class="earlier"><span class="bw">${U.esc(dayLabel(b.at))}</span>${card(b, false)}</div>`).join('')}</details>` : '');

    return `<header class="dayhead"><div class="dh-mid"><h1>Briefings</h1><div class="dh-sub">What your scheduled Claude tasks found</div></div></header>` +
      `<div class="cols"><div class="col">${needs}</div><div class="col">${right}</div></div>`;
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'briefings';
  function bind(app) {
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-b]');
      if (!b || !mine()) return;
      if (b.dataset.b === 'hide') Briefings.hide(b.dataset.id);
      else if (b.dataset.b === 'tick') Briefings.tick(b.dataset.id, b.dataset.i);
      else return;
      render(app);
    });
  }
  Store.subscribe(i => { if (i.type === 'remote' && window.App && App.route === 'briefings') render(document.getElementById('app')); });
  window.BriefingsPage = { render, bind };
})();
