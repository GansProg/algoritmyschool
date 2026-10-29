/* Отрисовка клетчатого поля, робота и следа. */
(function (root) {
  'use strict';
  var el = Common.el;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var ROBOT_SVG =
    '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<rect x="3" y="8" width="7" height="24" rx="2.5" fill="var(--graphite)"/>' +
    '<rect x="30" y="8" width="7" height="24" rx="2.5" fill="var(--graphite)"/>' +
    '<rect x="8" y="5" width="24" height="30" rx="6" fill="var(--ink)" stroke="var(--graphite)" stroke-width="1.5"/>' +
    '<rect x="12" y="8" width="16" height="7" rx="3.5" fill="var(--marker)" stroke="var(--graphite)" stroke-width="1.2"/>' +
    '<circle cx="16.5" cy="11.5" r="1.6" fill="var(--graphite)"/><circle cx="23.5" cy="11.5" r="1.6" fill="var(--graphite)"/>' +
    '<rect x="12.5" y="19" width="15" height="12" rx="1.5" fill="var(--box)" stroke="var(--box-dark)" stroke-width="1.2"/>' +
    '<path d="M20 19v12M12.5 24h15" stroke="var(--box-dark)" stroke-width="1.2"/>' +
    '</svg>';

  var HOUSE_SVG =
    '<svg class="icon" viewBox="0 0 40 40" aria-hidden="true">' +
    '<path d="M6 19 L20 6 L34 19" fill="none" stroke="var(--redpen)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M10 17 V34 H30 V17" fill="var(--surface)" stroke="var(--redpen)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="17" y="24" width="6" height="10" fill="var(--redpen)"/>' +
    '</svg>';

  var PARCEL_SVG =
    '<svg class="icon parcel" viewBox="0 0 40 40" aria-hidden="true">' +
    '<rect x="7" y="11" width="26" height="22" rx="2" fill="var(--box)" stroke="var(--box-dark)" stroke-width="2"/>' +
    '<path d="M7 18 H33 M20 11 V33" stroke="var(--box-dark)" stroke-width="2"/>' +
    '<path d="M15 11 L20 6 L25 11" fill="none" stroke="var(--box-dark)" stroke-width="2"/>' +
    '</svg>';

  function Field(container) {
    this.container = container;
    this.root = el('div', { class: 'field', role: 'img' });
    container.innerHTML = '';
    container.appendChild(this.root);
  }

  Field.prototype.load = function (level) {
    var map = World.parseMap(level.map);
    this.map = map;
    this.level = level;
    var r = this.root;
    r.innerHTML = '';
    r.style.setProperty('--w', map.w);
    r.style.setProperty('--h', map.h);
    r.setAttribute('aria-label', 'Поле ' + map.w + ' на ' + map.h + ' клеток');
    this.cells = {};
    for (var y = 0; y < map.h; y++) {
      for (var x = 0; x < map.w; x++) {
        var key = x + ',' + y;
        var c = el('div', { class: 'cell' + (map.walls[key] ? ' wall' : '') });
        if (map.target && map.target.x === x && map.target.y === y) c.innerHTML = HOUSE_SVG;
        this.cells[key] = c;
        r.appendChild(c);
      }
    }
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'trail');
    this.svg.setAttribute('viewBox', '0 0 ' + map.w + ' ' + map.h);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    r.appendChild(this.svg);
    this.robot = el('div', { class: 'robot' }, el('div', { class: 'spin', html: ROBOT_SVG }));
    r.appendChild(this.robot);
    this.reset();
  };

  Field.prototype.reset = function () {
    var map = this.map, lv = this.level;
    Object.keys(this.cells).forEach(function (k) {
      this.cells[k].classList.remove('bumped');
      var p = this.cells[k].querySelector('.parcel');
      if (p) p.remove();
    }, this);
    map.parcels.forEach(function (p) {
      this.cells[p.x + ',' + p.y].insertAdjacentHTML('beforeend', PARCEL_SVG);
    }, this);
    var s = lv.start || {}, ms = map.start || { x: 0, y: 0 };
    this.rot = 0;
    this.dir = s.d != null ? s.d : 1;
    this.robot.classList.remove('shake');
    this.place({ x: s.x != null ? s.x : ms.x, y: s.y != null ? s.y : ms.y, d: this.dir }, false);
    this.clearPath('walked');
    this.clearPath('actual');
    Common.clearStamp(this.container);
  };

  // Поворачивает по кратчайшей дуге, чтобы робот не крутился лишний раз
  Field.prototype.place = function (f, animate) {
    var rb = this.robot;
    if (!animate) { rb.style.transition = 'none'; rb.firstChild.style.transition = 'none'; }
    var diff = ((f.d - this.dir) % 4 + 4) % 4;
    if (diff === 3) diff = -1;
    this.rot += diff * 90;
    this.dir = f.d;
    if (!animate && this.rot % 360 !== f.d * 90) this.rot = f.d * 90;
    rb.style.left = (f.x * 100 / this.map.w) + '%';
    rb.style.top = (f.y * 100 / this.map.h) + '%';
    rb.firstChild.style.transform = 'rotate(' + this.rot + 'deg)';
    if (!animate) {
      rb.offsetWidth; // применить без анимации
      rb.style.transition = ''; rb.firstChild.style.transition = '';
    }
  };

  Field.prototype.applyFrame = function (f) {
    this.place(f, true);
    if (f.pick) {
      var p = this.cells[f.pick] && this.cells[f.pick].querySelector('.parcel');
      if (p) p.classList.add('gone');
    }
    if (f.kind === 'bump') {
      var c = this.cells[f.bx + ',' + f.by];
      if (c) c.classList.add('bumped');
      this.robot.classList.remove('shake');
      this.robot.offsetWidth;
      this.robot.classList.add('shake');
    }
  };

  Field.prototype.clearPath = function (cls) {
    var old = this.svg.querySelector('.' + cls);
    if (old) old.remove();
  };

  Field.prototype.drawPath = function (path, cls) {
    this.clearPath(cls);
    if (!path || path.length < 2) return;
    var pl = document.createElementNS(SVGNS, 'polyline');
    pl.setAttribute('class', cls);
    pl.setAttribute('points', path.map(function (p) { return (p.x + 0.5) + ',' + (p.y + 0.5); }).join(' '));
    pl.setAttribute('vector-effect', 'none');
    this.svg.appendChild(pl);
  };

  root.Field = Field;
})(this);
