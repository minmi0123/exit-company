// 입력 · 시작화면 · 메뉴얼 (9~10). 마지막에 게임을 시작하므로 맨 뒤에 불러온다
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 9. 입력 — 키보드 + 터치 패드
// ─────────────────────────────────────────────
const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const ITEM_KEYS = {
  Digit1: 'coffee', Numpad1: 'coffee',
  Digit2: 'annual', Numpad2: 'annual',
  Digit3: 'half', Numpad3: 'half',
};

// 꾹 누르기: 누르면 한 칸, 계속 누르고 있으면 HOLD_DELAY 뒤부터 HOLD_EVERY 마다 한 칸씩.
// 이어 걷는 칸에선 공격하지 않고, 위험하거나 볼 만한 게 생기면 멈춘다 (다시 눌러야 움직인다)
const HOLD_DELAY = 300;
const HOLD_EVERY = 140;
const hold = { dir: null, timer: 0 };

function startHold(dir) {
  stopHold();
  hold.dir = dir;
  act(dir); // 첫 칸은 평소처럼 (적이 있으면 공격)
  if (state.over || state.choosing) return;
  hold.timer = setTimeout(holdStep, HOLD_DELAY);
}

function stopHold() {
  clearTimeout(hold.timer);
  hold.dir = null;
}

// 주인공 근처(화면 반 정도)에 있는 적
function nearbyEnemies() {
  const h = state.hero;
  return new Set(state.enemies.filter((e) => Math.max(Math.abs(e.x - h.x), Math.abs(e.y - h.y)) <= 6));
}

function holdStep() {
  if (!hold.dir || state.over || state.choosing || state.screen === 'title') return stopHold();
  const h = state.hero;
  const [dx, dy] = DIRS[hold.dir];
  const next = tileAt(h.x + dx, h.y + dy);
  // 앞에 적·계단·출구·정수기가 있으면 이어 걷지 않는다 (한 번 더 눌러서 정한다)
  if (enemyAt(h.x + dx, h.y + dy) || next === '>' || next === 'E' || next === 'W') return stopHold();
  const before = { x: h.x, y: h.y, mental: state.mental, items: state.stats.items, floor: state.floor, near: nearbyEnemies() };
  act(hold.dir);
  const moved = h.x !== before.x || h.y !== before.y;
  const newEnemy = [...nearbyEnemies()].some((e) => !before.near.has(e));
  const adjacent = state.enemies.some((e) => Math.abs(e.x - h.x) + Math.abs(e.y - h.y) === 1);
  if (!moved || state.mental < before.mental || state.stats.items > before.items
    || state.floor !== before.floor || newEnemy || adjacent || state.over || state.choosing) {
    return stopHold();
  }
  hold.timer = setTimeout(holdStep, HOLD_EVERY);
}

window.addEventListener('keyup', (e) => {
  if (KEYS[e.code] && KEYS[e.code] === hold.dir) stopHold();
});
window.addEventListener('blur', stopHold);

window.addEventListener('keydown', (e) => {
  // 키보드 자동 반복은 무시한다 — 꾹 누르기는 위의 타이머가 맡는다
  // (자동 반복이 강화 카드 화면에 들어가 ←/→ 로 카드를 잘못 고르는 것도 막는다)
  if (e.repeat) {
    if (KEYS[e.code] || e.code === 'Space') e.preventDefault();
    return;
  }
  const ok = e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter';
  if (manualOpen()) {
    if (ok || e.code === 'Escape') {
      e.preventDefault();
      closeManual();
    }
    return;
  }
  if (state.screen === 'title') {
    if (ok) {
      e.preventDefault();
      startGame();
    } else if (e.code === 'KeyM') {
      openManual();
    }
    return;
  }
  // 강화 고르는 중: 1 / 2 (또는 ← →) 로 고른다
  if (state.choosing) {
    const i = { Digit1: 0, Numpad1: 0, ArrowLeft: 0, KeyA: 0, Digit2: 1, Numpad2: 1, ArrowRight: 1, KeyD: 1 }[e.code];
    if (i !== undefined && state.perkChoices[i]) {
      e.preventDefault();
      choosePerk(state.perkChoices[i]);
    }
    return;
  }
  if (state.over && ok) {
    e.preventDefault();
    showTitle();
    return;
  }
  if (ITEM_KEYS[e.code]) {
    e.preventDefault();
    useItem(ITEM_KEYS[e.code]);
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    throwPen();
    return;
  }
  const dir = KEYS[e.code];
  if (!dir) return;
  e.preventDefault();
  startHold(dir);
});

