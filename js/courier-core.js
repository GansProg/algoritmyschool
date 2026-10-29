/* «Робот-курьер»: уровни и исполнитель программы из блоков. */
(function (root) {
  'use strict';
  var World = root.World || (typeof require !== 'undefined' ? require('./world.js') : null);

  // Типы блоков: fwd, left, right, repeat{n, body}, ifwall{side, body, else}
  var LEVELS = [
    {
      id: 'c1', title: 'Первая доставка', topic: 'Линейный алгоритм',
      text: 'Посылку ждут в доме на этой же улице. Собери программу из команд «вперёд» и запусти.',
      map: ['......', 'S...H.', '......'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right'], best: 4
    },
    {
      id: 'c2', title: 'За угол', topic: 'Линейный алгоритм',
      text: 'Дом стоит за поворотом. Повороты робот делает на месте: «налево» и «направо» не сдвигают его с клетки.',
      map: ['S..#..', '##.#..', '##...H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right'], best: 9
    },
    {
      id: 'c3', title: 'Посылка по пути', topic: 'Линейный алгоритм',
      text: 'Сначала забери коробку на складе, потом отвези в дом. Робот подбирает посылку, когда въезжает на её клетку.',
      map: ['S.p.#', '###.#', 'H...#'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right'], best: 10
    },
    {
      id: 'c4', title: 'Длинная улица', topic: 'Цикл «повторить N раз»',
      text: 'Девять одинаковых шагов подряд. Если команда повторяется, её можно завернуть в цикл. Здесь разрешено не больше 3 блоков.',
      map: ['S........H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat'], best: 2, limit: 3
    },
    {
      id: 'c5', title: 'Лесенка', topic: 'Цикл «повторить N раз»',
      text: 'Найди кусок пути, который повторяется, и положи его в тело цикла. Не больше 6 блоков.',
      map: ['S.###', '#..##', '##..#', '###..', '####H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat'], best: 5, limit: 6
    },
    {
      id: 'c6', title: 'Круг по кварталу', topic: 'Вложенные циклы',
      text: 'Собери три посылки по углам квартала и вернись на склад. Цикл можно положить внутрь другого цикла. Не больше 5 блоков.',
      map: ['H..p', '.##.', '.##.', 'p..p'], start: { x: 0, y: 0, d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat'], best: 4, limit: 5
    },
    {
      id: 'c7', title: 'Улитка', topic: 'Ветвление «если стена»',
      text: 'Робот не знает длину коридоров, зато видит стену перед собой. Если стена впереди, поворачивай направо, иначе езжай вперёд. Не больше 5 блоков.',
      map: ['S....', '####.', '..H#.', '.###.', '.....'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat', 'ifwall'], best: 4, limit: 5
    },
    {
      id: 'c8', title: 'Извилистый переулок', topic: 'Вложенное ветвление',
      text: 'Теперь коридор поворачивает в обе стороны. Подсказка: в блоке «если» можно выбрать, куда смотрит датчик: вперёд, направо или налево. Не больше 7 блоков.',
      map: ['S..#...', '##.#.#.', '##...#H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat', 'ifwall'], best: 6, limit: 7
    },
    {
      id: 'c9', title: 'Лабиринт', topic: 'Правило правой руки',
      text: 'Есть старый способ пройти любой лабиринт: держись правой рукой за стену. Если справа проход, поверни туда и шагни, иначе если впереди свободно, шагни, иначе повернись налево. Не больше 8 блоков.',
      map: ['S..#...', '#.##.#.', '#....#.', '##.###.', '.......', '.#.##.#', '.#..#.H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat', 'ifwall'], best: 7, limit: 8
    },
    {
      id: 'c10', title: 'Ночная смена', topic: 'Всё вместе',
      text: 'Посылки разбросаны по тупикам лабиринта. Та же программа, что в прошлом уровне, обойдёт их все. Хватит ли повторов?',
      map: ['S...#p.', '.##.#.#', '.#p...#', '.####.#', '...#..p', '##.#.##', 'p..#..H'], start: { d: 1 },
      blocks: ['fwd', 'left', 'right', 'repeat', 'ifwall'], best: 7, limit: 8
    }
  ];

  function exec(r, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      r.ref = n.id;
      if (n.type === 'fwd') r.forward();
      else if (n.type === 'left') r.turn('left');
      else if (n.type === 'right') r.turn('right');
      else if (n.type === 'repeat') {
        for (var k = 0; k < n.n; k++) {
          r.vars = { iter: k + 1, of: n.n, id: n.id };
          exec(r, n.body);
        }
      } else if (n.type === 'ifwall') {
        r.ref = n.id;
        if (r.sense(n.side || 'ahead')) exec(r, n.body);
        else exec(r, n.else || []);
      }
    }
  }

  function count(nodes) {
    var c = 0;
    nodes.forEach(function (n) {
      c++;
      if (n.body) c += count(n.body);
      if (n.else) c += count(n.else);
    });
    return c;
  }

  function run(level, program) {
    return World.simulate(level, function (r) { exec(r, program); }, { maxTicks: 1500 });
  }

  var api = { LEVELS: LEVELS, run: run, count: count, exec: exec };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CourierCore = api;
})(this);
