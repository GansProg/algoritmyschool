/* Переключение экранов, тема, язык, оглавление на главной. */
(function () {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;
  var t = I18n.t;

  var GAMES = [
    { key: 'robot', klass: '5–6', module: CourierGame, levels: CourierCore.LEVELS,
      desc: {
        kk: 'Робот торкөзді қалада сәлемдеме таратады. Оған «алға», «бұрылу», «N рет қайтала» және «егер қабырға» блоктарынан бағдарлама құрастыр.',
        ru: 'Робот развозит посылки по клетчатому городу. Собери ему программу из блоков «вперёд», «поворот», «повторить N раз» и «если стена».'
      },
      tags: { kk: ['сызықтық алгоритм', 'цикл', 'тармақталу', 'кірістіру'], ru: ['линейный алгоритм', 'цикл', 'ветвление', 'вложенность'] } },
    { key: 'bugs', klass: '7–9', module: BugsGame, levels: BugsCore.LEVELS,
      desc: {
        kk: 'Python-дағы бағдарлама берілген, бірақ робот басқа жаққа кетеді. Оның жолын керекті жолмен салыстыр, қатені тауып, ең аз түзетумен жөнде.',
        ru: 'Дана программа на Python, а робот едет не туда. Сравни его путь с нужным, найди ошибку и исправь её за минимальное число правок.'
      },
      tags: { kk: ['қатені табу', 'for және while', 'шегіністер', 'шарттар'], ru: ['отладка', 'for и while', 'отступы', 'условия'] } },
    { key: 'python', klass: '8–9', module: PyQuestGame, levels: PyQuestCore.CHAPTERS,
      desc: {
        kk: 'Түнде есептеуіш техника мұражайында жарық сөнеді. Кейіпкердің әр әрекеті код жолы болып жазылады, Python тікелей браузерде жұмыс істейді.',
        ru: 'Ночью в музее вычислительной техники гаснет свет. Каждое действие героя записывается строчкой кода, Python работает прямо в браузере.'
      },
      tags: { kk: ['функциялар', 'айнымалылар', 'if/elif', 'циклдер', 'тізімдер', 'def'], ru: ['функции', 'переменные', 'if/elif', 'циклы', 'списки', 'def'] } },
    { key: 'sort', klass: '8–9', module: SortGame, levels: SortCore.LEVELS,
      desc: {
        kk: 'Жәшіктерді салмағы бойынша жүріс шегінен аспай орналастыр. Содан кейін көпіршікті сұрыптау мен таңдау арқылы сұрыптаудың қалай жұмыс істейтінін көр.',
        ru: 'Расставь ящики по весу, уложившись в лимит ходов. Потом посмотри, как это делают сортировка пузырьком и сортировка выбором.'
      },
      tags: { kk: ['көпіршікті сұрыптау', 'таңдау арқылы сұрыптау', 'күрделілік'], ru: ['сортировка пузырьком', 'сортировка выбором', 'сложность'] } }
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
        el('div', { class: 'toc-class' }, g.klass, el('small', { text: t('toc.class') })),
        el('div', null,
          el('span', { class: 'toc-title', text: t('nav.' + g.key) }),
          el('p', { class: 'toc-desc', text: I18n.pick(g.desc) }),
          el('div', { class: 'toc-tags' }, I18n.pick(g.tags).map(function (x) { return el('span', { class: 'tag', text: x }); }))),
        el('div', { class: 'toc-progress' }, marks, el('small', { text: t('toc.done', { d: done, n: g.levels.length }) })))));
    });
  }

  function gameByKey(k) { return GAMES.filter(function (g) { return g.key === k; })[0]; }

  function setTitle() {
    var game = gameByKey(current);
    document.title = game ? t('nav.' + game.key) + ' · ' + t('doc.title') : t('doc.title');
  }

  function show(name) {
    var game = gameByKey(name);
    if (!game) name = 'home';
    if (current && current !== name) {
      var prev = gameByKey(current);
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
    } else {
      renderToc();
    }
    setTitle();
    window.scrollTo(0, 0);
  }

  function route() { show((location.hash || '#home').slice(1)); }

  // Тема: «Дәптер/Тетрадь» (светлая) и «Тақта/Доска» (тёмная); без выбора следуем системе
  function isDark() {
    var th = document.documentElement.getAttribute('data-theme');
    return th ? th === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function themeLabel() {
    var b = document.getElementById('theme-toggle');
    b.textContent = t(isDark() ? 'theme.dark' : 'theme.light');
    b.title = t(isDark() ? 'theme.toLight' : 'theme.toDark');
  }

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Store.set('theme', next);
    themeLabel();
  });

  // Язык: казахский по умолчанию, выбор запоминается
  function langButtons() {
    var btns = document.querySelectorAll('.lang button');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === I18n.lang ? 'true' : 'false');
  }

  function applyLang() {
    I18n.apply();
    themeLabel();
    langButtons();
    setTitle();
    if (current === 'home') renderToc();
    Object.keys(inited).forEach(function (k) {
      var g = gameByKey(k);
      if (g.module.leave) g.module.leave();
      if (g.module.relang) g.module.relang();
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-lang') === I18n.lang) return;
      I18n.set(b.getAttribute('data-lang'));
      applyLang();
    });
  });

  ['student-name', 'student-class'].forEach(function (id) {
    var input = document.getElementById(id);
    input.value = Store.get(id, '');
    input.addEventListener('input', function () { Store.set(id, input.value); });
  });

  I18n.apply();
  themeLabel();
  langButtons();
  window.addEventListener('hashchange', route);
  route();
})();