document.querySelectorAll('#items button').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.blur(); // 포커스가 남으면 Space/Enter 로 또 눌린다
    useItem(btn.dataset.item);
  });
});

document.querySelectorAll('#pad button').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (btn.id === 'throwBtn') throwPen();
    else startHold(btn.dataset.dir);
  });
  // 손가락을 떼거나, 버튼 밖으로 미끄러지거나, 터치가 끊기면 멈춘다
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    btn.addEventListener(type, () => {
      if (btn.dataset.dir === hold.dir) stopHold();
    });
  }
  btn.addEventListener('contextmenu', (e) => e.preventDefault()); // 길게 누를 때 메뉴가 뜨지 않게
});

// ─────────────────────────────────────────────
// 10. 시작화면 · 메뉴얼
//     시작화면 그림: 48x32 도트. 퇴근 시각 18:00 벽시계 + 책상에 앉은 신입사원
// ─────────────────────────────────────────────
const SCENE_W = 48;
const SCENE_H = 32;

const SCENE_PAPERS = [ // 산더미 서류
  '.oooooo.',
  '.oPPPPo.',
  'ooLLLLoo',
  'oPPPPPPo',
  '.oLLLLo.',
  'ooPPPPoo',
  'oLLLLLLo',
  'oPPPPPPo',
];
const SCENE_CUP = [
  'oooo',
  'owwo',
  'oddo',
  'owwo',
];
const SCENE_MONITOR = [
  'oooooooooooo',
  'otttttttttto',
  'otllllllllto',
  'otlwwwwlllto',
  'otllllwwwlto',
  'otlwwwllllto',
  'otllwwwwwlto',
  'otllllllllto',
  'otttttttttto',
  'oooooooooooo',
];

function buildTitleScene(blink) {
  const g = Array.from({ length: SCENE_H }, () => Array(SCENE_W).fill('b'));
  const fill = (x0, y0, w, h, ch) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = ch;
  };
  const stamp = (rows, x0, y0) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') g[y0 + y][x0 + x] = ch;
  }));

  // 벽 · 걸레받이 · 바닥
  fill(0, 17, SCENE_W, 3, 'c');
  fill(0, 20, SCENE_W, 2, 'm');
  fill(0, 22, SCENE_W, SCENE_H - 22, 'f');

  // 벽시계 18:00 (콜론이 깜빡인다)
  fill(3, 2, 23, 9, 'o');
  fill(4, 3, 21, 7, 'K');
  [['1', 6], ['8', 10], ['0', 16], ['0', 20]].forEach(([ch, x]) => {
    PIXEL_FONT[ch].forEach((row, dy) => [...row].forEach((bit, dx) => {
      if (bit === '1') g[4 + dy][x + dx] = 'R';
    }));
  });
  if (blink) {
    g[5][14] = 'R';
    g[7][14] = 'R';
  }

  // 신입사원 (책상 위로 상반신만 보인다)
  stamp(HERO_BODY.slice(0, 11), 16, 10);

  // 모니터 + 받침
  stamp(SCENE_MONITOR, 33, 9);
  fill(38, 19, 2, 1, 't');
  if (blink) fill(36, 16, 2, 1, 'w'); // 커서

  // 책상: 상판 · 앞판
  fill(0, 20, SCENE_W, 1, 'o');
  fill(0, 21, SCENE_W, 2, 'd');
  fill(0, 23, SCENE_W, 1, 'e');
  fill(0, 24, SCENE_W, 1, 'o');
  fill(3, 25, SCENE_W - 6, 5, 'e');
  fill(2, 25, 1, 5, 'o');
  fill(SCENE_W - 3, 25, 1, 5, 'o');
  fill(2, 30, SCENE_W - 4, 1, 'o');

  // 책상 위: 서류 더미 · 커피 · 키보드와 손 (타자 치듯 번갈아 움직인다)
  stamp(SCENE_PAPERS, 3, 12);
  stamp(SCENE_CUP, 12, 16);
  fill(18, 21, 12, 1, 'K');
  for (let x = 19; x < 29; x += 2) g[21][x] = 'L';
  g[blink ? 20 : 21][19] = 's';
  g[blink ? 21 : 20][28] = 's';

  return g;
}

