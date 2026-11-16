/*
 * HEALTH PAGE: Strava activity (Garmin / Runna via Strava) plus a 14-day wellness trend
 * drawn from your own daily 1-5 ratings (energy, mood, sleep).
 */
(function () {
  const D = DD_DEFAULTS;
  const sportName = s => s.replace(/([a-z])([A-Z])/g, '$1 $2');
  const mins = s => Strava.fmtTime(s);

  function connectCard() {
    if (!Sync.signedIn()) return `<p class="hint">Sign in under Settings first, then come back to connect Strava.</p>`;
    if (Strava.connected) {
      return `<p class="hint">Connected${Strava.athlete ? ' as <b>' + U.esc(Strava.athlete) + '</b>' : ''}. ${Strava.fetchedAt ? 'Updated ' + new Date(Strava.fetchedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) + '.' : ''}</p>` +
        `<div class="btn-row"><button class="pill ghost" data-h="refresh">Refresh</button><button class="pill ghost" data-h="disconnect">Disconnect</button></div>`;
    }
    if (!Strava.canConnect()) return `<p class="hint">${Strava.error ? '<span class="err">' + U.esc(Strava.error) + '</span>' : (Strava.configured ? 'Checking…' : 'The Strava function needs its keys added in Supabase (see the README).')}</p><div class="btn-row"><button class="pill ghost" data-h="refresh">Check again</button></div>`;
    return `<p class="hint">Link Strava to see your runs and workouts here. If your Garmin watch and Runna already sync to Strava, they will appear too.</p><div class="btn-row"><a class="pill" href="${U.esc(Strava.connectUrl())}">Connect Strava</a></div>`;
  }

  function weekCard() {
    const ws = U.weekStart(U.today());
    const acts = Strava.inWeek(ws), runs = acts.filter(Strava.isRun);
    const km = runs.reduce((n, a) => n + a.km, 0), secs = acts.reduce((n, a) => n + a.secs, 0);
    const target = (Habits.list().find(h => h.id === 'runs') || {}).perWeek;
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    // last 8 weeks of running distance
    const weeks = Array.from({ length: 8 }, (_, i) => U.addDays(ws, -7 * (7 - i)));
    const kms = weeks.map(w => Strava.inWeek(w).filter(Strava.isRun).reduce((n, a) => n + a.km, 0));
    const max = Math.max(10, ...kms);
    const bars = weeks.map((w, i) => `<div class="bar" title="${kms[i].toFixed(1)} km"><i style="height:${Math.round(100 * kms[i] / max)}%"></i><span>${U.parse(w).getDate()}</span></div>`).join('');
    return `<div class="stats">${stat(acts.length, 'sessions')}${stat(runs.length + (target ? ' / ' + target : ''), 'runs')}${stat(km.toFixed(1), 'run km')}${stat(mins(secs), 'moving')}</div>` +
      `<p class="hint">Running distance, last 8 weeks (week starting)</p><div class="bars">${bars}</div>`;
  }

  function recentCard() {
    const list = Strava.activities().slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 12);
    if (!list.length) return '<p class="hint">No activities yet.</p>';
    return list.map(a => `<div class="act"><div class="a-d">${U.parse(a.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div>` +
      `<div class="a-m"><div class="a-n">${U.esc(a.name)}</div><div class="hint">${U.esc(sportName(a.sport))}${a.km ? ' · ' + a.km + ' km' : ''} · ${mins(a.secs)}${Strava.isRun(a) && a.km ? ' · ' + Strava.pace(a) : ''}${a.hr ? ' · ' + a.hr + ' bpm' : ''}</div></div></div>`).join('');
  }

  /** 14 small bars per metric from your own daily ratings. */
  function wellnessCard() {
    const days = Array.from({ length: 14 }, (_, i) => U.addDays(U.today(), i - 13));
    const metrics = [['energy', 'Energy'], ['mood', 'Mood'], ['sleep', 'Sleep']];
    const rows = metrics.map(([k, label]) => {
      const vals = days.map(d => ((Store.peek('day:' + d) || {}).rate || {})[k] || 0);
      const have = vals.filter(Boolean);
      const avg = have.length ? (have.reduce((a, b) => a + b, 0) / have.length).toFixed(1) : '–';
      return `<div class="wrow"><span class="wl">${label}<small>avg ${avg}</small></span><div class="wbars">${vals.map(v => `<i class="${v ? '' : 'none'}" style="height:${v ? v * 20 : 8}%"></i>`).join('')}</div></div>`;
    }).join('');
    return rows + '<p class="hint">Your own 1-5 ratings from the Journal, last 14 days. Gaps are fine.</p>';
  }

  const card = (icon, t, inner) => `<section class="card"><header class="card-h"><span class="stamp">${icon}</span><h2>${t}</h2></header>${inner}</section>`;

  function html() {
    return `<header class="dayhead"><div class="dh-mid"><h1>Health</h1><div class="dh-sub">Movement and how you’re feeling</div></div></header>` +
      `<div class="cols"><div class="col">${card('♡', 'This week', Strava.connected ? weekCard() : '<p class="hint">Connect Strava to see this week.</p>')}${card('☾', 'Wellness trend', wellnessCard())}</div>` +
      `<div class="col">${card('⇄', 'Strava', connectCard())}${Strava.connected ? card('◷', 'Recent activity', recentCard()) : ''}</div></div>`;
  }

  const render = app => { app.innerHTML = html(); Strava.refresh(); };
  const mine = () => window.App && App.route === 'health';

  function bind(app) {
    app.addEventListener('click', async e => {
      const b = e.target.closest('button[data-h]');
      if (!b || !mine()) return;
      if (b.dataset.h === 'refresh') await Strava.refresh(true);
      else if (b.dataset.h === 'disconnect') { if (!confirm('Disconnect Strava?')) return; await Strava.disconnect(); }
      render(app);
    });
  }
  Strava.onChange(() => { if (window.App && App.route === 'health') document.getElementById('app').innerHTML = html(); });
  window.HealthPage = { render, bind };
})();
