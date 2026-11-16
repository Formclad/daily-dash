/*
 * APP: tiny hash router + bottom navigation + banners.
 * To add a page: create js/pages/xyz.js exposing { render(app, arg), bind(app) },
 * add a <script> tag in index.html and one line in PAGES below.
 */
(function () {
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const banner = document.getElementById('banner');

  // route name -> { label, icon, page }   (order = order in the navigation)
  const PAGES = {
    home:    { label: 'Home',    icon: '⌂', page: HomePage },
    plan:    { label: 'Plan',    icon: '✎', page: TodayPage, dated: true },
    journal: { label: 'Journal', icon: '✿', page: TodayPage, dated: true },
    briefings:{ label: 'Briefings', icon: '✉', page: BriefingsPage, sec: true },
    matrix:  { label: 'Matrix',  icon: '▦', page: MatrixPage },
    goals:   { label: 'Goals',   icon: '◎', page: GoalsPage, sec: true },
    meals:   { label: 'Meals',   icon: '❋', page: MealsPage, sec: true },
    family:  { label: 'Family',  icon: '☺', page: FamilyPage, sec: true },
    health:  { label: 'Health',  icon: '♡', page: HealthPage, sec: true },
    settings:{ label: 'Settings',icon: '⚙', page: SettingsPage, sec: true },
    more:    { label: 'More',    icon: '☰', page: MorePage, hidden: true }
  };

  let route = 'home';
  window.App = { get route() { return route; }, secondary: () => Object.entries(PAGES).filter(([, p]) => p.sec) };   // pages check this so only the visible page reacts to clicks

  function parse() {
    let [, name, arg] = (location.hash || '').split('/');
    if (name === 'today') name = 'plan';   // old links from the first version
    return { name: PAGES[name] ? name : 'home', arg };
  }

  function show(fresh) {
    const { name, arg } = parse();
    route = name;
    const P = PAGES[name];
    if (P.dated) TodayPage.render(app, /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : U.today(), name);
    else P.page.render(app);
    const link = ([k, p]) => `<a href="#/${k}" class="${p.sec ? 'sec ' : ''}${k === name || (p.sec && name === 'more') ? 'on' : ''}" ${k === name ? 'aria-current="page"' : ''}><span class="ni">${p.icon}</span>${p.label}</a>`;
    const moreOn = P.sec || name === 'more';
    nav.innerHTML = Object.entries(PAGES).filter(([, p]) => !p.hidden).map(link).join('') +
      `<a href="#/more" class="more-link ${moreOn ? 'on' : ''}"><span class="ni">☰</span>More</a>` +
      `<a href="#/settings" class="sync-dot ${Sync.status}" title="${Sync.status}" aria-label="Sync status: ${Sync.status}"></a>`;
    if (fresh === true) window.scrollTo(0, 0);
    updateBanner();
  }

  /** Weekly backup nudge (never alarming, snoozable). */
  function updateBanner() {
    if (!Store.meta('firstUse')) Store.setMeta('firstUse', Date.now());
    const since = Math.max(Store.meta('lastExport') || 0, Store.meta('firstUse'));
    const due = Date.now() - since > DD_DEFAULTS.backupReminderDays * 864e5;
    const snoozed = (Store.meta('snooze') || 0) > Date.now();
    banner.hidden = !(due && !snoozed && route !== 'settings');
    banner.innerHTML = banner.hidden ? '' : `<span>A gentle nudge: time for a backup.</span><a href="#/settings">Open settings</a><button aria-label="Dismiss" id="snooze">×</button>`;
  }
  banner.addEventListener('click', e => { if (e.target.id === 'snooze') { Store.setMeta('snooze', Date.now() + 864e5); updateBanner(); } });

  HomePage.bind(app);
  TodayPage.bind(app);
  MatrixPage.bind(app);
  GoalsPage.bind(app);
  MealsPage.bind(app);
  HealthPage.bind(app);
  FamilyPage.bind(app);
  BriefingsPage.bind(app);
  SettingsPage.bind(app, show);
  window.addEventListener('hashchange', () => show(true));

  // Data arrived from another device: refresh unless you are mid-typing.
  Store.subscribe(i => { if (i.type === 'remote' && !TodayPage.isEditing() && route !== 'settings') show(); });
  Sync.onChange(() => {
    if (Sync.status === 'idle') Strava.refresh();
    const dot = nav.querySelector('.sync-dot');
    if (dot) { dot.className = 'sync-dot ' + Sync.status; dot.title = Sync.status; }
    if (route === 'settings' && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) show();
  });

  // Coming back from Strava's approval page (?code=...): finish the link, then tidy the address bar.
  const q = new URLSearchParams(location.search);
  if (q.get('code') && /activity/.test(q.get('scope') || '')) {
    history.replaceState(null, '', location.pathname + '#/health');
    Strava.finishConnect(q.get('code'));
  } else if (q.get('error')) history.replaceState(null, '', location.pathname + '#/health');

  show();
  Sync.start();
  Calendar.refresh();
  Strava.refresh();

  // Offline support: only works over https (GitHub Pages) or localhost.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
