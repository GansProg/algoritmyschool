/* «Баг-хантер»: редактируемый код с ошибкой, призрачный маршрут и пошаговый прогон. */
(function (root) {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;
  var LEVELS = BugsCore.LEVELS;
  var $ = function (id) { return document.getElementById(id); };
  var state = { idx: 0, lines: null, orig: null, hint: false, token: null, field: null };

  function level() { return LEVELS[state.idx]; }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function colorize(s) {
    return esc(s)
      .replace(/\b(for|in|while|if|elif|else|not|pass)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(range|forward|left|right|wall_ahead|wall_right|wall_left|at_target)\b/g, '<span class="fn">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  }

  function changes() {
    var n = 0;
    state.lines.forEach(function (l, i) {
      var o = state.orig[i];
      if (l.indent !== o.indent) n++;
      l.parts.forEach(function (p, j) { if (p.token && p.value !== o.parts[j].value) n++; });
    });
    return n;
  }

  function optionsFor(p) {
    if (p.token === 'n') { var a = []; for (var i = 0; i <= 15; i++) a.push(String(i)); return a; }
    return BugsCore.OPTIONS[p.token];
  }

  function renderCode() {
    var ol = $('b-code');
    ol.innerHTML = '';
    state.lines.forEach(function (l, i) {
      var li = el('li', { 'data-line': i }, el('span', { class: 'ln', text: String(i + 1) }));
      var ind = el('span', { class: 'ind' });
      if (l.indentEditable) {
        ind.appendChild(el('button', { type: 'button', 'aria-label': I18n.t('b.unindent.aria', { n: i + 1 }), title: I18n.t('b.unindent'), onclick: function () { if (l.indent > 0) { l.indent--; changed(); } } }, '⇤'));
        ind.appendChild(el('button', { type: 'button', 'aria-label': I18n.t('b.indent.aria', { n: i + 1 }), title: I18n.t('b.indent'), onclick: function () { if (l.indent < 3) { l.indent++; changed(); } } }, '⇥'));
      }
      li.appendChild(ind);
      if (l.indent) li.appendChild(el('span', { class: 'pad', text: '    '.repeat(l.indent) }));
      l.parts.forEach(function (p, j) {
        if (p.text != null) {
          li.appendChild(el('span', { html: colorize(p.text) }));
        } else {
          var sel = el('select', {
            class: 'tok' + (p.value !== state.orig[i].parts[j].value ? ' changed' : ''),
            'aria-label': I18n.t('b.tok.aria', { n: i + 1 }),
            onchange: function () { p.value = this.value; changed(); }
          });
          optionsFor(p).forEach(function (o) { sel.appendChild(el('option', { value: o, selected: o === p.value }, o)); });
          li.appendChild(sel);
        }
      });
      ol.appendChild(li);
    });
    var c = changes(), lv = level();
    var cnt = $('b-count');
    cnt.textContent = I18n.t('b.count', { c: c, f: lv.fixes });
    cnt.className = c > lv.fixes ? 'over' : '';
    if (state.hint) markHint();
  }

  function changed() {
    stop();
    state.field.reset();
    state.field.drawPath(state.ghost, 'ghost');
    renderCode();
    $('b-watch').textContent = '';
    var c = changes(), lv = level();
    if (c > lv.fixes) setStatus(I18n.t('b.tooMany', { f: lv.fixes }), 'err');
    else setStatus('', '');
  }

  function markHint() {
    var lv = level();
    var cur = BugsCore.render(state.orig);
    for (var i = 0; i < cur.length; i++) {
      if (cur[i] !== lv.fixed[i]) {
        var li = document.querySelector('#b-code li[data-line="' + i + '"]');
        if (li) li.classList.add('hint');
        return i;
      }
    }
    return -1;
  }

  function renderLevels() {
    Common.levelButtons($('b-levels'), LEVELS, 'bugs', state.idx, loadLevel);
  }

  function loadLevel(i) {
    stop();
    state.idx = i;
    Store.set('bugs:level', i);
    var lv = level();
    state.orig = BugsCore.template(lv);
    state.lines = BugsCore.template(lv);
    state.hint = false;
    $('b-task').innerHTML = '';
    $('b-task').appendChild(el('div', null,
      el('p', { class: 'task-topic', text: I18n.t(lv.fixes === 1 ? 'b.topic1' : 'b.topicN', { n: i + 1, f: lv.fixes }) }),
      el('h3', { text: I18n.pick(lv.title) }),
      el('p', { text: I18n.pick(lv.text) })));
    state.field.load(lv);
    state.ghost = BugsCore.run(lv, lv.fixed).path;
    state.field.drawPath(state.ghost, 'ghost');
    $('b-watch').textContent = '';
    setStatus(I18n.t('b.start'), '');
    renderLevels();
    renderCode();
  }

  function setStatus(text, cls) {
    var s = $('b-status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  function highlight(line, cls) {
    var old = document.querySelectorAll('#b-code li.' + cls);
    for (var i = 0; i < old.length; i++) old[i].classList.remove(cls);
    if (line == null) return;
    var li = document.querySelector('#b-code li[data-line="' + line + '"]');
    if (li) li.classList.add(cls);
  }

  function showVars(v) {
    var w = $('b-watch');
    if (!v || !Object.keys(v).length) { w.textContent = ''; return; }
    w.innerHTML = I18n.t('b.vars') + Object.keys(v).map(function (k) { return '<b>' + k + ' = ' + v[k] + '</b>'; }).join(', ');
  }

  function stop() {
    if (state.token) state.token.cancelled = true;
    state.token = null;
    $('b-run').disabled = false;
    highlight(null, 'cur');
  }

  function run() {
    stop();
    var lv = level();
    highlight(null, 'err');
    state.field.reset();
    state.field.drawPath(state.ghost, 'ghost');
    var out = BugsCore.run(lv, BugsCore.render(state.lines));
    if (out.kind === 'syntax') {
      highlight(out.line, 'err');
      setStatus(I18n.t('b.syntax', { n: out.line + 1, m: I18n.t(out.message, { x: out.arg }) }), 'err');
      return;
    }
    var token = { cancelled: false };
    state.token = token;
    $('b-run').disabled = true;
    setStatus(I18n.t('b.running'), '');
    Common.revealOnPhone(state.field.container);
    var walked = [out.path[0]], i = 0;
    (function step() {
      if (token.cancelled) return;
      if (i >= out.frames.length) return finish(out, token);
      var f = out.frames[i++];
      highlight(f.ref, 'cur');
      showVars(f.vars);
      state.field.applyFrame(f);
      if (f.kind === 'move') { walked.push({ x: f.x, y: f.y }); state.field.drawPath(walked, 'actual'); }
      var d = Common.delayFor($('b-speed'));
      Common.wait(f.kind === 'check' ? d * 0.6 : d, token).then(step, function () {});
    })();
  }

  function finish(out, token) {
    if (token.cancelled) return;
    stop();
    var lv = level(), c = changes();
    if (out.kind === 'done') {
      if (c > lv.fixes) {
        setStatus(I18n.t('b.winOver', { c: c, f: lv.fixes }), 'err');
        return;
      }
      if (c === 0) { setStatus(I18n.t('b.zero'), ''); return; }
      var grade = state.hint ? 4 : 5;
      Grades.set('bugs', lv.id, grade);
      Common.stamp(state.field.container, grade, I18n.t(state.hint ? 'b.stamp.hint' : 'b.stamp.win'));
      setStatus(I18n.t('b.win') + I18n.t(state.idx < LEVELS.length - 1 ? 'b.win.next' : 'b.win.last'), 'win');
      renderLevels();
    } else {
      setStatus(I18n.t(out.message) + (c === 0 ? I18n.t('b.failHint') : ''), 'err');
    }
  }

  function init() {
    state.field = new Field($('b-field'));
    $('b-run').addEventListener('click', run);
    $('b-reset').addEventListener('click', function () { state.lines = BugsCore.template(level()); changed(); });
    $('b-hint').addEventListener('click', function () {
      state.hint = true;
      var line = markHint();
      setStatus(I18n.t('b.hintMsg', { n: line + 1 }), '');
    });
    loadLevel(Math.min(Store.get('bugs:level', 0), LEVELS.length - 1));
  }

  root.BugsGame = {
    init: init, leave: stop, refresh: renderLevels,
    // Смена языка не сбрасывает правки ученика
    relang: function () {
      var lines = state.lines, hint = state.hint;
      loadLevel(state.idx);
      state.lines = lines; state.hint = hint;
      renderCode();
    }
  };
})(this);
