// 층 자동 생성 (4)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 4. 층 자동 생성 — 방 여러 개 + 복도
//    # 벽  . 바닥  D 책상  T 회의 테이블(2x2)  P 화분  C 복사기  W 정수기  V 다 마신 정수기  S 책장
//    > 계단  E 출구(1층)
// ─────────────────────────────────────────────
const MAP_W = 32;
const MAP_H = 24;
const TOP_FLOOR = 5;
const BLOCKING = new Set(['#', 'D', 'T', 'P', 'C', 'W', 'V', 'S']);
const STEPS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// 시드가 같으면 같은 맵이 나온다 (버그 재현용)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function center(room) {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  };
}

// 적이 길을 찾을 때는 출구도 벽이다 (적은 출구에 설 수 없다.
// 이걸 빼면 잠긴 출구를 지름길로 착각해 제자리에 멈춘다 — 2026-09-30 시드 917686)
const ENEMY_BLOCKING = new Set([...BLOCKING, 'E']);

// 시작점에서 걸어갈 수 있는 칸까지의 거리 (막힌 칸은 -1)
function distances(grid, from, blocking = BLOCKING) {
  const dist = grid.map((row) => row.map(() => -1));
  const queue = [from];
  dist[from.y][from.x] = 0;
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of STEPS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (blocking.has(grid[ny][nx]) || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

function countReachable(grid, from) {
  return distances(grid, from).flat().filter((d) => d >= 0).length;
}

function countWalkable(grid) {
  return grid.flat().filter((t) => !BLOCKING.has(t)).length;
}

function carveCorridor(grid, rng, a, b) {
  const horizontalFirst = rng() < 0.5;
  const [x1, y1, x2, y2] = [a.x, a.y, b.x, b.y];
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    grid[horizontalFirst ? y1 : y2][x] = '.';
  }
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    grid[y][horizontalFirst ? x2 : x1] = '.';
  }
}

function generateFloor(floorNo, rng) {
  for (;;) {
    const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('#'));
    const rooms = [];

    for (let tries = 0; tries < 300 && rooms.length < 8; tries++) {
      const w = randInt(rng, 5, 9);
      const h = randInt(rng, 4, 7);
      const x = randInt(rng, 1, MAP_W - w - 1);
      const y = randInt(rng, 1, MAP_H - h - 1);
      // 방끼리 벽 한 칸 이상 떨어지게
      const overlaps = rooms.some((r) =>
        x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y);
      if (overlaps) continue;
      rooms.push({ x, y, w, h });
    }
    if (rooms.length < 5) continue;

    for (const r of rooms) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = '.';
      }
    }

    // 왼쪽 방부터 차례로 복도로 잇는다
    rooms.sort((a, b) => center(a).x - center(b).x);
    for (let i = 1; i < rooms.length; i++) {
      carveCorridor(grid, rng, center(rooms[i - 1]), center(rooms[i]));
    }

    // 시작 방 = 무작위, 계단 = 시작점에서 가장 먼 방 칸
    const startRoom = rooms[randInt(rng, 0, rooms.length - 1)];
    const start = center(startRoom);
    const dist = distances(grid, start);
    let goal = null;
    for (const r of rooms) {
      if (r === startRoom) continue;
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (!goal || dist[y][x] > dist[goal.y][goal.x]) goal = { x, y };
        }
      }
    }
    // 책상: 길을 막지 않을 때만 놓는다
    // 이때 계단/출구 칸은 벽으로 친다 — 계단/출구를 지나야만 닿는 막다른 칸이 생기면 안 된다
    // (1층에서 사장님이 그런 칸에 서면 잠긴 출구 때문에 영영 못 깬다 — 2026-09-30 시드 917686)
    grid[goal.y][goal.x] = '#';
    // 계단/출구 칸 자체가 유일한 통로면 (책상이 없어도) 막다른 칸이 생긴다 → 맵을 새로 만든다
    if (countReachable(grid, start) !== countWalkable(grid)) continue;
    furnish(grid, rooms, startRoom, start, goal, rng);
    grid[goal.y][goal.x] = floorNo === 1 ? 'E' : '>';

    return { grid, start, rooms };
  }
}

