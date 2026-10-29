/* Клетчатый мир робота: карта, движение, датчики и запись шагов.
   Сообщения — ключи перевода (w.bump и т. п.), текст подставляет интерфейс.
   Общий для «Робота-курьера» и «Баг-хантера». Работает и в браузере, и в node (для тестов). */
(function (root) {
  'use strict';

  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var DIR_NAMES = ['север', 'восток', 'юг', 'запад'];
  var SIDE_TURN = { ahead: 0, right: 1, left: 3 };

  // Легенда карты: '#' стена, '.' пол, 'H' пункт доставки, 'p' посылка, 'S' старт
  function parseMap(rows) {
    var h = rows.length, w = rows[0].length;
    var walls = {}, parcels = [], target = null, start = null;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var c = rows[y][x];
        if (c === '#') walls[x + ',' + y] = true;
        else if (c === 'H') target = { x: x, y: y };
        else if (c === 'p') parcels.push({ x: x, y: y });
        else if (c === 'S') start = { x: x, y: y };
      }
    }
    return { w: w, h: h, walls: walls, parcels: parcels, target: target, start: start };
  }

  function Stop(kind, message) {
    this.kind = kind;
    this.message = message;
  }

  function Robot(level, opts) {
    opts = opts || {};
    this.map = parseMap(level.map);
    var s = level.start || {};
    var ms = this.map.start || { x: 0, y: 0 };
    this.x = s.x != null ? s.x : ms.x;
    this.y = s.y != null ? s.y : ms.y;
    this.d = s.d != null ? s.d : 1;
    this.left = {};
    this.map.parcels.forEach(function (p) { this.left[p.x + ',' + p.y] = true; }, this);
    this.parcelsLeft = this.map.parcels.length;
    this.frames = [];
    this.path = [{ x: this.x, y: this.y }];
    this.moves = 0;
    this.ticks = 0;
    this.maxTicks = opts.maxTicks || 600;
    this.ref = null;
    this.vars = null;
  }

  Robot.prototype.isWall = function (x, y) {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return true;
    return !!this.map.walls[x + ',' + y];
  };

  Robot.prototype.tick = function () {
    if (++this.ticks > this.maxTicks) {
      throw new Stop('limit', 'w.limit');
    }
  };

  Robot.prototype.record = function (kind, extra) {
    var f = { kind: kind, x: this.x, y: this.y, d: this.d, ref: this.ref, picked: this.map.parcels.length - this.parcelsLeft };
    if (this.vars) f.vars = Object.assign({}, this.vars);
    if (extra) Object.assign(f, extra);
    this.frames.push(f);
  };

  Robot.prototype.forward = function () {
    this.tick();
    var nx = this.x + DX[this.d], ny = this.y + DY[this.d];
    if (this.isWall(nx, ny)) {
      this.record('bump', { bx: nx, by: ny });
      throw new Stop('bump', 'w.bump');
    }
    this.x = nx; this.y = ny; this.moves++;
    this.path.push({ x: nx, y: ny });
    var key = nx + ',' + ny, picked = false;
    if (this.left[key]) { delete this.left[key]; this.parcelsLeft--; picked = true; }
    this.record('move', picked ? { pick: key } : null);
    var t = this.map.target;
    if (t && t.x === nx && t.y === ny && this.parcelsLeft === 0) {
      throw new Stop('done', 'w.done');
    }
  };

  Robot.prototype.turn = function (side) {
    this.tick();
    this.d = (this.d + (side === 'right' ? 1 : 3)) % 4;
    this.record('turn');
  };

  Robot.prototype.sense = function (side) {
    this.tick();
    var d = (this.d + SIDE_TURN[side]) % 4;
    var res = this.isWall(this.x + DX[d], this.y + DY[d]);
    this.record('check', { side: side, result: res });
    return res;
  };

  Robot.prototype.atTarget = function () {
    this.tick();
    var t = this.map.target;
    var res = !!t && t.x === this.x && t.y === this.y;
    this.record('check', { side: 'target', result: res });
    return res;
  };

  // Запускает fn(robot) и возвращает итог прогона
  function simulate(level, fn, opts) {
    var r = new Robot(level, opts);
    var outcome = { kind: 'end', message: '' };
    try {
      fn(r);
      if (r.parcelsLeft > 0 && r.map.parcels.length) {
        outcome = { kind: 'end', message: 'w.parcels' };
      } else {
        outcome = { kind: 'end', message: 'w.target' };
      }
    } catch (e) {
      if (e instanceof Stop) outcome = { kind: e.kind, message: e.message };
      else throw e;
    }
    outcome.frames = r.frames;
    outcome.path = r.path;
    outcome.moves = r.moves;
    outcome.robot = r;
    return outcome;
  }

  var api = { DX: DX, DY: DY, DIR_NAMES: DIR_NAMES, parseMap: parseMap, Robot: Robot, Stop: Stop, simulate: simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.World = api;
})(this);
