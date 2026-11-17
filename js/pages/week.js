/*
 * WEEK: the seven days at a glance. Tap a day to open it (add events, see its detail).
 * Everything shown is read from other parts of the dashboard; nothing to maintain here.
 */
(function () {
  let week = null;

  function dayCard(d, today) {
    const evs = Brief.events(d), due = Matrix.open().filter(t => t.due === d), jobs = Rhythms.dueOn(d).length;
    const dinner = Meals.dinner(d), moves = Strava.connected ? Strava.forDate(d) : [];
    const sess = U.parse(d).toLocaleDateString('en-AU', { weekday: 'long' }), dn = U.parse(d).getDate();
    const show = evs.slice(0, 6);
    return `<a class="wk ${d === today ? 'is-today' : ''} ${d < today ? 'past' : ''}" href="#/plan/${d}">` +
      `<div class="wk-h"><b>${sess}</b><span>${dn}</span></div>` +
      (show.map(e => `<div class="wk-e" ${Calendar.colorFor(e.source) ? `style="--c:${Calendar.colorFor(e.source)}"` : ''}><i>${U.esc(e.time || '')}</i> ${U.esc(e.text)}</div>`).join('') || '<div class="wk-none">Nothing booked</div>') +
      (evs.length > 6 ? `<div class="wk-more">+${evs.length - 6} more</div>` : '') +
      (due.length ? `<div class="wk-t">${due.length} task${due.length === 1 ? '' : 's'} due: ${U.esc(due.slice(0, 2).map(t => t.t).join(', '))}${due.length > 2 ? '…' : ''}</div>` : '') +
      `<div class="wk-f">${jobs ? jobs + ' household job' + (jobs === 1 ? '' : 's') : ''}${dinner ? (jobs ? ' · ' : '') + 'Dinner: ' + U.esc(dinner) : ''}${moves.length ? ((jobs || dinner) ? ' · ' : '') + U.esc(moves[0].name) : ''}</div></a>`;
  }

  function html(arg) {
    week = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? U.weekStart(arg) : (week || U.weekStart(U.today()));
    const today = U.today(), days = Array.from({ length: 7 }, (_, i) => U.addDays(week, i));
    const label = `${U.parse(week).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} to ${U.parse(U.addDays(week, 6)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    return `<header class="dayhead"><a class="arrow" href="#/week/${U.addDays(week, -7)}" aria-label="Previous week">‹</a><div class="dh-mid"><h1>Week</h1><div class="dh-sub">${label}${week === U.weekStart(today) ? ' · this week' : ` · <a href="#/week/${U.weekStart(today)}">back to this week</a>`}</div></div><a class="arrow" href="#/week/${U.addDays(week, 7)}" aria-label="Next week">›</a></header>` +
      `<div class="wkgrid">${days.map(d => dayCard(d, today)).join('')}</div>`;
  }
  const render = (app, arg) => { app.innerHTML = html(arg); };
  Calendar.onChange(() => { if (window.App && App.route === 'week') render(document.getElementById('app')); });
  window.WeekPage = { render, bind() {} };
})();