// 가구 배치. 놓았을 때 걸어갈 수 있는 칸이 끊기면 되돌린다.
// 시작점·계단 바로 옆은 비워 둔다 (1층 사장님은 출구 옆 빈칸에 선다)
const WALL_PROPS = ['P', 'P', 'C', 'W', 'S', 'S'];
function furnish(grid, rooms, startRoom, start, goal, rng) {
  const near = (x, y, p) => Math.abs(x - p.x) + Math.abs(y - p.y) <= 1;
  const free = (x, y) => grid[y][x] === '.' && !near(x, y, start) && !near(x, y, goal);
  const place = (cells, ch) => {
    if (!cells.every(([x, y]) => free(x, y))) return false;
    for (const [x, y] of cells) grid[y][x] = ch;
    if (countReachable(grid, start) === countWalkable(grid)) return true;
    for (const [x, y] of cells) grid[y][x] = '.';
    return false;
  };

  for (const r of rooms) {
    const isStart = r === startRoom;

    // 회의 테이블: 큰 방 한가운데. 둘레 한 칸은 비워 돌아갈 수 있게
    if (!isStart && r.w >= 7 && r.h >= 6 && rng() < 0.6) {
      for (let tries = 0; tries < 6; tries++) {
        const x = randInt(rng, r.x + 1, r.x + r.w - 3);
        const y = randInt(rng, r.y + 1, r.y + r.h - 3);
        let ringFree = true;
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) if (grid[y + dy][x + dx] !== '.') ringFree = false;
        }
        if (ringFree && place([[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], 'T')) break;
      }
    }

    // 책상 (2칸짜리). 방이 클수록 많이
    if (r.w >= 6 && r.h >= 5) {
      const pairs = Math.min(5, Math.floor((r.w * r.h) / 12)) - (isStart ? 1 : 0);
      let placed = 0;
      for (let tries = 0; tries < pairs * 3 && placed < pairs; tries++) {
        const x = randInt(rng, r.x + 1, r.x + r.w - 3);
        const y = randInt(rng, r.y + 1, r.y + r.h - 2);
        if (place([[x, y], [x + 1, y]], 'D')) placed++;
      }
    }

    // 벽에 붙는 소품: 방 윗줄 (바로 위가 벽인 칸만 — 복도 입구는 피한다)
    const wallSpots = [];
    for (let x = r.x; x < r.x + r.w; x++) {
      if (grid[r.y - 1][x] === '#') wallSpots.push(x);
    }
    const count = randInt(rng, 2, 4);
    for (let i = 0; i < count && wallSpots.length; i++) {
      const x = wallSpots.splice(randInt(rng, 0, wallSpots.length - 1), 1)[0];
      place([[x, r.y]], WALL_PROPS[randInt(rng, 0, WALL_PROPS.length - 1)]);
    }

    // 양옆 벽: 화분 · 정수기 · 복사기를 한두 개
    const sideSpots = [];
    for (let y = r.y + 1; y < r.y + r.h; y++) {
      if (grid[y][r.x - 1] === '#') sideSpots.push([r.x, y]);
      if (grid[y][r.x + r.w] === '#') sideSpots.push([r.x + r.w - 1, y]);
    }
    const sideCount = randInt(rng, 1, 2);
    for (let i = 0; i < sideCount && sideSpots.length; i++) {
      const cell = sideSpots.splice(randInt(rng, 0, sideSpots.length - 1), 1)[0];
      place([cell], 'PPWC'[randInt(rng, 0, 3)]);
    }
  }
}

function roomAt(map, x, y) {
  return map.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null;
}

// 아이템 배치: 시작점이 아닌 빈 바닥 (적과 겹치지 않게)
function spawnItems(map, enemies, rng) {
  const spots = [];
  map.grid.forEach((row, y) => row.forEach((t, x) => {
    const taken = (x === map.start.x && y === map.start.y)
      || enemies.some((e) => e.x === x && e.y === y);
    if (t === '.' && !taken) spots.push({ x, y });
  }));
  const items = [];
  for (const [kind, type] of Object.entries(ITEM_TYPES)) {
    if (rng() >= type.chance) continue;
    const count = randInt(rng, type.min, type.max);
    for (let i = 0; i < count && spots.length; i++) {
      const { x, y } = spots.splice(randInt(rng, 0, spots.length - 1), 1)[0];
      items.push({ kind, x, y });
    }
  }
  return items;
}

// 적 배치: 시작점에서 6칸 이상 떨어진 바닥에만
function spawnEnemies(map, floorNo, rng) {
  const dist = distances(map.grid, map.start);
  const spots = [];
  map.grid.forEach((row, y) => row.forEach((t, x) => {
    if (t === '.' && dist[y][x] >= 6) spots.push({ x, y });
  }));
  const enemies = [];
  for (const [kind, count] of Object.entries(ENEMIES_PER_FLOOR[floorNo] || {})) {
    for (let i = 0; i < count && spots.length; i++) {
      const { x, y } = spots.splice(randInt(rng, 0, spots.length - 1), 1)[0];
      enemies.push(makeEnemy(kind, x, y));
    }
  }
  if (floorNo === 1) placeBoss(map, enemies);
  return enemies;
}

function makeEnemy(kind, x, y) {
  const type = ENEMY_TYPES[kind];
  const scale = kind === 'boss' ? 1 : 1 + HP_PER_FLOOR * (TOP_FLOOR - (state.floor || TOP_FLOOR));
  const hp = Math.round(type.hp * scale);
  return {
    kind, type, x, y, hp, maxHp: hp, facing: -1, step: 0,
    awake: false,     // 주인공을 알아챘는지
    bonus: 0,         // 상사가 떠넘긴 공격력 / 사장님 야근 누적
    cooldown: 0,      // 팀장님 붙잡기 / 상사 부르기 / 고객사 재장전 / 사장님 소집
    anim: { fromX: x, fromY: y, start: 0 },
  };
}

// 사장님은 출구 바로 앞 칸에 선다 (그 칸에 다른 적이 있으면 비켜 준다)
function placeBoss(map, enemies) {
  let exit = null;
  map.grid.forEach((row, y) => row.forEach((t, x) => { if (t === 'E') exit = { x, y }; }));
  const posts = STEPS4
    .map(([dx, dy]) => ({ x: exit.x + dx, y: exit.y + dy }))
    .filter((p) => map.grid[p.y][p.x] === '.' && !(p.x === map.start.x && p.y === map.start.y));
  const post = posts.find((p) => !enemies.some((e) => e.x === p.x && e.y === p.y)) || posts[0];
  const blocker = enemies.findIndex((e) => e.x === post.x && e.y === post.y);
  if (blocker >= 0) enemies.splice(blocker, 1);
  enemies.push(makeEnemy('boss', post.x, post.y));
}
