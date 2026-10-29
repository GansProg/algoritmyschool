/* «Python-квест»: главы, мир на Python и запуск через Skulpt.
   Мир каждой главы написан на Python и сообщает о действиях героя строками-событиями. */
(function (root) {
  'use strict';

  var COMMON = [
    'class _Fail(Exception):',
    '    pass',
    '_n = [0]',
    'def _ev(kind, a="", b=""):',
    '    print("@@EV\\t" + kind + "\\t" + str(a) + "\\t" + str(b))',
    'def _act(code, text):',
    '    _n[0] += 1',
    '    if _n[0] > 400:',
    '        _ev("fail", "Герой выбился из сил: больше 400 действий. Похоже, цикл не останавливается.")',
    '        raise _Fail()',
    '    _ev("act", code, text)',
    'def _stop(text):',
    '    _ev("fail", text)',
    '    raise _Fail()',
    'def _q(s):',
    '    if type(s) == str:',
    '        return \'"\' + s + \'"\'',
    '    return str(s)',
    ''
  ].join('\n');

  function pyStr(s) { return JSON.stringify(String(s)); }
  function pyList(a) { return '[' + a.join(', ') + ']'; }

  var CHAPTERS = [
    {
      id: 'q1', title: 'Вестибюль', topic: 'Вызов функций',
      story: [
        'Экскурсия в Музей вычислительной техники закончилась, а ты задержался у витрины с калькулятором «Электроника МК-52». Свет погас, двери заблокировались.',
        'В этом музее всё слушается команд на Python. Каждое действие героя записывается строчкой кода: напиши строчку, и герой её выполнит.'
      ],
      task: 'Найди в музее фонарик и возьми его.',
      api: [['look()', 'осмотреться'], ['go("север")', 'пойти: север, юг, восток или запад'], ['take("предмет")', 'взять предмет']],
      starter: '# Строчки с решёткой — комментарии, Python их пропускает.\nlook()\n',
      runs: [{ label: 'Прогон' }],
      world: function () {
        return [
          '_rooms = {',
          '    "вестибюль": ["Вестибюль. Касса закрыта, над дверью светится табличка «Выход», но дверь заперта.", {"север": "коридор"}, [], "в вестибюль"],',
          '    "коридор": ["Длинный коридор с портретами конструкторов ЭВМ. Из-за двери на востоке тянет пылью и картоном.", {"юг": "вестибюль", "восток": "зал"}, [], "в коридор"],',
          '    "зал": ["Зал перфокарт. Шкафы с картонными карточками до потолка. На столе лежит фонарик.", {"запад": "коридор"}, ["фонарик"], "в зал перфокарт"]',
          '}',
          '_here = ["вестибюль"]',
          '_bag = []',
          'def look():',
          '    r = _rooms[_here[0]]',
          '    ex = ", ".join(sorted(r[1].keys()))',
          '    _act("look()", r[0] + " Выходы: " + ex + ".")',
          'def go(direction):',
          '    r = _rooms[_here[0]]',
          '    if direction not in r[1]:',
          '        _act("go(" + _q(direction) + ")", "Туда не пройти. Отсюда можно пойти: " + ", ".join(sorted(r[1].keys())) + ".")',
          '        return',
          '    _here[0] = r[1][direction]',
          '    _act("go(" + _q(direction) + ")", "Ты идёшь на " + direction + " и попадаешь " + _rooms[_here[0]][3] + ".")',
          'def take(item):',
          '    r = _rooms[_here[0]]',
          '    if item in r[2]:',
          '        r[2].remove(item)',
          '        _bag.append(item)',
          '        _act("take(" + _q(item) + ")", "Ты берёшь: " + item + ". В рюкзаке: " + ", ".join(_bag) + ".")',
          '    else:',
          '        _act("take(" + _q(item) + ")", "Здесь нет предмета «" + str(item) + "».")'
        ].join('\n');
      },
      check: [
        'if "фонарик" in _bag:',
        '    _ev("win", "Фонарик щёлкнул, и луч выхватил из темноты дверь в следующий зал.")',
        'else:',
        '    _ev("fail", "Фонарика у тебя нет. Осмотрись (look) и проверь, куда ведут выходы.")'
      ].join('\n')
    },
    {
      id: 'q2', title: 'Кодовые замки', topic: 'Переменные и арифметика',
      story: [
        'Луч фонарика упирается в дверь с кодовым замком. Рядом медная табличка с названием машины и годом её создания.',
        'Смотритель оставил записку: «Код замка — последние две цифры года, умноженные на 3». Дальше по коридору ещё две такие двери, и машины там другие.'
      ],
      task: 'Прочитай год функцией plaque(), вычисли код и введи его. Программа должна открыть все три двери, у каждой свой год.',
      api: [['year = plaque()', 'прочитать табличку, получить год'], ['enter_code(число)', 'ввести код'], ['year % 100', 'две последние цифры числа']],
      starter: 'year = plaque()\n# вычисли код и передай его в enter_code(...)\n',
      runs: [{ label: 'Дверь 1', name: 'Сетунь', year: 1958 }, { label: 'Дверь 2', name: 'Урал-1', year: 1956 }, { label: 'Дверь 3', name: 'БЭСМ-6', year: 1968 }],
      world: function (p) {
        return [
          '_info = [' + pyStr(p.name) + ', ' + p.year + ']',
          '_opened = [False]',
          '_tries = [0]',
          'def plaque():',
          '    _act("plaque()", "На табличке: «" + _info[0] + ", год создания " + str(_info[1]) + "».")',
          '    return _info[1]',
          'def enter_code(code):',
          '    _tries[0] += 1',
          '    if code == (_info[1] % 100) * 3:',
          '        _opened[0] = True',
          '        _act("enter_code(" + _q(code) + ")", "Замок щёлкнул. Дверь в зал «" + _info[0] + "» открыта.")',
          '    else:',
          '        _act("enter_code(" + _q(code) + ")", "Замок пискнул: код " + str(code) + " не подходит.")',
          '        if _tries[0] >= 3:',
          '            _stop("После трёх ошибок замок заблокировался.")'
        ].join('\n');
      },
      check: [
        'if _opened[0]:',
        '    _ev("win", "Дверь открыта.")',
        'else:',
        '    _ev("fail", "Дверь всё ещё заперта.")'
      ].join('\n')
    },
    {
      id: 'q3', title: 'Троичная лампа', topic: 'Ветвление if / elif / else',
      story: [
        'В зале стоит «Сетунь», единственная в мире серийная троичная ЭВМ. Её разряд называется трит и принимает три значения: −1, 0 и +1.',
        'На панели горит лампа и три кнопки. Если лампа показывает −1, жми левую кнопку, если 0, среднюю, если +1, правую. Лампа каждый раз загорается по-разному.'
      ],
      task: 'Прочитай лампу и нажми нужную кнопку. Программа будет проверена на всех трёх значениях.',
      api: [['v = lamp()', 'узнать значение лампы: -1, 0 или 1'], ['press("левая")', 'нажать кнопку: "левая", "средняя", "правая"'], ['if … elif … else', 'выбор из нескольких вариантов']],
      starter: 'v = lamp()\nif v == -1:\n    press("левая")\n',
      runs: [{ label: 'Лампа −1', v: -1 }, { label: 'Лампа 0', v: 0 }, { label: 'Лампа +1', v: 1 }],
      world: function (p) {
        return [
          '_v = [' + p.v + ']',
          '_pressed = [None]',
          '_acc = {"левая": "левую", "средняя": "среднюю", "правая": "правую"}',
          'def lamp():',
          '    names = {-1: "минус один", 0: "ноль", 1: "плюс один"}',
          '    _act("lamp()", "Лампа показывает: " + names[_v[0]] + ".")',
          '    return _v[0]',
          'def press(button):',
          '    if button not in _acc:',
          '        _act("press(" + _q(button) + ")", "Такой кнопки нет. Есть левая, средняя и правая.")',
          '        return',
          '    if _pressed[0] is not None:',
          '        _stop("Ты нажал вторую кнопку, и панель сбросилась. Нажимать можно только одну.")',
          '    _pressed[0] = button',
          '    _act("press(" + _q(button) + ")", "Ты нажимаешь " + _acc[button] + " кнопку.")'
        ].join('\n');
      },
      check: [
        '_need = {-1: "левая", 0: "средняя", 1: "правая"}[_v[0]]',
        'if _pressed[0] == _need:',
        '    _ev("win", "Сетунь мигнула всеми лампами: ответ принят.")',
        'elif _pressed[0] is None:',
        '    _ev("fail", "Ни одна кнопка не нажата. При этом значении лампы программа ничего не сделала.")',
        'else:',
        '    _ev("fail", "Нажата не та кнопка: нужна " + _acc[_need] + ".")'
      ].join('\n')
    },
    {
      id: 'q4', title: 'Лестница в архив', topic: 'Цикл for',
      story: [
        'За «Сетунью» узкая винтовая лестница. Двенадцать ступенек, наверху люк в архив.',
        'Ты можешь написать step() двенадцать раз, но смотритель любит короткие записи: в журнале для этой главы только три строчки.'
      ],
      task: 'Поднимись на 12 ступенек и открой люк. Не больше 3 строк кода.',
      api: [['step()', 'подняться на одну ступеньку'], ['open_hatch()', 'открыть люк (только с последней ступеньки)'], ['for i in range(12):', 'повторить 12 раз']],
      starter: 'step()\nstep()\n',
      maxLines: 3,
      runs: [{ label: 'Лестница' }],
      world: function () {
        return [
          '_s = [0]',
          '_open = [False]',
          'def step():',
          '    if _s[0] >= 12:',
          '        _stop("Ты упёрся головой в люк. Ступенек всего 12.")',
          '    _s[0] += 1',
          '    _act("step()", "Ступенька " + str(_s[0]) + " из 12.")',
          'def open_hatch():',
          '    if _s[0] < 12:',
          '        _stop("До люка не дотянуться: ты на ступеньке " + str(_s[0]) + " из 12.")',
          '    _open[0] = True',
          '    _act("open_hatch()", "Люк со скрипом поддаётся.")'
        ].join('\n');
      },
      check: [
        'if _open[0]:',
        '    _ev("win", "Ты в архиве. Пахнет старой бумагой и машинным маслом.")',
        'else:',
        '    _ev("fail", "Люк закрыт. Ты остановился на ступеньке " + str(_s[0]) + ".")'
      ].join('\n')
    },
    {
      id: 'q5', title: 'Заклинивший вентиль', topic: 'Цикл while',
      story: [
        'В архиве из трубы капает вода. Вентиль заклинило, и сколько оборотов нужно, заранее не скажешь: каждый раз по-разному.',
        'Если крутить, когда он уже открыт, резьбу сорвёт. Значит, крутить надо, пока он закрыт, и ни разу больше.'
      ],
      task: 'Открой вентиль. Программа будет проверена на трёх вентилях с разным числом оборотов.',
      api: [['is_open()', 'True, если вентиль открыт'], ['turn_wheel()', 'сделать один оборот'], ['while not is_open():', 'повторять, пока условие верно']],
      starter: 'turn_wheel()\n',
      runs: [{ label: 'Вентиль 1', k: 3 }, { label: 'Вентиль 2', k: 7 }, { label: 'Вентиль 3', k: 5 }],
      world: function (p) {
        return [
          '_k = [' + p.k + ']',
          '_t = [0]',
          'def is_open():',
          '    res = _t[0] >= _k[0]',
          '    _act("is_open()", "Вентиль открыт." if res else "Вентиль ещё закрыт.")',
          '    return res',
          'def turn_wheel():',
          '    if _t[0] >= _k[0]:',
          '        _stop("Лишний оборот! Вентиль уже был открыт, и резьбу сорвало.")',
          '    _t[0] += 1',
          '    _act("turn_wheel()", "Оборот " + str(_t[0]) + ". Вентиль скрипит.")'
        ].join('\n');
      },
      check: [
        'if _t[0] == _k[0]:',
        '    _ev("win", "Вода пошла по трубе, и где-то внизу загудел насос.")',
        'else:',
        '    _ev("fail", "Вентиль не открыт: сделано " + str(_t[0]) + " оборот(а), а нужно больше.")'
      ].join('\n')
    },
    {
      id: 'q6', title: 'Ящик с перфолентами', topic: 'Списки',
      story: [
        'В архиве стоит считыватель перфолент. Чтобы он заработал, ленты нужно заправить по возрастанию номеров. Номера на каждом ящике свои.',
        'Функция tapes() возвращает список номеров. Со списком можно работать, как с любым значением: перебрать циклом for, найти min(), отсортировать sorted().'
      ],
      task: 'Заправь все ленты из ящика по возрастанию номеров. Проверка на трёх ящиках.',
      api: [['tapes()', 'список номеров лент, например [42, 7, 19]'], ['load(номер)', 'заправить ленту'], ['sorted(список)', 'новый список по возрастанию']],
      starter: 'box = tapes()\nprint(box)\n',
      runs: [{ label: 'Ящик 1', list: [42, 7, 19, 3] }, { label: 'Ящик 2', list: [5, 81, 23, 64, 12] }, { label: 'Ящик 3', list: [9, 1] }],
      world: function (p) {
        return [
          '_tp = ' + pyList(p.list),
          '_loaded = []',
          'def tapes():',
          '    _act("tapes()", "В ящике ленты с номерами " + str(_tp) + ".")',
          '    return list(_tp)',
          'def load(n):',
          '    if n not in _tp:',
          '        _stop("Ленты с номером " + str(n) + " в ящике нет.")',
          '    if n in _loaded:',
          '        _stop("Лента " + str(n) + " уже заправлена.")',
          '    _loaded.append(n)',
          '    _act("load(" + _q(n) + ")", "Лента " + str(n) + " в считывателе.")'
        ].join('\n');
      },
      check: [
        'if _loaded == sorted(_tp):',
        '    _ev("win", "Считыватель застрекотал и прочитал все ленты.")',
        'elif len(_loaded) < len(_tp):',
        '    _ev("fail", "Заправлено " + str(len(_loaded)) + " из " + str(len(_tp)) + " лент.")',
        'else:',
        '    _ev("fail", "Порядок " + str(_loaded) + " неверный. Нужно по возрастанию: " + str(sorted(_tp)) + ".")'
      ].join('\n')
    },
    {
      id: 'q7', title: 'Пульт БЭСМ-6', topic: 'Функции def и return',
      story: [
        'Последний зал. Перед тобой пульт БЭСМ-6, самой быстрой советской ЭВМ своего времени. Через него запускается резервный генератор.',
        'Генератору нужна функция, которая по уровню заряда отвечает словом: меньше 3 — "мало", от 3 до 7 включительно — "норма", больше 7 — "много". Пульт сам вызовет твою функцию с разными числами.'
      ],
      task: 'Напиши функцию gauge(level), которая возвращает "мало", "норма" или "много".',
      api: [['def gauge(level):', 'объявить функцию'], ['return "норма"', 'вернуть ответ'], ['3 <= x <= 7', 'двойное сравнение в Python']],
      starter: 'def gauge(level):\n    # верни "мало", "норма" или "много"\n    return "норма"\n',
      runs: [{ label: 'Пульт' }],
      world: function () { return '_cases = [0, 2, 3, 5, 7, 8, 10]'; },
      check: [
        'try:',
        '    gauge',
        'except NameError:',
        '    _stop("Функция gauge не найдена. Начни со строки def gauge(level):")',
        '_ok = True',
        'for _x in _cases:',
        '    _want = "мало" if _x < 3 else ("норма" if _x <= 7 else "много")',
        '    _got = gauge(_x)',
        '    if _got == _want:',
        '        _act("gauge(" + str(_x) + ")", "Вернула " + _q(_got) + ". Верно.")',
        '    else:',
        '        _act("gauge(" + str(_x) + ")", "Вернула " + _q(_got) + ", а нужно " + _q(_want) + ".")',
        '        _ok = False',
        'if _ok:',
        '    _ev("win", "Генератор загудел, в залах зажёгся свет, дверь вестибюля открылась. Ты выбрался!")',
        'else:',
        '    _ev("fail", "Генератор чихнул и заглох: функция ошиблась на некоторых числах.")'
      ].join('\n')
    }
  ];

  function codeLines(code) {
    return code.split('\n').filter(function (l) { return l.trim() && l.trim()[0] !== '#'; }).length;
  }

  function explain(err, offset, userLines) {
    var name = err && err.tp$name;
    var raw = String(err && err.toString ? err.toString() : err);
    var ln = null;
    if (err && err.traceback && err.traceback.length) ln = err.traceback[0].lineno - offset;
    var inUser = ln != null && ln >= 1 && ln <= userLines;
    var where = inUser ? 'Строка ' + ln + ': ' : '';
    var m;
    if (name === 'NameError' && (m = /name '([^']+)'/.exec(raw))) {
      return { line: inUser ? ln : null, text: where + 'Python не знает имени «' + m[1] + '». Проверь, нет ли опечатки, и задана ли переменная выше.' };
    }
    if (name === 'IndentationError') return { line: inUser ? ln : null, text: where + 'неверный отступ. Внутри if, for, while и def строки сдвигаются на 4 пробела.' };
    if (name === 'SyntaxError' || name === 'ParseError' || name === 'TokenError') {
      if (!inUser) return { line: null, text: 'Ошибка записи в конце программы: похоже, не закрыта скобка или кавычка.' };
      return { line: inUser ? ln : null, text: where + 'ошибка записи. Проверь двоеточия в конце if/for/while/def, скобки и кавычки.' };
    }
    if (name === 'TimeoutError' || /TimeLimitError|time limit/i.test(raw)) {
      return { line: null, text: 'Программа работает слишком долго. Похоже, цикл никогда не заканчивается.' };
    }
    if (name === 'TypeError') return { line: inUser ? ln : null, text: where + 'неподходящий тип данных. ' + raw.replace(/ on line \d+/, '') };
    if (name === 'ZeroDivisionError') return { line: inUser ? ln : null, text: where + 'деление на ноль.' };
    return { line: inUser ? ln : null, text: where + raw.replace(/ on line \d+/, '') };
  }

  // Выполняет один прогон главы. Возвращает Promise со списком событий.
  function runOnce(Sk, chapter, params, userCode) {
    var head = COMMON + chapter.world(params) + '\n';
    var offset = head.split('\n').length - 1;
    var source = head + userCode + '\n' + chapter.check + '\n';
    var events = [];
    var buf = '';
    function flush(line) {
      if (line.indexOf('@@EV\t') === 0) {
        var p = line.split('\t');
        if (p[1] === 'act') events.push({ kind: 'act', code: p[2], text: p[3] });
        else events.push({ kind: p[1], text: p[2] });
      } else {
        events.push({ kind: 'print', code: line });
      }
    }
    Sk.configure({
      output: function (t) {
        buf += t;
        var i;
        while ((i = buf.indexOf('\n')) >= 0) { flush(buf.slice(0, i)); buf = buf.slice(i + 1); }
      },
      read: function (f) {
        var files = Sk.builtinFiles && Sk.builtinFiles.files;
        if (!files || files[f] === undefined) throw new Error('Файл не найден: ' + f);
        return files[f];
      },
      __future__: Sk.python3,
      execLimit: 4000,
      yieldLimit: 100
    });
    return Sk.misceval.asyncToPromise(function () {
      return Sk.importMainWithBody('<quest>', false, source, true);
    }).then(function () {
      if (buf) flush(buf);
      return { events: events };
    }, function (err) {
      if (buf) flush(buf);
      if (err && err.tp$name === '_Fail') return { events: events };
      var ex = explain(err, offset, userCode.split('\n').length);
      events.push({ kind: 'error', text: ex.text, line: ex.line });
      return { events: events, error: ex };
    });
  }

  function runAll(Sk, chapter, userCode) {
    var results = [];
    var chain = Promise.resolve();
    chapter.runs.forEach(function (p) {
      chain = chain.then(function () {
        return runOnce(Sk, chapter, p, userCode).then(function (r) {
          r.label = p.label;
          r.ok = r.events.some(function (e) { return e.kind === 'win'; });
          results.push(r);
        });
      });
    });
    return chain.then(function () {
      var lines = codeLines(userCode);
      var tooLong = chapter.maxLines && lines > chapter.maxLines;
      return { runs: results, lines: lines, tooLong: tooLong, ok: !tooLong && results.every(function (r) { return r.ok; }) };
    });
  }

  var api = { CHAPTERS: CHAPTERS, runAll: runAll, codeLines: codeLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PyQuestCore = api;
})(this);
