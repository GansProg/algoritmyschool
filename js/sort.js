/* «Сортировочный цех»: ручная сортировка с лимитом ходов и показ алгоритмов. */
(function (root) {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;
  var LEVELS = SortCore.LEVELS;
  var $ = function (id) { return document.getElementById(id); };
  var LAB = -1;
  var state = { idx: 0, boxes: [], moves: 0, sel: null, token: null, labAlgo: 'bubble', marks: {}, cmp: 0, swaps: 0, demo: false };

  function level() { return state.idx === LAB ? null : LEVELS[state.idx]; }
  function mode() { return state.idx === LAB ? state.labAlgo : level().mode; }
  function weights() { return state.boxes.map(function (b) { return b.w; }); }

  function setStatus(text, cls) {
    var s = $('s-status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  function renderBelt(anim) {
    var belt = $('s-belt');
    belt.innerHTML = '';
    var manual = !state.demo && state.idx !== LAB;
    var bubbleManual = manual && mode() === 'bubble';
    state.boxes.forEach(function (b, i) {
      var cls = 'crate';
      if (state.sel === i) cls += ' sel';
      if (state.marks.cmp && state.marks.cmp.indexOf(i) >= 0) cls += ' cmp';
      if (state.marks.min === i) cls += ' min';
      if (state.marks.done && state.marks.done(i)) cls += ' done';
      if (anim && anim[0] === i) cls += ' swap-r';
      if (anim && anim[1] === i) cls += ' swap-l';
      var pickable = manual && mode() === 'select';
      var crate = el('button', {
        class: cls, type: 'button', style: 'height:' + (34 + b.w * 10) + 'px' + (pickable ? '' : ';cursor:default'),
        'aria-label': 'Ящик ' + b.w + ' кг, позиция ' + i,
        tabindex: pickable ? null : '-1',
        onclick: function () { pickBox(i); }
      }, String(b.w), el('small', { text: 'кг' }));
      belt.appendChild(el('div', { class: 'slot-col' }, crate, el('span', { class: 'pos', text: 'a[' + i + ']' })));
      if (i < state.boxes.length - 1) {
        if (bubbleManual) {
          belt.appendChild(el('button', {
            class: 'gap-btn', type: 'button', title: 'Поменять соседей',
            'aria-label': 'Поменять ящики ' + i + ' и ' + (i + 1),
            onclick: function () { swapMove(i, i + 1); }
          }, '⇄'));
        } else {
          belt.appendChild(el('span', { class: 'gap-spacer' }));
        }
      }
    });
  }

  function counter(label, value, over) {
    return el('div', { class: 'counter' }, el('b', { class: over ? 'over' : '', text: String(value) }), label);
  }

  function renderCounters() {
    var c = $('s-counters');
    c.innerHTML = '';
    if (state.demo || state.idx === LAB) {
      c.appendChild(counter('сравнений', state.cmp));
      c.appendChild(counter('обменов', state.swaps));
      c.appendChild(counter('ящиков', state.boxes.length));
    } else {
      var lim = SortCore.limitFor(level());
      c.appendChild(counter('ходов сделано', state.moves, state.moves > lim));
      c.appendChild(counter('минимум ходов', lim));
      c.appendChild(counter('осталось до «5»', Math.max(0, lim - state.moves)));
    }
  }

  function renderPseudo(line) {
    var p = $('s-pseudo');
    p.innerHTML = '';
    SortCore.PSEUDO[mode()].forEach(function (l, i) {
      p.appendChild(el('li', { class: i === line ? 'cur' : '', text: l }));
    });
    $('s-algo-name').textContent = mode() === 'bubble' ? 'Сортировка пузырьком' : 'Сортировка выбором';
    $('s-algo-note').textContent = mode() === 'bubble'
      ? 'Тяжёлый ящик за один проход «всплывает» в конец, как пузырёк. Меняются только соседи, поэтому обменов столько же, сколько пар стоит не по порядку.'
      : 'На каждом проходе ищем самый лёгкий ящик и одним обменом ставим его на место. Обменов не больше n − 1, но сравнений всё равно много.';
  }

  function renderControls() {
    var c = $('s-controls');
    c.innerHTML = '';
    var speed = el('label', { class: 'speed' }, 'Скорость ', el('input', { type: 'range', id: 's-speed', min: '1', max: '5', value: String(Store.get('sort:speed', 3)), oninput: function () { Store.set('sort:speed', +this.value); } }));
    if (state.idx === LAB) {
      var sel = el('select', { id: 's-algo', class: 'btn', 'aria-label': 'Алгоритм', onchange: function () { state.labAlgo = this.value; resetLab(false); } },
        el('option', { value: 'bubble', selected: state.labAlgo === 'bubble' }, 'Пузырёк'),
        el('option', { value: 'select', selected: state.labAlgo === 'select' }, 'Выбор'));
      c.appendChild(el('button', { class: 'btn primary', type: 'button', id: 's-play', onclick: togglePlay }, state.token ? '■ Стоп' : '▶ Запуск'));
      c.appendChild(sel);
      c.appendChild(el('button', { class: 'btn', type: 'button', onclick: function () { resetLab(true); } }, 'Перемешать'));
      c.appendChild(speed);
    } else {
      c.appendChild(el('button', { class: 'btn', type: 'button', onclick: function () { loadLevel(state.idx); } }, 'Начать заново'));
      c.appendChild(el('button', { class: 'btn ghost', type: 'button', id: 's-play', onclick: togglePlay }, state.token ? '■ Стоп' : 'Показать, как сделает алгоритм'));
      c.appendChild(speed);
    }
  }

  function renderLevels() {
    var box = $('s-levels');
    Common.levelButtons(box, LEVELS, 'sort', state.idx, loadLevel, function (lv, i) { return String(i + 1); });
    box.appendChild(el('button', {
      class: 'lvl wide', type: 'button', 'aria-current': state.idx === LAB ? 'true' : 'false',
      onclick: function () { loadLab(); }
    }, 'Лаборатория'));
  }

  function renderTask() {
    var t = $('s-task');
    t.innerHTML = '';
    if (state.idx === LAB) {
      t.appendChild(el('div', null,
        el('p', { class: 'task-topic', text: 'Лаборатория' }),
        el('h3', { text: 'Сравни алгоритмы' }),
        el('p', { text: 'Запусти пузырёк и выбор на одном и том же наборе. Следи за счётчиками: какой алгоритм делает меньше обменов? А сравнений?' })));
      return;
    }
    var lv = level(), i = state.idx;
    t.appendChild(el('div', null,
      el('p', { class: 'task-topic', text: 'Уровень ' + (i + 1) + ' · ' + (lv.mode === 'bubble' ? 'обмен соседей' : 'обмен любых двух') }),
      el('h3', { text: lv.title }),
      el('p', { text: lv.text })));
  }

  function renderAll(anim, line) {
    renderBelt(anim);
    renderCounters();
    renderPseudo(line);
    renderControls();
  }

  function makeBoxes(ws) { return ws.map(function (w, i) { return { w: w, id: i }; }); }

  function loadLevel(i) {
    stopDemo();
    state.idx = i;
    Store.set('sort:level', i);
    state.boxes = makeBoxes(level().weights);
    state.moves = 0; state.sel = null; state.marks = {}; state.demo = false;
    state.cmp = 0; state.swaps = 0;
    Common.clearStamp($('s-belt').parentNode.parentNode);
    setStatus(level().mode === 'bubble' ? 'Нажимай ⇄ между ящиками, чтобы поменять соседей.' : 'Нажми на ящик, потом на второй, и кран поменяет их местами.', '');
    renderLevels(); renderTask(); renderAll();
  }

  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(2 + i * 2);
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }

  function loadLab() {
    stopDemo();
    state.idx = LAB;
    state.labSeed = shuffled(8);
    resetLab(false);
    renderLevels(); renderTask();
  }

  function resetLab(reshuffle) {
    stopDemo();
    if (reshuffle) state.labSeed = shuffled(8);
    state.boxes = makeBoxes(state.labSeed);
    state.cmp = 0; state.swaps = 0; state.marks = {}; state.sel = null;
    Common.clearStamp($('s-belt').parentNode.parentNode);
    setStatus('Нажми «Запуск». Набор ящиков тот же, пока не нажмёшь «Перемешать».', '');
    renderAll();
  }

  function swap(i, j) {
    var t = state.boxes[i]; state.boxes[i] = state.boxes[j]; state.boxes[j] = t;
  }

  function swapMove(i, j) {
    if (state.token) return;
    var lv = level(), lim = SortCore.limitFor(lv);
    if (state.moves >= lim + 4) { setStatus('Ходы закончились. Нажми «Начать заново».', 'err'); return; }
    var wasted = lv.mode === 'bubble' && state.boxes[i].w < state.boxes[j].w;
    swap(i, j);
    state.moves++;
    state.sel = null;
    renderAll([Math.min(i, j), Math.max(i, j)]);
    if (SortCore.isSorted(weights())) {
      var grade = state.moves <= lim ? 5 : state.moves <= lim + 2 ? 4 : 3;
      Grades.set('sort', lv.id, grade);
      Common.stamp($('s-belt').parentNode.parentNode, grade);
      state.marks = { done: function () { return true; } };
      renderBelt();
      setStatus('Готово! Ходов: ' + state.moves + ', минимум: ' + lim + '.' + (grade < 5 ? ' Попробуй уложиться в минимум.' : ''), 'win');
      renderLevels();
    } else if (state.moves >= lim + 4) {
      setStatus('Ходы закончились, а ящики не по порядку. Нажми «Начать заново».', 'err');
    } else if (wasted) {
      setStatus('Эти два ящика уже стояли по порядку, ход потрачен зря.', 'err');
    } else if (state.moves === lim) {
      setStatus('Это был последний ход на «5». Дальше оценка будет ниже.', '');
    } else {
      setStatus('', '');
    }
  }

  function pickBox(i) {
    if (state.token || state.idx === LAB || mode() !== 'select') return;
    if (SortCore.isSorted(weights()) && state.moves) return;
    if (state.sel === null) { state.sel = i; renderBelt(); setStatus('Теперь выбери второй ящик.', ''); return; }
    if (state.sel === i) { state.sel = null; renderBelt(); setStatus('', ''); return; }
    var a = state.sel;
    state.sel = null;
    swapMove(Math.min(a, i), Math.max(a, i));
  }

  function togglePlay() {
    if (state.token) { stopDemo(); renderControls(); setStatus('Остановлено.', ''); } else playDemo();
  }

  function stopDemo() {
    if (state.token) state.token.cancelled = true;
    state.token = null;
  }

  function playDemo() {
    stopDemo();
    var m = mode();
    if (state.idx !== LAB) {
      state.boxes = makeBoxes(level().weights);
      state.moves = 0;
      Common.clearStamp($('s-belt').parentNode.parentNode);
    } else {
      state.boxes = makeBoxes(state.labSeed);
    }
    state.demo = true;
    state.cmp = 0; state.swaps = 0; state.marks = {}; state.sel = null;
    var token = { cancelled: false };
    state.token = token;
    var st = SortCore.steps(m, weights());
    var n = state.boxes.length;
    var doneFrom = m === 'bubble' ? n : -1;
    renderAll();
    setStatus('Алгоритм работает. Жёлтая строка справа показывает, что он делает.', '');
    var k = 0;
    (function next() {
      if (token.cancelled) return;
      if (k >= st.length) {
        state.token = null;
        state.marks = { done: function () { return true; } };
        renderAll();
        setStatus('Готово: сравнений ' + state.cmp + ', обменов ' + state.swaps + '.' + (state.idx !== LAB ? ' Теперь попробуй сам, кнопка «Начать заново».' : ''), 'win');
        return;
      }
      var s = st[k++], anim = null;
      if (s.cmp) state.cmp++;
      if (s.swap) { swap(s.swap[0], s.swap[1]); state.swaps++; anim = [Math.min(s.swap[0], s.swap[1]), Math.max(s.swap[0], s.swap[1])]; }
      if (s.done != null) {
        if (m === 'bubble') doneFrom = Math.min(doneFrom, s.done);
        else doneFrom = Math.max(doneFrom, s.done);
      }
      var df = doneFrom;
      state.marks = {
        cmp: s.cmp, min: s.min,
        done: m === 'bubble' ? function (i) { return i >= df; } : function (i) { return i <= df; }
      };
      renderBelt(anim);
      renderCounters();
      renderPseudo(s.line);
      var d = Common.delayFor($('s-speed'));
      Common.wait(d * 1.4, token).then(next, function () {});
    })();
    renderControls();
  }

  function init() {
    loadLevel(Math.min(Store.get('sort:level', 0), LEVELS.length - 1));
  }

  root.SortGame = { init: init, leave: stopDemo, refresh: renderLevels };
})(this);
