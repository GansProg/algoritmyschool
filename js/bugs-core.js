/* «Баг-хантер»: мини-Python для робота, разбор по отступам и уровни с ошибками. */
(function (root) {
  'use strict';
  var World = root.World || (typeof require !== 'undefined' ? require('./world.js') : null);

  var OPTIONS = {
    cmd: ['forward()', 'left()', 'right()'],
    cond: ['wall_ahead()', 'not wall_ahead()', 'wall_right()', 'not wall_right()',
      'wall_left()', 'not wall_left()', 'at_target()', 'not at_target()'],
    kw: ['if', 'while']
  };

  // В строках кода: {n:4} число, {cmd:..} команда, {cond:..} условие, {kw:..} if/while.
  // Строка, начинающаяся с «~», разрешает менять отступ.
  var LEVELS = [
    {
      id: 'b1', fixes: 1,
      title: { kk: 'Басқа жаққа бұрылды', ru: 'Не туда свернул' },
      text: { kk: 'Робот үш торкөз жүріп, үйге қарай бұрылып, жетуі керек. Бірақ ол дуалға тіреліп қалады.', ru: 'Робот должен проехать три клетки, повернуть к дому и доехать. Но он упирается в забор.' },
      map: ['S...', '###.', '###H'], start: { d: 1 },
      code: ['for i in range(3):', '    forward()', '{cmd:left()}', 'for i in range(2):', '    forward()'],
      fixed: ['for i in range(3):', '    forward()', 'right()', 'for i in range(2):', '    forward()']
    },
    {
      id: 'b2', fixes: 1,
      title: { kk: 'Бір қадам қысқа', ru: 'На шаг короче' },
      text: { kk: 'Классикалық «бірге қате». Бұрылысқа дейінгі торкөздерді сана.', ru: 'Классическая ошибка «на единицу». Посчитай клетки до поворота.' },
      map: ['S.....', '#####.', '#####.', '#####H'], start: { d: 1 },
      code: ['for i in range({n:4}):', '    forward()', 'right()', 'for i in range({n:3}):', '    forward()'],
      fixed: ['for i in range(5):', '    forward()', 'right()', 'for i in range(3):', '    forward()']
    },
    {
      id: 'b3', fixes: 1,
      title: { kk: 'Жоғалған шегініс', ru: 'Потерянный отступ' },
      text: { kk: 'Python-да цикл қай командаларды қайталайтынын шегініс шешеді. Бір жол цикл денесінен түсіп қалған. Шегіністі жол жанындағы көрсеткілермен жылжытуға болады.', ru: 'В Python отступ решает, какие команды повторяет цикл. Одна строка выпала из тела цикла. Стрелками у строки можно сдвинуть отступ.' },
      map: ['S.##', '#..#', '##..', '###H'], start: { d: 1 },
      code: ['for step in range(3):', '    forward()', '    right()', '    forward()', '~left()'],
      fixed: ['for step in range(3):', '    forward()', '    right()', '    forward()', '    left()']
    },
    {
      id: 'b4', fixes: 1,
      title: { kk: 'Бәрі керісінше', ru: 'Всё наоборот' },
      text: { kk: 'while циклі шарт ақиқат болғанша денесін қайталайды. Мұнда бірінші цикл бір рет те орындалмады. Неге?', ru: 'Цикл while повторяет тело, пока условие истинно. Здесь первый цикл не сработал ни разу. Почему?' },
      map: ['S....', '####.', '####.', '####H'], start: { d: 1 },
      code: ['while {cond:wall_ahead()}:', '    forward()', 'right()', 'while not wall_ahead():', '    forward()'],
      fixed: ['while not wall_ahead():', '    forward()', 'right()', 'while not wall_ahead():', '    forward()']
    },
    {
      id: 'b5', fixes: 1,
      title: { kk: 'If пе, while ма?', ru: 'If или while?' },
      text: { kk: 'if шартты бір рет тексереді, while шарт дұрыс болғанша қайталайды. Робот небәрі екі торкөз жүрді.', ru: 'if проверяет условие один раз, while повторяет, пока условие верно. Робот проехал всего две клетки.' },
      map: ['####H', '####.', 'S....'], start: { d: 1 },
      code: ['forward()', '{kw:if} not wall_ahead():', '    forward()', 'left()', 'while not at_target():', '    forward()'],
      fixed: ['forward()', 'while not wall_ahead():', '    forward()', 'left()', 'while not at_target():', '    forward()']
    },
    {
      id: 'b6', fixes: 2,
      title: { kk: 'Робот айналып жүр', ru: 'Робот кружится' },
      text: { kk: 'Мұнда екі қате бар. Робот бір орнында айналады, себебі басқа датчикке қарайды. Ал жүре бастағанда, оған қайталау саны жетпейді.', ru: 'Здесь две ошибки. Робот крутится на месте, потому что смотрит не тем датчиком. А когда начнёт ехать, ему не хватит повторов.' },
      map: ['S...', '###.', 'H...'], start: { d: 1 },
      code: ['for i in range({n:6}):', '    if {cond:wall_right()}:', '        right()', '    else:', '        forward()'],
      fixed: ['for i in range(10):', '    if wall_ahead():', '        right()', '    else:', '        forward()']
    },
    {
      id: 'b7', fixes: 2,
      title: { kk: 'Шаршы', ru: 'Квадрат' },
      text: { kk: 'Кварталды айналып, үш сәлемдеме жинап, қоймаға оралу керек. Кірістірілген цикл дерлік дұрыс жазылған.', ru: 'Нужно объехать квартал, собрать три посылки и вернуться на склад. Вложенный цикл написан почти верно.' },
      map: ['H..p', '.##.', '.##.', 'p..p'], start: { x: 0, y: 0, d: 1 },
      code: ['for side in range(4):', '    for step in range({n:2}):', '        forward()', '    {cmd:left()}'],
      fixed: ['for side in range(4):', '    for step in range(3):', '        forward()', '    right()']
    },
    {
      id: 'b8', fixes: 1,
      title: { kk: 'Оң қол', ru: 'Правая рука' },
      text: { kk: 'Лабиринтті оң қабырға бойымен айналып өту алгоритмі. Бір тармақта шарт шатасқан, сондықтан робот маңдайымен соғылады.', ru: 'Алгоритм обхода лабиринта по правой стене. В одной ветке перепутано условие, и робот бьётся лбом.' },
      map: ['S..#...', '#.##.#.', '#....#.', '##.###.', '.......', '.#.##.#', '.#..#.H'], start: { d: 1 },
      code: ['while not at_target():', '    if not wall_right():', '        right()', '        forward()',
        '    elif {cond:wall_ahead()}:', '        forward()', '    else:', '        left()'],
      fixed: ['while not at_target():', '    if not wall_right():', '        right()', '        forward()',
        '    elif not wall_ahead():', '        forward()', '    else:', '        left()']
    }
  ];

  var TOKEN_RE = /\{(n|cmd|cond|kw):([^}]*)\}/g;

  // Разбирает шаблон уровня на строки с токенами
  function template(level) {
    return level.code.map(function (raw) {
      var indentEditable = raw[0] === '~';
      var src = indentEditable ? raw.slice(1) : raw;
      var m = /^( *)/.exec(src);
      var indent = m[1].length / 4;
      src = src.slice(m[1].length);
      var parts = [], last = 0, t;
      TOKEN_RE.lastIndex = 0;
      while ((t = TOKEN_RE.exec(src))) {
        if (t.index > last) parts.push({ text: src.slice(last, t.index) });
        parts.push({ token: t[1], value: t[2] });
        last = TOKEN_RE.lastIndex;
      }
      if (last < src.length) parts.push({ text: src.slice(last) });
      return { indent: indent, indentEditable: indentEditable, parts: parts };
    });
  }

  function render(lines) {
    return lines.map(function (l) {
      return '    '.repeat(l.indent) + l.parts.map(function (p) { return p.text != null ? p.text : p.value; }).join('');
    });
  }

  // Сообщение — ключ перевода, arg подставляется в {x}
  function SyntaxErr(line, key, arg) { this.line = line; this.message = key; this.arg = arg; }

  var COND_RE = /^(not )?(wall_ahead|wall_right|wall_left|at_target)\(\)$/;

  function parseCond(s, ln) {
    var m = COND_RE.exec(s.trim());
    if (!m) throw new SyntaxErr(ln, 'b.e.cond', s.trim());
    return { not: !!m[1], fn: m[2] };
  }

  // Превращает текст в дерево операторов по отступам
  function parse(text) {
    var stmts = [];
    text.forEach(function (raw, i) {
      if (!raw.trim() || raw.trim()[0] === '#') return;
      var sp = /^( *)/.exec(raw)[1].length;
      if (sp % 4) throw new SyntaxErr(i, 'b.e.indent4');
      stmts.push({ line: i, depth: sp / 4, src: raw.trim() });
    });
    var pos = 0;

    function block(depth) {
      var out = [];
      while (pos < stmts.length) {
        var s = stmts[pos];
        if (s.depth < depth) break;
        if (s.depth > depth) throw new SyntaxErr(s.line, 'b.e.extra');
        pos++;
        var m, node;
        if ((m = /^(forward|left|right)\(\)$/.exec(s.src))) {
          node = { kind: 'call', fn: m[1], line: s.line };
        } else if ((m = /^for (\w+) in range\((\d+)\):$/.exec(s.src))) {
          node = { kind: 'for', v: m[1], n: +m[2], line: s.line, body: body(s) };
        } else if ((m = /^while (.+):$/.exec(s.src))) {
          node = { kind: 'while', cond: parseCond(m[1], s.line), line: s.line, body: body(s) };
        } else if ((m = /^if (.+):$/.exec(s.src))) {
          node = { kind: 'if', branches: [{ cond: parseCond(m[1], s.line), line: s.line, body: body(s) }], line: s.line };
          while (pos < stmts.length && stmts[pos].depth === depth) {
            var e = stmts[pos], em;
            if ((em = /^elif (.+):$/.exec(e.src))) {
              pos++;
              node.branches.push({ cond: parseCond(em[1], e.line), line: e.line, body: body(e) });
            } else if (e.src === 'else:') {
              pos++;
              node.branches.push({ cond: null, line: e.line, body: body(e) });
              break;
            } else break;
          }
        } else if (/^(elif .*|else):$/.test(s.src)) {
          throw new SyntaxErr(s.line, 'b.e.noIf', s.src.split(' ')[0].replace(':', ''));
        } else if (s.src === 'pass') {
          node = { kind: 'pass', line: s.line };
        } else {
          throw new SyntaxErr(s.line, 'b.e.unknown', s.src);
        }
        out.push(node);
      }
      return out;
    }

    function body(head) {
      if (pos >= stmts.length || stmts[pos].depth <= head.depth) {
        throw new SyntaxErr(head.line, 'b.e.block');
      }
      return block(head.depth + 1);
    }

    var prog = block(0);
    if (pos < stmts.length) throw new SyntaxErr(stmts[pos].line, 'b.e.unexpected');
    return prog;
  }

  function evalCond(r, c) {
    var v = c.fn === 'at_target' ? r.atTarget() : r.sense(c.fn.replace('wall_', ''));
    return c.not ? !v : v;
  }

  function exec(r, nodes, vars) {
    nodes.forEach(function (n) {
      r.ref = n.line;
      if (n.kind === 'call') {
        if (n.fn === 'forward') r.forward(); else r.turn(n.fn);
      } else if (n.kind === 'for') {
        for (var i = 0; i < n.n; i++) {
          vars[n.v] = i;
          r.vars = vars;
          exec(r, n.body, vars);
        }
      } else if (n.kind === 'while') {
        for (;;) {
          r.ref = n.line;
          if (!evalCond(r, n.cond)) break;
          exec(r, n.body, vars);
        }
      } else if (n.kind === 'if') {
        for (var b = 0; b < n.branches.length; b++) {
          var br = n.branches[b];
          r.ref = br.line;
          if (!br.cond || evalCond(r, br.cond)) { exec(r, br.body, vars); break; }
        }
      }
    });
  }

  function run(level, text) {
    var prog;
    try { prog = parse(text); } catch (e) {
      if (e instanceof SyntaxErr) return { kind: 'syntax', line: e.line, message: e.message, arg: e.arg, frames: [], path: [] };
      throw e;
    }
    return World.simulate(level, function (r) { r.vars = {}; exec(r, prog, r.vars); }, { maxTicks: 800 });
  }

  var api = { LEVELS: LEVELS, OPTIONS: OPTIONS, template: template, render: render, parse: parse, run: run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BugsCore = api;
})(this);
