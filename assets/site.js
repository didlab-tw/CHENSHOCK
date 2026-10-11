// 網站互動：清單篩選、側邊目錄跟著捲動標示目前位置
(function () {
  // 篩選（學術發表依類型、研究計畫依角色、歷年授課依學校）
  var buttons = document.querySelectorAll('.filters button');
  var items = document.querySelectorAll('#pub-list .pub, #filter-scope [data-tags]');
  var groups = document.querySelectorAll('.filter-group');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      items.forEach(function (it) {
        var tags = (it.getAttribute('data-tags') || '').split(' ');
        it.hidden = f !== 'all' && tags.indexOf(f) === -1;
      });
      // 整個學年度都被篩掉時，連標題一起藏起來
      groups.forEach(function (g) {
        g.hidden = !g.querySelector('[data-tags]:not([hidden])');
      });
    });
  });

  // 側邊目錄
  var links = document.querySelectorAll('.toc a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  function setActive(id) {
    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
  }
  links.forEach(function (a) {
    a.addEventListener('click', function () { setActive(a.getAttribute('href').slice(1)); });
  });
  var visible = {};
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      if (visible[id]) { setActive(id); break; }
    }
  }, { rootMargin: '-20% 0px -60% 0px' });
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) observer.observe(el);
  });
})();
