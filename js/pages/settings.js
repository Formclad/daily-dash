/*
 * SETTINGS PAGE: sync sign-in, prompts, appearance, backup.
 * (Habit editing will be added here later.)
 */
(function () {
  const D = DD_DEFAULTS;
  const STATUS = {
    off: 'Not set up yet', signedout: 'Signed out', idle: 'Synced', syncing: 'Syncing…', offline: 'Offline (saved on this device)', error: 'Could not sync'
  };

  function html() {
    const saved = Sync.savedConfig();
    const p = Store.get('config:prompts', U.clone(D.prompts));
    const theme = (() => { try { return localStorage.getItem('dd:theme') || 'auto'; } catch (e) { return 'auto'; } })();
    const last = Store.meta('lastSync');
    const sync = Sync.signedIn()
      ? `<p class="set-line"><b>${U.esc(Sync.email())}</b><br><span class="hint">${STATUS[Sync.status] || ''}${last ? ' · last ' + new Date(last).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : ''}${Sync.error ? '<br>' + U.esc(Sync.error) : ''}</span></p>
         <div class="btn-row"><button class="pill" data-set="sync-now">Sync now</button><button class="pill ghost" data-set="sign-out">Sign out</button></div>`
      : `<form data-set="sign-in" class="stack">
          ${Sync.configured() && (saved.url || (window.DD_CONFIG || {}).supabaseUrl) ? '' : ''}
          <label>Project URL<input name="url" type="url" inputmode="url" autocomplete="off" placeholder="https://xxxx.supabase.co" value="${U.esc(saved.url || '')}"></label>
          <label>Anon (public) key<input name="key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="paste the anon / publishable key" value="${U.esc(saved.key || '')}"></label>
          <label>Email<input name="email" type="email" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <button class="pill" type="submit">Sign in &amp; sync</button>
          <p class="hint err" id="sign-err">${Sync.error ? U.esc(Sync.error) : ''}</p>
        </form>`;
    return `<header class="dayhead"><div class="dh-mid"><h1>Settings</h1></div></header>
      <section class="card"><header class="card-h"><span class="stamp">⇄</span><h2>Sync</h2></header>${sync}</section>
      <section class="card"><header class="card-h"><span class="stamp">✎</span><h2>Morning prompts</h2></header>
        <form data-set="prompts" class="stack">${p.morning.map((q, i) => `<label>Prompt ${i + 1}<textarea class="line" rows="1" name="m${i}">${U.esc(q)}</textarea></label>`).join('')}
        <label>Question under the top three<textarea class="line" rows="1" name="ferriss">${U.esc(p.ferriss)}</textarea></label>
        <div class="btn-row"><button class="pill" type="submit">Save prompts</button><button class="pill ghost" type="button" data-set="prompts-reset">Reset</button></div></form></section>
      <section class="card"><header class="card-h"><span class="stamp">◐</span><h2>Appearance</h2></header>
        <div class="seg" role="radiogroup">${['auto', 'light', 'dark'].map(t => `<button class="${theme === t ? 'on' : ''}" data-set="theme" data-v="${t}" role="radio" aria-checked="${theme === t}">${t}</button>`).join('')}</div></section>
      <section class="card"><header class="card-h"><span class="stamp">⤓</span><h2>Backup</h2></header>
        <p class="hint">Last backup: ${Store.meta('lastExport') ? new Date(Store.meta('lastExport')).toLocaleDateString('en-AU') : 'never'}. A copy of everything, as one file.</p>
        <div class="btn-row"><button class="pill" data-set="export">Export backup</button><label class="pill ghost file">Import backup<input type="file" accept="application/json,.json" data-set="import" hidden></label></div>
        <p class="hint" id="bk-msg"></p></section>`;
  }

  function render(app) { app.innerHTML = html(); }

  function bind(app, rerender) {
    const mine = () => window.App && App.route === 'settings';
    app.addEventListener('submit', async e => {
      if (!mine()) return;
      const f = e.target.closest('form[data-set]');
      if (!f) return;
      e.preventDefault();
      if (f.dataset.set === 'sign-in') {
        const err = document.getElementById('sign-err');
        try {
          err.textContent = 'Signing in…';
          Sync.saveConfig(f.url.value || '', f.key.value || '');
          if (!Sync.configured()) throw new Error('Please paste the Project URL and the anon key.');
          await Sync.signIn(f.email.value.trim(), f.password.value);
          rerender();
        } catch (x) { err.textContent = x.message; }
      } else if (f.dataset.set === 'prompts') {
        Store.set('config:prompts', { morning: D.prompts.morning.map((_, i) => f['m' + i].value.trim() || D.prompts.morning[i]), ferriss: f.ferriss.value.trim() || D.prompts.ferriss });
        f.querySelector('button[type=submit]').textContent = 'Saved ✓';
      }
    });

    app.addEventListener('click', e => {
      if (!mine()) return;
      const b = e.target.closest('button[data-set]');
      if (!b) return;
      const a = b.dataset.set;
      if (a === 'sync-now') Sync.now();
      else if (a === 'sign-out') { Sync.signOut(); rerender(); }
      else if (a === 'prompts-reset') { Store.set('config:prompts', U.clone(D.prompts)); rerender(); }
      else if (a === 'theme') {
        try { b.dataset.v === 'auto' ? localStorage.removeItem('dd:theme') : localStorage.setItem('dd:theme', b.dataset.v); } catch (x) {}
        if (b.dataset.v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = b.dataset.v;
        rerender();
      } else if (a === 'export') {
        const blob = new Blob([JSON.stringify(Store.exportAll(), null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `daily-dash-backup-${U.today()}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 2000);
        Store.setMeta('lastExport', Date.now());
        rerender();
      }
    });

    app.addEventListener('change', async e => {
      if (!mine()) return;
      const inp = e.target.closest('input[data-set="import"]');
      if (!inp || !inp.files[0]) return;
      const msg = document.getElementById('bk-msg');
      try {
        Store.importAll(JSON.parse(await inp.files[0].text()));
        msg.textContent = 'Backup imported ✓';
      } catch (x) { msg.textContent = x.message || 'Could not read that file.'; }
    });
  }

  window.SettingsPage = { render, bind };
})();
