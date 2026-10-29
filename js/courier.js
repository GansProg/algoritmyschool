/* «Робот-курьер»: сборка программы из блоков и анимация. */
(function (root) {
  'use strict';
  var el = Common.el, Store = Common.Store, Grades = Common.Grades;
  var LEVELS = CourierCore.LEVELS;

  var BLOCKS = {
    fwd: { label: 'c.fwd', cls: '', icon: '<path d="M8 13V3M4 7l4-4 4 4"/>' },
    left: { label: 'c.left', cls: '', icon: '<path d="M12 13V8a3 3 0 0 0-3-3H3M6 2 3 5l3 3"/>' },
    right: { label: 'c.right', cls: '', icon: '<path d="M4 13V8a3 3 0 0 1 3-3h6M10 2l3 3-3 3"/>' },
    repeat: { label: 'c.repeat', cls: 'loop', icon: '<path d="M3 8a5 5 0 0 1 9-3M13 8a5 5 0 0 1-9 3M12 2v3H9M4 14v-3h3"/>' },
    ifwall: { label: 'c.ifwall', cls: 'cond', icon: '<path d="M8 2 14 8 8 14 2 8Z"/>' }
  };
  var SIDES = ['ahead', 'right', 'left'];

  var $ = function (id) { return document.getElementById(id); };
  var state = { idx: 0, prog: [], slot: null, nextId: 1, token: null, field: null };

  function icon(path) {
    return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function level() { return LEVELS[state.idx]; }

  // Строка перевода с местами {x} под элементы: порядок слов в казахском и русском разный
  function tmpl(key, nodes) {
    return I18n.t(key).split(/\{(\w+)\}/).map(function (part, i) {
      return i % 2 ? nodes[part] : (part.trim() ? el('span', { text: part.trim() }) : null);
    });
  }

  function save() { Store.set('courier:' + level().id, state.prog); }

  function maxId(nodes) {
    var m = 0;
    nodes.forEach(function (n) {
      m = Math.max(m, n.id, maxId(n.body || []), maxId(n.else || []));
    });
    return m;
  }

  function findList(slot) {
    if (!slot) return state.prog;
    var n = findNode(state.prog, slot.id);
    return n ? n[slot.branch] : state.prog;
  }
  function findNode(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
      var f = findNode(nodes[i].body || [], id) || findNode(nodes[i].else || [], id);
      if (f) return f;
    }
    return null;
  }
  function removeNode(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
      if (removeNode(nodes[i].body || [], id) || removeNode(nodes[i].else || [], id)) return true;
    }
    return false;
  }

  function add(type) {
    if (state.token) return;
    var n = { id: state.nextId++, type: type };
    if (type === 'repeat') { n.n = 3; n.body = []; }
    if (type === 'ifwall') { n.side = 'ahead'; n.body = []; n.else = []; }
    findList(state.slot).push(n);
    if (n.body) state.slot = { id: n.id, branch: 'body' };
    save();
    renderProgram();
  }

  function slotEl(list, owner, branch) {
    var ol = el('ol', { class: owner ? 'slot' : 'prog' });
    list.forEach(function (n) { ol.appendChild(blockEl(n)); });
    var isActive = owner ? (state.slot && state.slot.id === owner && state.slot.branch === branch) : !state.slot;
    var label = I18n.t(isActive ? 'c.slot.active' : (owner ? 'c.slot.here' : 'c.slot.end'));
    ol.appendChild(el('li', null, el('button', {
      class: 'slot-add' + (isActive ? ' active' : ''), type: 'button',
      onclick: function () { state.slot = owner ? { id: owner, branch: branch } : null; renderProgram(); }
    }, label)));
    return ol;
  }

  function xBtn(n) {
    return el('button', {
      class: 'x', type: 'button', 'aria-label': I18n.t('c.delete'),
      onclick: function () {
        if (state.token) return;
        removeNode(state.prog, n.id);
        if (state.slot && !findNode(state.prog, state.slot.id)) state.slot = null;
        save(); renderProgram();
      }
    }, '×');
  }

  function blockEl(n) {
    var li;
    if (n.type === 'repeat') {
      var num = el('input', {
        type: 'number', min: '1', max: '200', value: String(n.n), 'aria-label': I18n.t('c.times.aria'),
        oninput: function () { var v = Math.max(1, Math.min(200, parseInt(this.value, 10) || 1)); n.n = v; save(); }
      });
      li = el('li', { class: 'blk blk-loop', 'data-id': n.id },
        el('div', { class: 'blk-row' }, tmpl('c.repeat.row', { n: num }), xBtn(n)),
        slotEl(n.body, n.id, 'body'));
    } else if (n.type === 'ifwall') {
      var sel = el('select', {
        'aria-label': I18n.t('c.side.aria'),
        onchange: function () { n.side = this.value; save(); }
      });
      SIDES.forEach(function (s) { sel.appendChild(el('option', { value: s, selected: n.side === s }, I18n.t('c.side.' + s))); });
      li = el('li', { class: 'blk blk-cond', 'data-id': n.id },
        el('div', { class: 'blk-row' }, tmpl('c.if.row', { s: sel }), xBtn(n)),
        slotEl(n.body, n.id, 'body'),
        el('div', { class: 'blk-row else-row' }, I18n.t('c.else')),
        slotEl(n.else, n.id, 'else'));
    } else {
      var b = BLOCKS[n.type];
      li = el('li', { class: 'blk blk-move', 'data-id': n.id },
        el('div', { class: 'blk-row' }, el('span', { class: 'pal-ico', html: icon(b.icon), style: 'width:16px;height:16px;display:inline-flex' }), I18n.t(b.label), xBtn(n)));
    }
    return li;
  }

  function renderProgram() {
    var area = $('c-program');
    area.innerHTML = '';
    area.appendChild(slotEl(state.prog, null));
    var c = CourierCore.count(state.prog), lv = level();
    var cnt = $('c-count');
    cnt.textContent = I18n.t(lv.limit ? 'c.count.limit' : 'c.count', { c: c, l: lv.limit });
    cnt.className = lv.limit && c > lv.limit ? 'over' : '';
  }

  function renderPalette() {
    var p = $('c-palette');
    p.innerHTML = '';
    level().blocks.forEach(function (t) {
      var b = BLOCKS[t];
      p.appendChild(el('button', { class: 'pal ' + b.cls, type: 'button', html: icon(b.icon) + I18n.t(b.label), onclick: function () { add(t); } }));
    });
  }

  function renderLevels() {
    Common.levelButtons($('c-levels'), LEVELS, 'robot', state.idx, function (i) { loadLevel(i); });
  }

  function loadLevel(i) {
    stop();
    state.idx = i;
    Store.set('courier:level', i);
    var lv = level();
    state.prog = Store.get('courier:' + lv.id, []);
    state.nextId = maxId(state.prog) + 1;
    state.slot = null;
    $('c-task').innerHTML = '';
    $('c-task').appendChild(el('div', null,
      el('p', { class: 'task-topic', text: I18n.t('c.topic', { n: i + 1, t: I18n.pick(lv.topic) }) }),
      el('h3', { text: I18n.pick(lv.title) }),
      el('p', { text: I18n.pick(lv.text) })));
    state.field.load(lv);
    setStatus('', '');
    renderLevels();
    renderPalette();
    renderProgram();
  }

  function setStatus(text, cls) {
    var s = $('c-status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  function highlight(id) {
    var old = document.querySelectorAll('#c-program .running');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('running');
    if (id == null) return;
    var b = document.querySelector('#c-program [data-id="' + id + '"]');
    if (b) b.classList.add('running');
  }

  function stop() {
    if (state.token) state.token.cancelled = true;
    state.token = null;
    $('c-run').disabled = false;
    $('c-stop').disabled = true;
    highlight(null);
  }

  function run() {
    stop();
    var lv = level();
    if (!state.prog.length) { setStatus(I18n.t('c.empty'), 'err'); return; }
    state.field.reset();
    var out = CourierCore.run(lv, state.prog);
    var token = { cancelled: false };
    state.token = token;
    $('c-run').disabled = true;
    $('c-stop').disabled = false;
    setStatus(I18n.t('c.running'), '');
    var walked = [out.path[0]];
    var i = 0;
    (function step() {
      if (token.cancelled) return;
      if (i >= out.frames.length) return finish(out, token);
      var f = out.frames[i++];
      highlight(f.ref);
      state.field.applyFrame(f);
      if (f.kind === 'move') { walked.push({ x: f.x, y: f.y }); state.field.drawPath(walked, 'walked'); }
      var d = Common.delayFor($('c-speed'));
      Common.wait(f.kind === 'check' ? d * 0.6 : d, token).then(step, function () {});
    })();
  }

  function finish(out, token) {
    if (token.cancelled) return;
    stop();
    var lv = level(), c = CourierCore.count(state.prog);
    if (out.kind === 'done') {
      if (lv.limit && c > lv.limit) {
        setStatus(I18n.t('c.overLimit', { c: c, l: lv.limit }), 'err');
        return;
      }
      var grade = c <= lv.best ? 5 : c <= lv.best + 2 ? 4 : 3;
      Grades.set('robot', lv.id, grade);
      Common.stamp(state.field.container, grade);
      var msg = I18n.t('c.win', { c: c });
      if (grade < 5) msg += I18n.t('c.win.best', { b: lv.best });
      if (state.idx < LEVELS.length - 1) msg += I18n.t('c.win.next', { n: state.idx + 2 });
      setStatus(msg, 'win');
      renderLevels();
    } else {
      setStatus(I18n.t(out.message), 'err');
    }
  }

  function init() {
    state.field = new Field($('c-field'));
    $('c-run').addEventListener('click', run);
    $('c-stop').addEventListener('click', function () { stop(); setStatus(I18n.t('c.stopped'), ''); });
    $('c-clear').addEventListener('click', function () {
      stop(); state.prog = []; state.slot = null; save(); state.field.reset(); setStatus('', ''); renderProgram();
    });
    loadLevel(Math.min(Store.get('courier:level', 0), LEVELS.length - 1));
  }

  root.CourierGame = { init: init, leave: stop, refresh: renderLevels, relang: function () { loadLevel(state.idx); } };
})(this);
