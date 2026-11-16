/*
 * MEALS PAGE: a weekly meal planner (Mon-Sun, breakfast/lunch/dinner) and a shopping list.
 * Data: 'meals:<Monday date>' = { 'YYYY-MM-DD': { b, l, d } }   and   'data:shopping' = { items: [...] }
 */
(function () {
  const SLOTS = [['b', 'Breakfast'], ['l', 'Lunch'], ['d', 'Dinner']];
  const AISLES = ['Fruit & veg', 'Meat & fish', 'Dairy & eggs', 'Pantry', 'Frozen', 'Household', 'Other'];
  const mealKey = wk => 'meals:' + wk;
  const shop = () => Store.get('data:shopping', { items: [] }).items;
  const saveShop = items => Store.set('data:shopping', { items });

  /** Used by Home: tonight's dinner and how many things are left to buy. */
  window.Meals = {
    dinner(date) { const w = Store.peek(mealKey(U.weekStart(date))) || {}; return ((w[date] || {}).d) || ''; },
    toBuy: () => shop().filter(i => !i.done).length
  };

  let week = U.weekStart(U.today());

  function html() {
    const data = Store.get(mealKey(week), {});
    const days = Array.from({ length: 7 }, (_, i) => U.addDays(week, i));
    const today = U.today();
    const planner = days.map(d => `<div class="mday ${d === today ? 'is-today' : ''}"><div class="md-h">${U.parse(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })}</div>` +
      SLOTS.map(([k, label]) => `<label class="ms"><span>${label}</span><input type="text" data-meal="${d}.${k}" value="${U.esc((data[d] || {})[k] || '')}" autocomplete="off" aria-label="${label} ${d}"></label>`).join('') + `</div>`).join('');
    const items = shop();
    const open = items.filter(i => !i.done), done = items.filter(i => i.done);
    const group = AISLES.map(a => ({ a, rows: open.filter(i => (i.aisle || 'Other') === a) })).filter(g => g.rows.length);
    const row = i => `<div class="task ${i.done ? 'done' : ''}"><button class="box-btn ${i.done ? 'on' : ''}" data-s="tick" data-id="${i.id}" role="checkbox" aria-checked="${!!i.done}" aria-label="Got it"><span class="box">${i.done ? '✓' : ''}</span></button><div class="tk-main"><div class="tk-t">${U.esc(i.t)}</div></div><button class="x" data-s="del" data-id="${i.id}" aria-label="Remove">×</button></div>`;
    const weekLabel = `${U.parse(week).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} to ${U.parse(U.addDays(week, 6)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    return `<header class="dayhead"><button class="arrow" data-w="-7" aria-label="Previous week">‹</button><div class="dh-mid"><h1>Meals</h1><div class="dh-sub">${weekLabel}</div></div><button class="arrow" data-w="7" aria-label="Next week">›</button></header>` +
      `<div class="cols meals"><div class="col"><section class="card"><header class="card-h"><span class="stamp">❋</span><h2>Meal plan</h2></header>${planner}</section></div>` +
      `<div class="col"><section class="card"><header class="card-h"><span class="stamp">☰</span><h2>Shopping list</h2><span class="no">${open.length} to get</span></header>` +
      `<form class="add" data-s="add"><input type="text" name="t" placeholder="Add an item" required autocomplete="off" aria-label="Item"><select name="aisle" aria-label="Aisle">${AISLES.map(a => `<option>${a}</option>`).join('')}</select><button class="pill" type="submit">Add</button></form>` +
      (group.map(g => `<h3 class="aisle">${g.a}</h3>${g.rows.map(row).join('')}`).join('') || '<p class="hint">Nothing on the list.</p>') +
      (done.length ? `<h3 class="aisle">In the trolley</h3>${done.map(row).join('')}<div class="btn-row"><button class="pill ghost" data-s="clear">Clear ${done.length} ticked</button></div>` : '') +
      `</section></div></div>`;
  }

  const render = app => { app.innerHTML = html(); };
  const mine = () => window.App && App.route === 'meals';

  function bind(app) {
    app.addEventListener('input', e => {
      const i = e.target.closest('input[data-meal]');
      if (!i || !mine()) return;
      const [d, k] = i.dataset.meal.split('.');
      Store.update(mealKey(week), {}, w => { (w[d] = w[d] || {})[k] = i.value; });
    });
    app.addEventListener('submit', e => {
      const f = e.target.closest('form[data-s="add"]');
      if (!f || !mine()) return;
      e.preventDefault();
      const l = shop(); l.push({ id: U.id(), t: f.t.value.trim(), aisle: f.aisle.value, done: false }); saveShop(l);
      render(app);
    });
    app.addEventListener('click', e => {
      if (!mine()) return;
      const w = e.target.closest('button[data-w]');
      if (w) { week = U.addDays(week, +w.dataset.w); render(app); return; }
      const b = e.target.closest('button[data-s]');
      if (!b) return;
      let l = shop();
      if (b.dataset.s === 'tick') { const i = l.find(x => x.id === b.dataset.id); i.done = !i.done; }
      else if (b.dataset.s === 'del') l = l.filter(x => x.id !== b.dataset.id);
      else if (b.dataset.s === 'clear') l = l.filter(x => !x.done);
      else return;
      saveShop(l);
      render(app);
    });
  }
  window.MealsPage = { render, bind };
})();