function renderScene(grid, cv) {
  const c = cv.getContext('2d');
  grid.forEach((row, y) => row.forEach((ch, x) => {
    c.fillStyle = PALETTE[ch];
    c.fillRect(x, y, 1, 1);
  }));
}

const titleArt = document.getElementById('titleArt');
titleArt.width = SCENE_W;
titleArt.height = SCENE_H;
const TITLE_FRAMES = [buildTitleScene(false), buildTitleScene(true)];
let titleFrame = 0;
renderScene(TITLE_FRAMES[0], titleArt);
setInterval(() => {
  if (state.screen !== 'title') return;
  titleFrame = 1 - titleFrame;
  renderScene(TITLE_FRAMES[titleFrame], titleArt);
}, 500);

// ?seed= 로 들어오면 첫 판만 그 시드로 시작한다
let pendingSeed = Number(params.get('seed')) || null;

function showTitle() {
  state.screen = 'title';
  clearTimeout(overlayTimer);
  document.getElementById('overlay').className = '';
  document.getElementById('msg').textContent = '';
  const best = loadBest();
  document.getElementById('titleBest').textContent = best === null ? ''
    : '최고 기록: ' + (best === 0 ? '퇴근 성공' : best + 'F 까지');
  document.getElementById('title').className = 'show';
}

function startGame() {
  state.screen = 'play';
  document.getElementById('title').className = '';
  newRun(pendingSeed || randomSeed());
  pendingSeed = null;
}

// 메뉴얼 — 적·아이템 데이터에서 만든다 (데이터를 고치면 메뉴얼도 따라온다)
const AI_TAG = {
  melee: '근접', ranged: '원거리', grab: '붙잡기', wander: '적 부르기 (공격 안 함)', boss: '보스',
};

function firstFloorOf(kind) {
  for (let f = TOP_FLOOR; f >= 1; f--) {
    if (ENEMIES_PER_FLOOR[f][kind]) return f;
  }
  return null;
}

function manualCard(sprite, name, tags, desc) {
  const li = document.createElement('li');
  const img = document.createElement('img');
  img.src = sprite.toDataURL();
  img.alt = '';
  const body = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'name';
  const b = document.createElement('b');
  b.textContent = name;
  head.append(b);
  tags.forEach(([text, cls]) => {
    const t = document.createElement('span');
    t.className = cls;
    t.textContent = text;
    head.append(t);
  });
  const p = document.createElement('div');
  p.className = 'desc';
  p.textContent = desc;
  body.append(head, p);
  li.append(img, body);
  return li;
}

function buildManual() {
  const enemies = document.getElementById('manualEnemies');
  for (const [kind, t] of Object.entries(ENEMY_TYPES)) {
    const where = kind === 'boss' ? '1F 출구' : firstFloorOf(kind) + 'F 부터';
    enemies.append(manualCard(SPRITES[kind].right[0], t.name,
      [[AI_TAG[t.ai], 'tag'], [where, 'tag where']], t.desc));
  }
  const items = document.getElementById('manualItems');
  for (const [kind, t] of Object.entries(ITEM_TYPES)) {
    items.append(manualCard(SPRITES[kind], t.name, [[t.tag, 'tag'], [t.key + ' 키', 'tag where']], t.desc));
  }
}

function manualOpen() {
  return document.getElementById('manual').className === 'show';
}

function openManual() {
  document.getElementById('manual').className = 'show';
  document.querySelector('#manual .panel').scrollTop = 0;
}

function closeManual() {
  document.getElementById('manual').className = '';
}

buildManual();
document.getElementById('startBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  startGame();
});
document.getElementById('manualBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  openManual();
});
document.getElementById('manualClose').addEventListener('click', closeManual);
document.getElementById('manual').addEventListener('click', (e) => {
  if (e.target.id === 'manual') closeManual(); // 바깥을 누르면 닫기
});
document.getElementById('restart').addEventListener('click', (e) => {
  e.currentTarget.blur();
  showTitle();
});

// 시작화면 뒤에도 그릴 맵이 있어야 해서 한 판을 미리 만들어 둔다 (퇴근하기에서 새로 시작)
newRun(pendingSeed || randomSeed());
showTitle();
draw();
