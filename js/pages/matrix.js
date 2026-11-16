/*
 * MATRIX PAGE: add tasks, see them sorted into the four Eisenhower boxes automatically.
 * You only say what it is, when it's due, and whether it matters a lot (star).
 */
(function () {
  const D = DD_DEFAULTS;
  const taskRow = (t, today) => `<div class="task ${t.done ? 'done' : ''}">` +
    `<button class="box-btn ${t.done ? 'on' : ''}" data-m="done" data-id="${t.id}" role="checkbox" aria-checked="${!!t.done}" aria-label="Done"><span class="box">${t.done ? '✓' : ''}</span></button>` +
    `<div class="tk-main"><div class="tk-t">${U.esc(t.t)}</div><div class="tk-m ${t.due && Matrix.isUrgent(t, today) ? 'hot' : ''}">${U.esc(Matrix.fmtDue(t, today))}${t.cat ? ' · ' + U.esc(t.cat) : ''}${t.src === 'schedule' ? ' · from your schedule' : ''}</div></div>` +
    `<input class="tk-date" type="date" value="${U.esc(t.due)}" data-m="due" data-id="${t.id}" aria-label="Due date">` +
    `<button class="star ${t.imp ? 'on' : ''}" data-m="imp" data-id="${t.id}" aria-pressed="${!!t.imp}" aria-label="Important">★</button>` +
    `<button class="x" data-m="del" data-id="${t.id}" aria-label="Delete">×</button></div>`;

  function scheduleCard() {
    const pend = Schedule.isAuto() ? [] : Schedule.pending();
    return `<section class="card"><header class="card-h"><span class="stamp">◷</span><h2>From your schedule</h2></header>` +
      `<label class="chip chk"><input type="checkbox" data-m-auto ${Schedule.isAuto() ? 'checked' : ''}><span>Add prep tasks from my schedule automatically</span></label>` +
      `<p class="hint">I read your next two weeks and add things like “write questions” before appointments or “arrange childcare” before closures. Delete one and it won’t come back.</p>` +
      (pend.length ? pend.map(c => `<div class="task"><div class="tk-main"><div class="tk-t">${U.esc(c.t)}</div><div class="tk-m">due ${U.esc(c.due)}</div></div><button class="pill sm" data-m="sadd" data-key="${U.esc(c.key)}">Add</button><button class="x" data-m="sno" data-key="${U.esc(c.key)}" aria-label="Not needed">×</button></div>`).join('') : '') + `</section>`;
  }

  function html() {
    Schedule.run();
    const today = U.today();
    const open = Matrix.ranked(today);
    const quads = Matrix.QUADS.map(q => {
      const rows = open.filter(t => Matrix.quad(t, today) === q.n);
      return `<section class="card quad q${q.n}"><header class="card-h"><h2>${q.name}</h2><span class="no">${U.esc(q.sub)}</span></header>` +
        (rows.length ? rows.map(t => taskRow(t, today)).join('') : '<p class="hint">Nothing here.</p>') + `</section>`;
    }).join('');
    const done = Matrix.all().filter(t => t.done).length;
    return `<header class="dayhead"><div class="dh-mid"><h1>Matrix</h1><div class="dh-sub">Priorities decided for you: urgent means due within ${D.urgentDays} days, important means starred</div></div></header>` +
      `<form class="card addtask" data-m="add"><input name="t" type="text" placeholder="What needs doing?" required autocomplete="off" aria-label="Task">` +
      `<div class="at-row"><input name="due" type="date" aria-label="Due date"><select name="cat" aria-label="Category"><option value="">Category</option>${D.categories.map(c => `<option>${U.esc(c)}</option>`).join('')}</select>` +
      `<label class="star-l"><input type="checkbox" name="imp"><span>★ Matters a lot</span></label><button class="pill" type="submit">Add</button></div></form>` +
      scheduleCard() +
      `<div class="quads">${quads}</div>` +
      `<div class="btn-row">${done ? `<button class="pill ghost" data-m="clear">Clear ${done} completed</button>` : ''}</div>`;
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'matrix';

  function bind(app) {
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-m="add"]');
      if (!f || !mine()) return;
      e.preventDefault();
      Matrix.add({ t: f.t.value.trim(), due: f.due.value, cat: f.cat.value, imp: f.imp.checked });
      render(app);
    });
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-m]');
      if (!b || !mine()) return;
      const id = b.dataset.id, m = b.dataset.m;
      const t = Matrix.all().find(x => x.id === id);
      if (m === 'done') Matrix.setDone(id, !t.done);
      else if (m === 'imp') Matrix.patch(id, { imp: !t.imp });
      else if (m === 'del') Matrix.remove(id);
      else if (m === 'sadd') Schedule.addOne(b.dataset.key);
      else if (m === 'sno') Schedule.dismiss(b.dataset.key);
      else if (m === 'clear') Matrix.all().filter(x => x.done).forEach(x => Matrix.remove(x.id));
      else return;
      render(app);
    });
    app.addEventListener('change', e => {
      const a = e.target.closest('input[data-m-auto]');
      if (a && mine()) { Schedule.setAuto(a.checked); render(app); return; }
      const i = e.target.closest('input[data-m="due"]');
      if (!i || !mine()) return;
      Matrix.patch(i.dataset.id, { due: i.value });
      render(app);
    });
  }
  window.MatrixPage = { render, bind };
})();
