/*
 * APP: tiny hash router + bottom navigation + banners.
 * To add a page: create js/pages/xyz.js exposing { render(app, arg), bind(app) },
 * add a <script> tag in index.html and one line in PAGES below.
 */
(function () {
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const banner = document.getElementById('banner');
  const sub = document.getElementById('subnav');

  // Every route and the page that draws it.
  const PAGES = {
    home: { page: BriefPage }, briefings: { page: BriefingsPage },
    week: { page: WeekPage }, plan: { page: TodayPage, dated: true },
    matrix: { page: MatrixPage },
    journal: { page: TodayPage, dated: true }, coach: { page: CoachPage }, goals: { page: GoalsPage }, health: { page: HealthPage },
    household: { page: HouseholdPage }, meals: { page: MealsPage }, family: { page: FamilyPage },
    settings: { page: SettingsPage }
  };

  // The navigation is grouped so related pages live together. `tabs` appear as a small bar at the top of each page.
  const GROUPS = [
    { id: 'home',   label: 'Home',   icon: '⌂', tabs: [['home', 'Today'], ['briefings', 'Briefings']] },
    { id: 'week',   label: 'Week',   icon: '▤', tabs: [['week', 'Week']], also: ['plan'] },
    { id: 'matrix', label: 'Matrix', icon: '▦', tabs: [['matrix', 'Matrix']] },
    { id: 'me',     label: 'Me',     icon: '❀', tabs: [['journal', 'Journal'], ['coach', 'Coach'], ['goals', 'Goals'], ['health', 'Health']] },
    { id: 'house',  label: 'House',  icon: '❖', tabs: [['household', 'Household'], ['meals', 'Meals'], ['family', 'Family']] },
    { id: 'settings', label: 'Settings', icon: '⚙', tabs: [['settings', 'Settings']], railOnly: true }
  ];
  const groupOf = r => GROUPS.find(g => g.tabs.some(t => t[0] === r) || (g.also || []).includes(r));
  const lastKey = g => 'dd:last:' + g;
  const lastRoute = g => { try { const r = localStorage.getItem(lastKey(g.id)); if (r && g.tabs.some(t => t[0] === r)) return r; } catch (e) {} return g.tabs[0][0]; };

  let route = 'home';
  window.App = { get route() { return route; } };   // pages check this so only the visible page reacts to clicks

  function parse() {
    let [, name, arg] = (location.hash || '').split('/');
    if (name === 'today') name = 'plan';   // old links from the first version
    if (name === 'dash' || name === 'more') name = 'home';
    return { name: PAGES[name] ? name : 'home', arg };
  }

  function show(fresh) {
    const { name, arg } = parse();
    route = name;
    const P = PAGES[name], G = groupOf(name);
    if (G) { try { localStorage.setItem(lastKey(G.id), name); } catch (e) {} }
    if (P.dated) TodayPage.render(app, /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : U.today(), name);
    else P.page.render(app, arg);
    nav.innerHTML = GROUPS.map(g => `<a href="#/${lastRoute(g)}" class="${g.railOnly ? 'rail-only ' : ''}${G === g ? 'on' : ''}" ${G === g ? 'aria-current="page"' : ''}><span class="ni">${g.icon}</span>${g.label}</a>`).join('') +
      `<a href="#/settings" class="sync-dot ${Sync.status}" title="${Sync.status}" aria-label="Sync status: ${Sync.status}"></a>`;
    sub.innerHTML = G && G.tabs.length > 1 ? G.tabs.map(([r, l]) => `<a href="#/${r}" class="${r === name ? 'on' : ''}">${l}</a>`).join('') : '';
    sub.hidden = !sub.innerHTML;
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

  BriefPage.bind(app);
  WeekPage.bind(app);
  HouseholdPage.bind(app);
  CoachPage.bind(app);
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
