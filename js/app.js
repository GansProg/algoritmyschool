/* Переключение экранов, тема, оглавление на главной. */
(function () {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;

  var GAMES = [
    { key: 'robot', klass: '5–6', title: 'Робот-курьер', module: CourierGame, levels: CourierCore.LEVELS,
      desc: 'Робот развозит посылки по клетчатому городу. Собери ему программу из блоков «вперёд», «поворот», «повторить N раз» и «если стена».',
      tags: ['линейный алгоритм', 'цикл', 'ветвление', 'вложенность'] },
    { key: 'bugs', klass: '7–9', title: 'Баг-хантер', module: BugsGame, levels: BugsCore.LEVELS,
      desc: 'Дана программа на Python, а робот едет не туда. Сравни его путь с нужным, найди ошибку и исправь её за минимальное число правок.',
      tags: ['отладка', 'for и while', 'отступы', 'условия'] },
    { key: 'python', klass: '8–9', title: 'Python-квест', module: PyQuestGame, levels: PyQuestCore.CHAPTERS,
      desc: 'Ночью в музее вычислительной техники гаснет свет. Каждое действие героя записывается строчкой кода, Python работает прямо в браузере.',
      tags: ['функции', 'переменные', 'if/elif', 'циклы', 'списки', 'def'] },
    { key: 'sort', klass: '8–9', title: 'Сортировочный цех', module: SortGame, levels: SortCore.LEVELS,
      desc: 'Расставь ящики по весу, уложившись в лимит ходов. Потом посмотри, как это делают сортировка пузырьком и сортировка выбором.',
      tags: ['сортировка пузырьком', 'сортировка выбором', 'сложность'] }
  ];

  var inited = {};
  var current = null;

  function renderToc() {
    var toc = document.getElementById('toc');
    toc.innerHTML = '';
    GAMES.forEach(function (g) {
      var marks = el('span', { class: 'marks' });
      var done = 0;
      g.levels.forEach(function (lv) {
        var m = Grades.get(g.key, lv.id);
        if (m) done++;
        marks.appendChild(el('span', { class: m ? '' : 'empty', text: m ? String(m) : '·' }));
      });
      toc.appendChild(el('li', { class: 'toc-item' }, el('a', { href: '#' + g.key },
        el('div', { class: 'toc-class' }, g.klass, el('small', { text: 'класс' })),
        el('div', null,
          el('span', { class: 'toc-title', text: g.title }),
          el('p', { class: 'toc-desc', text: g.desc }),
          el('div', { class: 'toc-tags' }, g.tags.map(function (t) { return el('span', { class: 'tag', text: t }); }))),
        el('div', { class: 'toc-progress' }, marks, el('small', { text: 'пройдено ' + done + ' из ' + g.levels.length })))));
    });
  }

  function show(name) {
    var game = null;
    GAMES.forEach(function (g) { if (g.key === name) game = g; });
    if (!game) name = 'home';
    if (current && current !== name) {
      var prev = GAMES.filter(function (g) { return g.key === current; })[0];
      if (prev && prev.module.leave) prev.module.leave();
    }
    current = name;
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) views[i].hidden = views[i].getAttribute('data-view') !== name;
    var links = document.querySelectorAll('.topnav a');
    for (var j = 0; j < links.length; j++) {
      if (links[j].getAttribute('href') === '#' + name) links[j].setAttribute('aria-current', 'page');
      else links[j].removeAttribute('aria-current');
    }
    if (game) {
      if (!inited[name]) { game.module.init(); inited[name] = true; }
      else if (game.module.refresh) game.module.refresh();
      if (game.module.enter) game.module.enter();
      document.title = game.title + ' · Алгоритмы и программирование';
    } else {
      renderToc();
      document.title = 'Алгоритмы и программирование';
    }
    window.scrollTo(0, 0);
  }

  function route() { show((location.hash || '#home').slice(1)); }

  // Тема: «Тетрадь» (светлая) и «Доска» (тёмная); без выбора следуем системе
  function themeLabel() {
    var t = document.documentElement.getAttribute('data-theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var b = document.getElementById('theme-toggle');
    b.textContent = dark ? 'Доска' : 'Тетрадь';
    b.title = dark ? 'Сейчас оформление «школьная доска». Нажми, чтобы открыть тетрадь.' : 'Сейчас оформление «тетрадь». Нажми, чтобы перейти к доске.';
  }

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Store.set('theme', next);
    themeLabel();
  });

  ['student-name', 'student-class'].forEach(function (id) {
    var input = document.getElementById(id);
    input.value = Store.get(id, '');
    input.addEventListener('input', function () { Store.set(id, input.value); });
  });

  themeLabel();
  window.addEventListener('hashchange', route);
  route();
})();
