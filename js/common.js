/* Общие помощники: хранилище, оценки, построение DOM, «печать» оценки красной ручкой. */
(function (root) {
  'use strict';

  var Store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem('algo:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('algo:' + key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
    }
  };

  // Оценки по уровням: { robot: { c1: 5 }, ... }. Хранится лучшая.
  var Grades = {
    all: function () { return Store.get('grades', {}); },
    get: function (game, id) { var g = this.all()[game] || {}; return g[id] || 0; },
    set: function (game, id, grade) {
      var all = this.all();
      all[game] = all[game] || {};
      if (!all[game][id] || all[game][id] < grade) all[game][id] = grade;
      Store.set('grades', all);
      return all[game][id];
    }
  };

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) node.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function stamp(container, grade, comment) {
    var old = container.querySelector('.stamp');
    if (old) old.remove();
    var list = I18n.t('stamp.' + (grade >= 3 && grade <= 5 ? grade : 3));
    var s = el('div', { class: 'stamp', 'aria-hidden': 'true' },
      el('span', { class: 'grade', text: String(grade) }),
      el('span', { class: 'comment', text: comment || list[Math.floor(Math.random() * list.length)] }));
    container.appendChild(s);
    return s;
  }
  function clearStamp(container) {
    var old = container.querySelector('.stamp');
    if (old) old.remove();
  }

  // Пауза, которую можно прервать токеном { cancelled: true }
  function wait(ms, token) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () { token && token.cancelled ? reject('cancelled') : resolve(); }, ms);
    });
  }
  function delayFor(input) {
    var v = +input.value;
    return [0, 620, 400, 250, 130, 50][v] || 250;
  }

  function levelButtons(container, levels, game, current, onPick, labelFn) {
    container.innerHTML = '';
    levels.forEach(function (lv, i) {
      var g = Grades.get(game, lv.id);
      var title = I18n.pick(lv.title);
      var b = el('button', {
        class: 'lvl', type: 'button', title: title,
        'aria-current': i === current ? 'true' : 'false',
        'aria-label': I18n.t('level.aria', { n: i + 1, t: title }) + (g ? I18n.t('level.grade', { g: g }) : ''),
        onclick: function () { onPick(i); }
      }, labelFn ? labelFn(lv, i) : String(i + 1), g ? el('span', { class: 'mark', text: String(g) }) : null);
      container.appendChild(b);
    });
  }

  // На узком экране поле и программа стоят друг под другом: после запуска прокручиваем к результату
  function revealOnPhone(node) {
    if (!node || !window.matchMedia('(max-width: 920px)').matches) return;
    var r = node.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }

  root.Common = { Store: Store, revealOnPhone: revealOnPhone, Grades: Grades, el: el, stamp: stamp, clearStamp: clearStamp, wait: wait, delayFor: delayFor, levelButtons: levelButtons };
})(this);
