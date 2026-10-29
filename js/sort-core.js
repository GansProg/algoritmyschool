/* «Сортировочный цех»: уровни, подсчёт минимума ходов и пошаговые сортировки. */
(function (root) {
  'use strict';

  var LEVELS = [
    { id: 's1', mode: 'bubble', title: 'Первая смена', weights: [5, 2, 4, 1, 3],
      text: 'Расставь ящики по весу: лёгкие слева, тяжёлые справа. Кран умеет менять местами только два соседних ящика.' },
    { id: 's2', mode: 'bubble', title: 'Шесть ящиков', weights: [7, 3, 9, 1, 6, 4],
      text: 'Ходов ровно столько, сколько нужно. Каждый обмен соседей, которые уже стоят по порядку, тратит ход впустую.' },
    { id: 's3', mode: 'bubble', title: 'Почти порядок', weights: [2, 1, 4, 3, 6, 5, 8, 7],
      text: 'Ящики почти рассортированы. Сколько ходов нужно, если перепутаны только пары?' },
    { id: 's4', mode: 'select', title: 'Длинный кран', weights: [9, 4, 7, 2, 5],
      text: 'Новый кран меняет местами любые два ящика. Выбери ящик, потом второй, и они поменяются. Найди самый лёгкий и поставь его на первое место.' },
    { id: 's5', mode: 'select', title: 'Семь ящиков', weights: [8, 3, 6, 1, 7, 2, 5],
      text: 'Сортировка выбором: на каждом шаге ищем самый лёгкий среди нерасставленных и ставим его на первое свободное место.' },
    { id: 's6', mode: 'select', title: 'Задом наперёд', weights: [16, 14, 12, 10, 8, 6, 4, 2],
      text: 'Все ящики стоят наоборот. Пузырьку тут понадобилось бы 28 обменов. А сколько хватит длинному крану?' }
  ];

  var PSEUDO = {
    bubble: [
      'for i in range(n - 1):',
      '    for j in range(n - 1 - i):',
      '        if a[j] > a[j + 1]:',
      '            a[j], a[j + 1] = a[j + 1], a[j]',
      '    # a[n - 1 - i] уже на своём месте'
    ],
    select: [
      'for i in range(n - 1):',
      '    m = i',
      '    for j in range(i + 1, n):',
      '        if a[j] < a[m]:',
      '            m = j',
      '    a[i], a[m] = a[m], a[i]'
    ]
  };

  function inversions(a) {
    var c = 0;
    for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
    return c;
  }

  // Минимум обменов любых двух элементов: n минус число циклов перестановки
  function minSwaps(a) {
    var sorted = a.slice().sort(function (x, y) { return x - y; });
    var pos = {};
    sorted.forEach(function (v, i) { pos[v] = i; });
    var seen = [], cycles = 0;
    for (var i = 0; i < a.length; i++) {
      if (seen[i]) continue;
      cycles++;
      var j = i;
      while (!seen[j]) { seen[j] = true; j = pos[a[j]]; }
    }
    return a.length - cycles;
  }

  function limitFor(level) {
    return level.mode === 'bubble' ? inversions(level.weights) : minSwaps(level.weights);
  }

  function isSorted(a) {
    for (var i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
    return true;
  }

  // Шаги алгоритма для визуализации
  function steps(mode, input) {
    var a = input.slice(), out = [], n = a.length, i, j, t;
    if (mode === 'bubble') {
      for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - 1 - i; j++) {
          out.push({ line: 2, cmp: [j, j + 1] });
          if (a[j] > a[j + 1]) {
            t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
            out.push({ line: 3, swap: [j, j + 1] });
          }
        }
        out.push({ line: 4, done: n - 1 - i });
      }
      out.push({ line: -1, done: 0 });
    } else {
      for (i = 0; i < n - 1; i++) {
        var m = i;
        out.push({ line: 1, min: m, at: i });
        for (j = i + 1; j < n; j++) {
          out.push({ line: 3, cmp: [j, m], min: m, at: i });
          if (a[j] < a[m]) { m = j; out.push({ line: 4, min: m, at: i }); }
        }
        if (m !== i) { t = a[i]; a[i] = a[m]; a[m] = t; }
        out.push({ line: 5, swap: m !== i ? [i, m] : null, done: i });
      }
      out.push({ line: -1, done: n - 1 });
    }
    return out;
  }

  var api = { LEVELS: LEVELS, PSEUDO: PSEUDO, inversions: inversions, minSwaps: minSwaps, limitFor: limitFor, isSorted: isSorted, steps: steps };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SortCore = api;
})(this);
