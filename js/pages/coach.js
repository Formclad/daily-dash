/*
 * COACH PAGE: check in on how you feel, work through a worry (CBT thought check), fear-setting, and see your wins.
 * Data: 'data:thoughts' = { items: [{ id, at, sit, thought, before, for, against, balanced, after }] }
 *       'data:fears'    = { items: [{ id, at, fear, worst, prevent, repair, benefit, cost }] }
 */
(function () {
  let tab = 'checkin';
  const get = (k) => Store.get(k, { items: [] }).items;
  const put = (k, l) => Store.set(k, { items: l });
  const fmt = at => new Date(at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const area = (n, l, ph, rows = 2) => `<label class="qa"><span class="q">${l}</span><textarea class="line" rows="${rows}" name="${n}" placeholder="${ph || ''}"></textarea></label>`;

  function checkin() {
    const today = U.today(), cur = Day.get(today).feel, f = Coach.feeling(cur);
    return `<section class="card"><header class="card-h"><span class="stamp">☺</span><h2>How are you right now?</h2></header>` +
      `<div class="chips">${Coach.FEELINGS.map(x => `<button class="chip ${cur === x.id ? 'on' : ''}" data-c="feel" data-v="${x.id}">${x.emoji} ${x.label}</button>`).join('')}</div>` +
      (f ? `<p class="coach-say">${U.esc(f.say)}</p><ol class="coach-steps">${f.steps.map(s => `<li>${U.esc(s)}</li>`).join('')}</ol>` +
        `<div class="btn-row"><button class="pill" data-c="tab" data-v="thought">Try a thought check</button></div>` : '<p class="hint">Tap how you feel and I will suggest one small step. No right answer.</p>') + `</section>` +
      `<section class="card"><header class="card-h"><span class="stamp">?</span><h2>A question for today</h2></header><p class="coach-q">${U.esc(Coach.reframe())}</p></section>`;
  }

  function thought() {
    const list = get('data:thoughts').slice().reverse().slice(0, 6);
    return `<section class="card"><header class="card-h"><span class="stamp">✎</span><h2>Thought check</h2></header><p class="hint">Use when a worry or harsh thought is looping. Writing it out helps your mind see it more clearly.</p>` +
      `<form data-c="thought-add" class="stack">${area('sit', 'What happened? (just the facts)', 'Where, when, who')}${area('thought', 'What went through my mind?', 'The exact thought, e.g. “I’m failing at everything”')}` +
      `<label class="qa"><span class="q">How strongly do I believe it? <b class="rv">50</b>%</span><input type="range" name="before" min="0" max="100" value="50" data-c="range"></label>` +
      `${area('for', 'Evidence that supports the thought', '')}${area('against', 'Evidence against it (what would a friend say?)', '')}${area('balanced', 'A more balanced way to see it', 'Kind and realistic, not forced positivity')}` +
      `<label class="qa"><span class="q">How much do I believe the original thought now? <b class="rv">50</b>%</span><input type="range" name="after" min="0" max="100" value="50" data-c="range"></label>` +
      `<button class="pill" type="submit">Save</button></form></section>` +
      (list.length ? `<section class="card"><header class="card-h"><span class="stamp">◔</span><h2>Recent</h2></header>${list.map(t => `<details class="brief"><summary><span class="bt">${U.esc(t.thought.slice(0, 60))}</span><span class="bw">${U.esc(fmt(t.at))}</span></summary><div class="bbody"><p><b>Belief:</b> ${t.before}% → ${t.after}%</p><p><b>For:</b> ${U.esc(t.for)}</p><p><b>Against:</b> ${U.esc(t.against)}</p><p><b>Balanced:</b> ${U.esc(t.balanced)}</p></div></details>`).join('')}</section>` : '');
  }

  function fear() {
    const list = get('data:fears').slice().reverse().slice(0, 4);
    return `<section class="card"><header class="card-h"><span class="stamp">☁</span><h2>Fear-setting</h2></header><p class="hint">For a decision or worry that keeps you stuck. Naming the worst case usually makes it more manageable.</p>` +
      `<form data-c="fear-add" class="stack">${area('fear', 'What am I afraid might happen / what am I avoiding?', '')}${area('worst', 'Worst case, in detail', '')}${area('prevent', 'What could I do to prevent it or make it less likely?', '')}${area('repair', 'If it did happen, how would I repair or cope?', '')}${area('benefit', 'What could I gain by trying?', '')}${area('cost', 'What does it cost me if I do nothing for 6 months?', '')}<button class="pill" type="submit">Save</button></form></section>` +
      list.map(f => `<details class="card brief"><summary><span class="bt">${U.esc(f.fear.slice(0, 60))}</span><span class="bw">${U.esc(fmt(f.at))}</span></summary><div class="bbody"><p><b>Worst case:</b> ${U.esc(f.worst)}</p><p><b>Prevent:</b> ${U.esc(f.prevent)}</p><p><b>Repair:</b> ${U.esc(f.repair)}</p><p><b>Gain:</b> ${U.esc(f.benefit)}</p><p><b>Cost of inaction:</b> ${U.esc(f.cost)}</p></div></details>`).join('');
  }

  function wins() {
    const w = Coach.wins();
    return `<section class="card"><header class="card-h"><span class="stamp">★</span><h2>Your wins this week</h2></header>` +
      (w.length ? w.map(x => `<div class="hu"><div class="hu-d">${U.esc(fmt(U.parse(x.d).getTime()))}</div><div class="hu-m">${x.bits.map(b => `<div class="hu-t">${U.esc(b)}</div>`).join('')}</div></div>`).join('') : '<p class="hint">Wins appear here as you tick habits, finish priorities and move. They are easy to forget, so I keep them for you.</p>') + `</section>`;
  }

  function html() {
    const tabs = [['checkin', 'Check-in'], ['thought', 'Thought check'], ['fear', 'Fear-setting'], ['wins', 'Wins']];
    return `<header class="dayhead"><div class="dh-mid"><h1>Coach</h1><div class="dh-sub">Support, perspective and small steps</div></div></header>` +
      `<div class="seg" role="tablist">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-c="tab" data-v="${k}" role="tab" aria-selected="${tab === k}">${l}</button>`).join('')}</div>` +
      ({ checkin, thought, fear, wins }[tab])() +
      `<p class="hint center">Self-help support, not therapy or medical advice. If you feel unsafe or in crisis, call Lifeline on 13 11 14, or 000 in an emergency.</p>`;
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'coach';
  function bind(app) {
    app.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (!b || !mine() || b.tagName === 'FORM' || b.tagName === 'INPUT') return;
      if (b.dataset.c === 'tab') tab = b.dataset.v;
      else if (b.dataset.c === 'feel') Day.update(U.today(), d => { d.feel = d.feel === b.dataset.v ? '' : b.dataset.v; });
      else return;
      render(app);
    });
    app.addEventListener('input', e => { const r = e.target.closest('input[data-c="range"]'); if (r && mine()) r.closest('label').querySelector('.rv').textContent = r.value; });
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-c]');
      if (!f || !mine()) return;
      e.preventDefault();
      const v = n => (f[n] ? f[n].value.trim() : '');
      if (f.dataset.c === 'thought-add') { const l = get('data:thoughts'); l.push({ id: U.id(), at: Date.now(), sit: v('sit'), thought: v('thought') || '(no title)', before: +f.before.value, for: v('for'), against: v('against'), balanced: v('balanced'), after: +f.after.value }); put('data:thoughts', l); }
      else { const l = get('data:fears'); l.push({ id: U.id(), at: Date.now(), fear: v('fear') || '(untitled)', worst: v('worst'), prevent: v('prevent'), repair: v('repair'), benefit: v('benefit'), cost: v('cost') }); put('data:fears', l); }
      f.reset(); render(app);
    });
  }
  window.CoachPage = { render, bind };
})();
