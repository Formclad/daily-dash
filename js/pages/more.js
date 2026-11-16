/* MORE: a menu of the less-used pages, so the phone's bottom bar stays uncluttered. */
(function () {
  window.MorePage = {
    render(app) {
      const items = (window.App && App.secondary()) || [];
      app.innerHTML = `<header class="dayhead"><div class="dh-mid"><h1>More</h1></div></header><div class="morelist">` +
        items.map(([k, p]) => `<a class="card morelink" href="#/${k}"><span class="stamp">${p.icon}</span><span>${p.label}</span></a>`).join('') + `</div>`;
    }
  };
})();
