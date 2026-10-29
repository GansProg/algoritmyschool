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
        'aria-label': I18n.t('s.box.aria', { w: b.w, i: i }),
        tabindex: pickable ? null : '-1',
        onclick: function () { pickBox(i); }
      }, String(b.w), el('small', { text: I18n.t('s.kg') }));
      belt.appendChild(el('div', { class: 'slot-col' }, crate, el('span', { class: 'pos', text: 'a[' + i + ']' })));
      if (i < state.boxes.length - 1) {
        if (bubbleManual) {
          belt.appendChild(el('button', {
            class: 'gap-btn', type: 'button', title: I18n.t('s.swap.title'),
            'aria-label': I18n.t('s.swap.aria', { i: i, j: i + 1 }),
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
      c.appendChild(counter(I18n.t('s.cmp'), state.cmp));
      c.appendChild(counter(I18n.t('s.swaps'), state.swaps));
      c.appendChild(counter(I18n.t('s.boxes'), state.boxes.length));
    } else {
      var lim = SortCore.limitFor(level());
      c.appendChild(counter(I18n.t('s.moves'), state.moves, state.moves > lim));
      c.appendChild(counter(I18n.t('s.min'), lim));
      c.appendChild(counter(I18n.t('s.left'), Math.max(0, lim - state.moves)));
    }
  }

  function renderPseudo(line) {
    var p = $('s-pseudo');
    p.innerHTML = '';
    SortCore.PSEUDO[mode()].forEach(function (l, i) {
      p.appendChild(el('li', { class: i === line ? 'cur' : '', text: I18n.pick(l) }));
    });
    $('s-algo-name').textContent = I18n.t(mode() === 'bubble' ? 's.bubble' : 's.select');
    $('s-algo-note').textContent = I18n.t(mode() === 'bubble' ? 's.note.bubble' : 's.note.select');
  }

  function renderControls() {
    var c = $('s-controls');
    c.innerHTML = '';
    var speed = el('label', { class: 'speed' }, I18n.t('game.speed') + ' ', el('input', { type: 'range', id: 's-speed', min: '1', max: '5', value: String(Store.get('sort:speed', 3)), oninput: function () { Store.set('sort:speed', +this.value); } }));
    if (state.idx === LAB) {
      var sel = el('select', { id: 's-algo', class: 'btn', 'aria-label': I18n.t('s.algo.aria'), onchange: function () { state.labAlgo = this.value; resetLab(false); } },
        el('option', { value: 'bubble', selected: state.labAlgo === 'bubble' }, I18n.t('s.opt.bubble')),
        el('option', { value: 'select', selected: state.labAlgo === 'select' }, I18n.t('s.opt.select')));
      c.appendChild(el('button', { class: 'btn primary', type: 'button', id: 's-play', onclick: togglePlay }, I18n.t(state.token ? 's.stop' : 's.play')));
      c.appendChild(sel);
      c.appendChild(el('button', { class: 'btn', type: 'button', onclick: function () { resetLab(true); } }, I18n.t('s.shuffle')));
      c.appendChild(speed);
    } else {
      c.appendChild(el('button', { class: 'btn', type: 'button', onclick: function () { loadLevel(state.idx); } }, I18n.t('s.restart')));
      c.appendChild(el('button', { class: 'btn ghost', type: 'button', id: 's-play', onclick: togglePlay }, I18n.t(state.token ? 's.stop' : 's.show')));
      c.appendChild(speed);
    }
  }

  function renderLevels() {
    var box = $('s-levels');
    Common.levelButtons(box, LEVELS, 'sort', state.idx, loadLevel, function (lv, i) { return String(i + 1); });
    box.appendChild(el('button', {
      class: 'lvl wide', type: 'button', 'aria-current': state.idx === LAB ? 'true' : 'false',
      onclick: function () { loadLab(); }
    }, I18n.t('s.lab')));
  }

  function renderTask() {
    var t = $('s-task');
    t.innerHTML = '';
    if (state.idx === LAB) {
      t.appendChild(el('div', null,
        el('p', { class: 'task-topic', text: I18n.t('s.lab') }),
        el('h3', { text: I18n.t('s.lab.h') }),
        el('p', { text: I18n.t('s.lab.p') })));
      return;
    }
    var lv = level(), i = state.idx;
    t.appendChild(el('div', null,
      el('p', { class: 'task-topic', text: I18n.t(lv.mode === 'bubble' ? 's.topic.bubble' : 's.topic.select', { n: i + 1 }) }),
      el('h3', { text: I18n.pick(lv.title) }),
      el('p', { text: I18n.pick(lv.text) })));
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
    setStatus(I18n.t(level().mode === 'bubble' ? 's.start.bubble' : 's.start.select'), '');
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
    setStatus(I18n.t('s.start.lab'), '');
    renderAll();
  }

  function swap(i, j) {
    var t = state.boxes[i]; state.boxes[i] = state.boxes[j]; state.boxes[j] = t;
  }

  function swapMove(i, j) {
    if (state.token) return;
    var lv = level(), lim = SortCore.limitFor(lv);
    if (state.moves >= lim + 4) { setStatus(I18n.t('s.noMoves'), 'err'); return; }
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
      setStatus(I18n.t('s.done', { m: state.moves, l: lim }) + (grade < 5 ? I18n.t('s.done.better') : ''), 'win');
      renderLevels();
    } else if (state.moves >= lim + 4) {
      setStatus(I18n.t('s.outOfMoves'), 'err');
    } else if (wasted) {
      setStatus(I18n.t('s.wasted'), 'err');
    } else if (state.moves === lim) {
      setStatus(I18n.t('s.last5'), '');
    } else {
      setStatus('', '');
    }
  }

  function pickBox(i) {
    if (state.token || state.idx === LAB || mode() !== 'select') return;
    if (SortCore.isSorted(weights()) && state.moves) return;
    if (state.sel === null) { state.sel = i; renderBelt(); setStatus(I18n.t('s.second'), ''); return; }
    if (state.sel === i) { state.sel = null; renderBelt(); setStatus('', ''); return; }
    var a = state.sel;
    state.sel = null;
    swapMove(Math.min(a, i), Math.max(a, i));
  }

  function togglePlay() {
    if (state.token) { stopDemo(); renderControls(); setStatus(I18n.t('s.stopped'), ''); } else playDemo();
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
    setStatus(I18n.t('s.algoRun'), '');
    var k = 0;
    (function next() {
      if (token.cancelled) return;
      if (k >= st.length) {
        state.token = null;
        state.marks = { done: function () { return true; } };
        renderAll();
        setStatus(I18n.t('s.demoDone', { c: state.cmp, s: state.swaps }) + (state.idx !== LAB ? I18n.t('s.demoDone.try') : ''), 'win');
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

  root.SortGame = {
    init: init, leave: stopDemo, refresh: renderLevels,
    relang: function () {
      if (state.idx === LAB) { stopDemo(); renderLevels(); renderTask(); resetLab(false); } else loadLevel(state.idx);
    }
  };
})(this);
