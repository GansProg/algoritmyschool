/* «Python-квест»: редактор, загрузка Skulpt и журнал героя. */
(function (root) {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;
  var CH = PyQuestCore.CHAPTERS;
  var $ = function (id) { return document.getElementById(id); };
  var state = { idx: 0, skulpt: null, busy: false };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function ensureSkulpt() {
    if (!state.skulpt) {
      $('q-loading').textContent = I18n.t('q.loading');
      state.skulpt = loadScript('lib/skulpt.min.js')
        .then(function () { return loadScript('lib/skulpt-stdlib.js'); })
        .then(function () { $('q-loading').textContent = ''; return root.Sk; }, function (e) {
          state.skulpt = null;
          $('q-loading').textContent = I18n.t('q.loadFail');
          throw e;
        });
    }
    return state.skulpt;
  }

  function chapter() { return CH[state.idx]; }
  // Код хранится отдельно для каждого языка: в заготовках разные слова
  function codeKey(c) { return 'python:' + I18n.lang + ':' + c.id; }

  function renderChapters() {
    var ol = $('q-chapters');
    ol.innerHTML = '';
    CH.forEach(function (c, i) {
      var g = Grades.get('python', c.id);
      ol.appendChild(el('li', null, el('button', {
        type: 'button', 'aria-current': i === state.idx ? 'true' : 'false',
        onclick: function () { loadChapter(i); }
      }, el('span', { class: 'no', text: String(i + 1) }), el('span', null, I18n.pick(c.title)), el('span', { class: 'mk', text: g ? String(g) : '' }))));
    });
  }

  function renderStory() {
    var c = chapter();
    var s = $('q-story');
    s.innerHTML = '';
    s.appendChild(el('p', { class: 'task-topic', text: I18n.t('q.topic', { n: state.idx + 1, t: I18n.pick(c.topic) }) }));
    s.appendChild(el('h3', { text: I18n.pick(c.title), style: 'font-size:24px;margin:2px 0 10px' }));
    I18n.pick(c.story).forEach(function (p) { s.appendChild(el('p', { text: p })); });
    s.appendChild(el('div', { class: 'task-box' }, el('b', { text: I18n.t('q.task') }), I18n.pick(c.task)));
    var api = $('q-api');
    api.innerHTML = '';
    api.appendChild(el('p', { class: 'panel-title', style: 'margin:6px 0 0' }, el('span', null, I18n.t('q.api'))));
    I18n.pick(c.api).forEach(function (a) { api.appendChild(el('div', null, el('code', { text: a[0] }), el('span', { text: a[1] }))); });
  }

  function updateGutter(badLine) {
    var ta = $('q-code');
    var n = ta.value.split('\n').length;
    var g = $('q-gutter');
    var html = [];
    for (var i = 1; i <= n; i++) html.push(i === badLine ? '<span class="bad">' + i + '</span>' : String(i));
    g.innerHTML = html.join('\n');
    g.scrollTop = ta.scrollTop;
    var c = chapter();
    var lines = PyQuestCore.codeLines(ta.value);
    var info = $('q-lines');
    info.textContent = I18n.t(c.maxLines ? 'q.lines.max' : 'q.lines', { n: lines, m: c.maxLines });
    info.className = c.maxLines && lines > c.maxLines ? 'over' : '';
  }

  function loadChapter(i) {
    state.idx = i;
    Store.set('python:chapter', i);
    var c = chapter();
    $('q-code').value = Store.get(codeKey(c), I18n.pick(c.starter));
    renderChapters();
    renderStory();
    updateGutter();
    var j = $('q-journal');
    j.innerHTML = '';
    j.appendChild(el('p', { class: 'empty', text: I18n.t('q.empty') }));
    Common.clearStamp(j.parentNode);
  }

  function errText(e) {
    return (e.line ? I18n.t('q.e.where', { n: e.line }) : '') + (e.key ? I18n.t(e.key, { x: e.x }) : '') + (e.extra || '');
  }

  function renderJournal(res) {
    var j = $('q-journal');
    j.innerHTML = '';
    var delay = 0;
    res.runs.forEach(function (r) {
      if (res.runs.length > 1 || !r.ok) {
        j.appendChild(el('div', { class: 'run-h' }, r.label, el('span', { class: 'res ' + (r.ok ? 'ok' : 'bad'), text: I18n.t(r.ok ? 'q.ok' : 'q.bad') })));
      }
      r.events.forEach(function (e) {
        var row;
        if (e.kind === 'act') row = el('div', { class: 'entry' }, el('code', { text: e.code }), el('span', { text: e.text }));
        else if (e.kind === 'print') row = el('div', { class: 'entry print' }, el('code', { text: 'print' }), el('span', { text: e.code }));
        else if (e.kind === 'win') row = el('div', { class: 'entry win' }, el('code', { text: '✓' }), el('span', { text: e.text }));
        else row = el('div', { class: 'entry fail' }, el('code', { text: e.kind === 'error' ? I18n.t('q.error') : '✗' }), el('span', { text: e.kind === 'error' ? errText(e.err) : e.text }));
        row.style.animationDelay = Math.min(delay, 2400) + 'ms';
        delay += 70;
        j.appendChild(row);
      });
      if (!r.events.length) j.appendChild(el('div', { class: 'entry fail' }, el('code', { text: '…' }), el('span', { text: I18n.t('q.nothing') })));
    });
    if (res.tooLong) {
      j.appendChild(el('div', { class: 'entry fail' }, el('code', { text: '✗' }),
        el('span', { text: I18n.t('q.tooLong', { n: res.lines, m: chapter().maxLines }) })));
    }
    var err = null;
    res.runs.forEach(function (r) { if (!err && r.error && r.error.line) err = r.error.line; });
    updateGutter(err);
  }

  function run() {
    if (state.busy) return;
    var c = chapter();
    var code = $('q-code').value;
    Store.set(codeKey(c), code);
    state.busy = true;
    $('q-run').disabled = true;
    ensureSkulpt().then(function (Sk) {
      $('q-loading').textContent = I18n.t('q.running');
      return PyQuestCore.runAll(Sk, c, code, I18n.lang);
    }).then(function (res) {
      $('q-loading').textContent = '';
      renderJournal(res);
      var panel = $('q-journal').parentNode;
      if (res.ok) {
        Grades.set('python', c.id, 5);
        Common.stamp(panel, 5, state.idx === CH.length - 1 ? I18n.t('q.final') : null);
        renderChapters();
      } else {
        Common.clearStamp(panel);
      }
    }).catch(function () { /* сообщение уже показано */ }).then(function () {
      state.busy = false;
      $('q-run').disabled = false;
    });
  }

  // insertText сохраняет историю отмены; если браузер его не умеет, вставляем напрямую
  function insert(ta, text) {
    var ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (err) { ok = false; }
    if (!ok) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }

  function onKey(e) {
    var ta = e.target;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insert(ta, '    ');
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      var start = ta.selectionStart;
      var lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
      var line = ta.value.slice(lineStart, start);
      var indent = /^ */.exec(line)[0];
      if (/:\s*$/.test(line)) indent += '    ';
      e.preventDefault();
      insert(ta, '\n' + indent);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    }
  }

  function init() {
    var ta = $('q-code');
    ta.addEventListener('input', function () { updateGutter(); Store.set(codeKey(chapter()), ta.value); });
    ta.addEventListener('scroll', function () { $('q-gutter').scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', onKey);
    $('q-run').addEventListener('click', run);
    $('q-reset').addEventListener('click', function () {
      ta.value = I18n.pick(chapter().starter);
      Store.set(codeKey(chapter()), ta.value);
      updateGutter();
    });
    $('q-journal').parentNode.style.position = 'relative';
    loadChapter(Math.min(Store.get('python:chapter', 0), CH.length - 1));
  }

  root.PyQuestGame = { init: init, enter: function () { ensureSkulpt().catch(function () {}); }, refresh: renderChapters, relang: function () { loadChapter(state.idx); } };
})(this);
