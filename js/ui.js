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

// 숫자 키 → 아이템 종류 (아이템 표의 key 번호). 해당하는 아이템이 없으면 undefined
function itemForKey(code) {
  return Object.keys(STAGE.items).find((kind) => {
    const n = STAGE.items[kind].key;
    return code === 'Digit' + n || code === 'Numpad' + n;
  });
}

// 아이템 버튼: 지금 탄의 아이템 표로 만든다 (탄을 바꾸면 다시 만든다)
function buildItemButtons() {
  const box = document.getElementById('items');
  box.innerHTML = '';
  for (const [kind, type] of Object.entries(STAGE.items)) {
    const btn = document.createElement('button');
    btn.dataset.item = kind;
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = type.key;
    const count = document.createElement('span');
    count.id = 'n-' + kind;
    count.textContent = '0';
    btn.append(key, ' ' + type.name + ' ×', count);
    btn.addEventListener('click', () => {
      btn.blur(); // 포커스가 남으면 Space/Enter 로 또 눌린다
      useItem(kind);
    });
    box.append(btn);
  }
}
buildItemButtons();

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
  if (enemyAt(h.x + dx, h.y + dy) || TILES[next].stop) return stopHold();
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
  if (intro) { // 시작 연출 중: 아무 키나 누르면 건너뛴다
    e.preventDefault();
    endIntro();
    return;
  }
  const dialog = openDialogId();
  if (dialog) {
    if (e.code === 'Escape') {
      e.preventDefault();
      closeDialog();
    } else if (dialog === 'manual' && ok) {
      e.preventDefault();
      closeDialog();
    } else if (dialog === 'stages') {
      // Enter = 첫 탄 · 숫자 = 그 번호의 탄
      // 탄 버튼에 포커스가 있으면 Enter 는 그 버튼이 맡는다
      if (ok && document.activeElement && document.activeElement.closest('#stageList')) return;
      const stage = STAGES[Number((e.code.match(/^(?:Digit|Numpad)(\d)$/) || [])[1]) - 1];
      if (ok) {
        e.preventDefault();
        startGame();
      } else if (stage && stageOpen(stage)) {
        e.preventDefault();
        startGame(stage);
      }
    }
    return; // 환경설정 창에선 키보드로 슬라이더·체크박스를 다룰 수 있게 둔다
  }
  if (state.screen === 'title') {
    if (ok) {
      e.preventDefault();
      openDialog('stages');
    } else if (e.code === 'KeyM') {
      openDialog('manual');
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
  const item = itemForKey(e.code);
  if (item) {
    e.preventDefault();
    useItem(item);
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

// 그림 판(색 글자 2차원 배열)에 칠하는 도구: fill = 네모 칠하기 · stamp = 도트 그림 찍기 (판 밖은 자른다)
function sceneTools(g) {
  const fill = (x0, y0, w, h, ch) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = ch;
  };
  const stamp = (rows, x0, y0) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.' && x0 + x >= 0 && x0 + x < SCENE_W && y0 + y >= 0 && y0 + y < SCENE_H) g[y0 + y][x0 + x] = ch;
  }));
  return { fill, stamp };
}

// 벽시계 (왼쪽 위). time = '1800' 처럼 숫자 네 개, colon = 가운데 콜론을 켤지 (깜빡일 때 번갈아)
function drawSceneClock(g, time, colon) {
  const { fill } = sceneTools(g);
  fill(3, 2, 23, 9, 'o');
  fill(4, 3, 21, 7, 'K');
  [6, 10, 16, 20].forEach((x, i) => {
    PIXEL_FONT[time[i]].forEach((row, dy) => [...row].forEach((bit, dx) => {
      if (bit === '1') g[4 + dy][x + dx] = 'R';
    }));
  });
  if (colon) {
    g[5][14] = 'R';
    g[7][14] = 'R';
  }
}

// walk = 시작 연출에서 신입사원이 왼쪽으로 걸어간 거리(도트). null 이면 자리에 앉아 일하는 중
function buildTitleScene(blink, walk = null) {
  const g = Array.from({ length: SCENE_H }, () => Array(SCENE_W).fill('b'));
  const { fill, stamp } = sceneTools(g);

  // 벽 · 걸레받이 · 바닥
  fill(0, 17, SCENE_W, 3, 'c');
  fill(0, 20, SCENE_W, 2, 'm');
  fill(0, 22, SCENE_W, SCENE_H - 22, 'f');

  // 벽시계 18:00 (콜론이 깜빡인다)
  drawSceneClock(g, '1800', blink);

  // 신입사원 (책상 위로 상반신만 보인다). 걸을 땐 한 걸음마다 살짝 들썩인다
  if (walk === null) stamp(HERO_BODY.slice(0, 11), 16, 10);
  // (오른쪽은 모니터에 가려 금방 안 보여서 왼쪽으로 나간다 — 서류 더미 위로 머리가 지나간다)
  else stamp(HERO_BODY.slice(0, 11), 16 - walk, 9 + (Math.floor(walk / INTRO.stride) % 2));

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
  if (walk === null) {
    g[blink ? 20 : 21][19] = 's';
    g[blink ? 21 : 20][28] = 's';
  }

  return g;
}

// 2탄 시작 연출 그림: 집 현관. 21:00 벽시계 + 오른쪽 현관문 (문 너머는 밤)
// open = 문이 열린 정도 (0 닫힘 ~ 3 활짝) · hero = 신입사원 { x, y, step } (null 이면 아직 문 밖)
const HOME_DOOR_PANEL = [10, 7, 4, 1]; // 열린 정도별 문짝 너비 (경첩은 오른쪽)
function buildHomeScene(open, hero = null) {
  const g = Array.from({ length: SCENE_H }, () => Array(SCENE_W).fill('N'));
  const { fill, stamp } = sceneTools(g);

  // 줄무늬 벽지 · 벽 그림자 · 나무 걸레받이 · 마룻바닥 (2탄 칸 그림과 같은 색)
  for (let x = 3; x < SCENE_W; x += 4) fill(x, 0, 1, 18, 'M');
  fill(0, 18, SCENE_W, 2, 'M');
  fill(0, 20, SCENE_W, 2, 'D');
  fill(0, 22, SCENE_W, SCENE_H - 22, 'F');
  fill(0, 25, SCENE_W, 1, 'H');
  fill(0, 29, SCENE_W, 1, 'H');
  [[7, 22, 3], [27, 22, 3], [17, 26, 3], [39, 26, 3], [11, 30, 2], [33, 30, 2]].forEach(([x, y, h]) => fill(x, y, 1, h, 'H'));

  // 벽시계 21:00
  drawSceneClock(g, '2100', true);

  // 현관문: 바깥 테두리 · 나무 문틀 · 문 너머 밤하늘(별 둘) · 오른쪽에 붙은 문짝
  fill(32, 3, 14, 19, 'o');
  fill(33, 4, 12, 18, 'D');
  fill(34, 5, 10, 17, 'z');
  g[8][36] = 'y';
  g[11][40] = 'P';
  const w = HOME_DOOR_PANEL[open];
  fill(44 - w, 5, w, 17, 'e');
  fill(44 - w, 5, 1, 17, 'o'); // 문짝 왼쪽 끝
  if (w >= 4) g[13][44 - w + 2] = 'y'; // 손잡이

  // 현관 매트
  fill(33, 22, 12, 1, 'I');
  fill(33, 23, 12, 1, 'J');

  if (hero) stamp([...HERO_BODY, ...(hero.step ? HERO_LEGS_B : HERO_LEGS_A)], hero.x, hero.y);
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
  if (state.screen !== 'title' || intro) return;
  titleFrame = 1 - titleFrame;
  renderScene(TITLE_FRAMES[titleFrame], titleArt);
}, 500);

// ?seed= 로 들어오면 첫 판만 그 시드로 시작한다
let pendingSeed = Number(params.get('seed')) || null;

const TITLE_SUB = '오늘도 무사히 퇴근할 수 있을까?';

// 최고 기록 한 줄: 퇴근에 성공한 적이 있으면 점수, 아니면 내려간 층
function bestText(stage = STAGE) {
  const score = loadBestScore(stage);
  if (score !== null) return '최고 점수 ' + score + '점';
  const best = loadBest(stage);
  if (best === null) return '';
  return stage.text.best(best);
}

function showTitle() {
  state.screen = 'title';
  clearTimeout(overlayTimer);
  document.getElementById('overlay').className = '';
  document.getElementById('msg').textContent = '';
  document.getElementById('titleSub').textContent = TITLE_SUB;
  document.getElementById('titleBest').textContent = bestText(STAGES[0]);
  renderScene(TITLE_FRAMES[titleFrame], titleArt);
  document.getElementById('title').className = 'show';
}

// 시작 연출: 탄을 고르면 시작화면 그림 자리에서 짧은 장면을 보여 주고 게임을 시작한다.
// 짧게(0.7초쯤) 하고, 아무 키·터치로 건너뛸 수 있다. 움직임 줄이기를 켠 기기에선 생략한다
const INTRO = { every: 45, px: 2, stride: 4 }; // every ms 마다 px 도트씩, stride 도트마다 한 걸음
const HOME_INTRO = { door: 4, walk: 16, hold: 3 }; // 문 여는 장수(닫힘 → 활짝) · 들어와서 걷는 거리(도트) · 다 들어와서 서 있는 장수
let intro = null;

// 탄 id → 연출. line = 그림 아래 한 줄 · frame(t) = t 번째(1부터) 그림, null 이면 끝 (걸음 소리도 여기서 낸다)
// 연출이 없는 탄은 바로 시작한다
const INTROS = {
  // 1탄: 18:00 이 되자 자리에서 일어나 왼쪽으로 걸어 나간다
  company: {
    line: '18:00. 칼퇴 간다!',
    frame: (t) => {
      const walk = t * INTRO.px;
      if (16 - walk <= -14) return null; // 화면 밖으로 다 나갔다
      if (walk % (INTRO.stride * 2) === 0) sfx('step', (walk / (INTRO.stride * 2)) % 2);
      return buildTitleScene(false, walk);
    },
  },
  // 2탄: 21:00, 현관문을 열고 들어와 매트를 지나 선다 (2026-10-11 기획자 확정)
  home: {
    line: '21:00. 드디어 집이다.',
    frame: (t) => {
      if (t <= HOME_INTRO.door) {
        if (t === 1) sfx('door');
        return buildHomeScene(t - 1);
      }
      const moved = (t - HOME_INTRO.door - 1) * INTRO.px;
      if (moved > HOME_INTRO.walk + HOME_INTRO.hold * INTRO.px) return null;
      const walk = Math.min(moved, HOME_INTRO.walk);
      const walking = moved < HOME_INTRO.walk;
      if (moved <= HOME_INTRO.walk && walk % (INTRO.stride * 2) === 0) sfx('step', (walk / (INTRO.stride * 2)) % 2);
      // 문간(31, 6)에서 왼쪽으로 걸으며 바닥 쪽으로 4도트 내려온다
      return buildHomeScene(HOME_DOOR_PANEL.length - 1, {
        x: 31 - walk,
        y: 6 + Math.min(4, Math.floor(walk / 3)),
        step: walking && Math.floor(walk / INTRO.stride) % 2 === 1,
      });
    },
  },
};

function playIntro(scene, done) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
  document.getElementById('title').classList.add('leaving');
  document.getElementById('titleSub').textContent = scene.line;
  let t = 0;
  const tick = () => {
    t += 1;
    const grid = scene.frame(t);
    if (!grid) return endIntro();
    renderScene(grid, titleArt);
  };
  intro = { done, timer: setInterval(tick, INTRO.every) };
  tick(); // 첫 장은 바로 (2탄은 사무실 그림이 남아 보이지 않게)
}

function endIntro() {
  if (!intro) return;
  clearInterval(intro.timer);
  const done = intro.done;
  intro = null;
  document.getElementById('title').classList.remove('leaving');
  done();
}

// 지금 고를 수 있는 탄인가: 만들어졌고(open), 먼저 깨야 하는 탄(requires)을 깼다
// 주소에 ?unlock 을 붙이면 조건 없이 열린다 (만드는 중에 바로 해 보려고)
function stageOpen(stage) {
  if (!stage.open) return false;
  if (!stage.requires || params.has('unlock')) return true;
  return loadBest(STAGES.find((s) => s.id === stage.requires)) === 0;
}

// 탄을 바꾼다: 그 탄의 아이템 버튼으로 갈아 끼운다 (나머지는 판을 시작할 때 STAGE 에서 읽는다)
function setStage(stage) {
  if (stage === STAGE) return;
  STAGE = stage;
  buildItemButtons();
  refreshOutfit(); // 옷을 따로 안 골랐으면 탄의 기본 옷으로 바뀐다
}

function startGame(stage = STAGES[0]) {
  closeDialog();
  if (intro) return;
  const scene = INTROS[stage.id];
  const begin = scene ? (done) => playIntro(scene, done) : (done) => done();
  begin(() => {
    state.screen = 'play';
    document.getElementById('title').className = '';
    setStage(stage);
    newRun(pendingSeed || randomSeed());
    pendingSeed = null;
    const rec = loadRecords();
    rec.plays += 1;
    saveJson(storeKey('records'), rec);
  });
}

// 도감 카드 — 적·아이템 데이터에서 만든다 (데이터를 고치면 도감도 따라온다)
const AI_TAG = {
  melee: '근접', ranged: '원거리', grab: '붙잡기', wander: '적 부르기 (공격 안 함)', boss: '보스',
};

function firstFloorOf(kind, stage) {
  for (let f = stage.topFloor; f >= 1; f--) {
    if (stage.enemiesPerFloor[f][kind]) return f;
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

// 아직 못 만난 칸: 그림을 검은 실루엣으로
function silhouette(sprite) {
  const c = document.createElement('canvas');
  c.width = sprite.width;
  c.height = sprite.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#4a4458';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// 도감 — 열 때마다 기록을 읽어 새로 만든다
function buildDex() {
  const dex = loadDex();
  const fill = (listId, countId, entries, group) => {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    let seen = 0;
    for (const [kind, sprite, name, tags, desc, verb] of entries) {
      const n = dex[group][kind] || 0;
      if (n > 0) {
        seen += 1;
        const card = manualCard(sprite, name, tags, desc);
        const count = document.createElement('span');
        count.className = 'seen';
        count.textContent = verb + ' ' + n + '번';
        card.querySelector('.name').append(count);
        list.append(card);
      } else {
        const card = manualCard(silhouette(sprite), '???', [], '아직 만나지 못했다.');
        card.className = 'unknown';
        list.append(card);
      }
    }
    document.getElementById(countId).textContent = seen + ' / ' + entries.length;
  };
  // 열려 있는 모든 탄의 적 · 아이템을 탄 순서대로 모은다
  const stages = STAGES.filter((s) => s.open);
  fill('dexEnemies', 'dexEnemyCount', stages.flatMap((s) => Object.entries(s.enemies).map(([kind, t]) => [
    kind, SPRITES[kind].right[0], t.name,
    [[AI_TAG[t.ai], 'tag'], [t.boss ? s.text.bossWhere : s.text.floorName(firstFloorOf(kind, s)) + ' 부터', 'tag where']], t.desc, s.text.dexVerb,
  ])), 'enemies');
  fill('dexItems', 'dexItemCount', stages.flatMap((s) => Object.entries(s.items).map(([kind, t]) => [
    kind, SPRITES[kind], t.name, [[t.tag, 'tag'], [t.key + ' 키', 'tag where']], t.desc, '먹음',
  ])), 'items');
}

// 창 (게임 방법 · 도감 · 탄 고르기 · 환경설정): 한 번에 하나만 연다
function openDialogId() {
  const open = document.querySelector('.dialog.show');
  return open ? open.id : null;
}

function openDialog(id) {
  closeDialog();
  const el = document.getElementById(id);
  el.classList.add('show');
  el.querySelector('.panel').scrollTop = 0;
  if (id === 'dex') buildDex();
  if (id === 'records') {
    recordStage = stageOpen(STAGE) ? STAGE : STAGES[0];
    buildRecords();
  }
  if (id === 'stages') buildStageList();
  if (id === 'shop') buildShop();
}

// 상점 — data.js 의 OUTFITS 로 만든다. 사거나 갈아입을 때마다 새로 그린다
// 맨 위 "탄에 맞게" = 옷을 따로 고르지 않은 상태 (탄마다 기본 옷)
function buildShop() {
  const wallet = loadWallet();
  document.getElementById('shopMoney').textContent = wallet.money + WAGE.unit;
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  const sprite = (o) => {
    if (!heroWalkers[o.id]) heroWalkers[o.id] = makeWalker(o.colors);
    return heroWalkers[o.id].right[0];
  };
  const save = (change) => {
    change(wallet);
    saveJson(WALLET_KEY, wallet);
    refreshOutfit();
    buildShop();
  };
  const row = (id, img, name, desc, price, owned) => {
    const wearing = wallet.outfit === id;
    const card = manualCard(img, name, owned || !price ? [] : [[price + WAGE.unit, 'tag']], desc);
    const btn = document.createElement('button');
    if (wearing) {
      btn.textContent = '입는 중';
      btn.disabled = true;
      card.classList.add('wearing');
    } else if (owned) {
      btn.textContent = '입기';
      btn.addEventListener('click', () => {
        sfx('item');
        save((w) => { w.outfit = id; });
      });
    } else {
      btn.textContent = '사기';
      btn.className = 'buy';
      btn.disabled = wallet.money < price; // 돈이 모자라면 못 누른다
      btn.addEventListener('click', () => {
        sfx('perk');
        save((w) => { // 사면 바로 입는다
          w.money -= price;
          w.owned.push(id);
          w.outfit = id;
        });
      });
    }
    card.append(btn);
    list.append(card);
  };
  const names = STAGES.filter((s) => s.outfit).map((s) => OUTFITS.find((o) => o.id === s.outfit).name);
  row('auto', sprite(OUTFITS[0]), '탄에 맞게', '탄마다 알아서 갈아입는다 (' + names.join(' · ') + ').', 0, true);
  for (const o of OUTFITS) row(o.id, sprite(o), o.name, o.desc, o.price, ownsOutfit(wallet, o));
}

// 탄 고르기 — data.js 의 STAGES 로 만든다. 열 때마다 최고 기록을 새로 읽는다
function buildStageList() {
  const list = document.getElementById('stageList');
  list.innerHTML = '';
  const button = (title, lines, onClick) => {
    const btn = document.createElement('button');
    const b = document.createElement('b');
    b.textContent = title;
    btn.append(b);
    for (const text of lines) {
      const span = document.createElement('span');
      span.textContent = text;
      btn.append(span);
    }
    if (onClick) {
      btn.addEventListener('click', () => {
        btn.blur();
        onClick();
      });
    } else {
      btn.disabled = true;
    }
    list.append(btn);
    return btn;
  };
  STAGES.forEach((stage) => {
    const lines = [stage.desc];
    if (stageOpen(stage)) lines.push(bestText(stage));
    else if (stage.open) lines.push(STAGES.find((s) => s.id === stage.requires).name.split(' ')[0] + '을 깨면 열린다');
    button(stage.name, lines, stageOpen(stage) ? () => startGame(stage) : null);
  });
}

// 기록 — 탄마다 따로 보여 준다. 열 때마다 저장된 값을 읽어 새로 만든다
// 열린 탄이 둘 이상이면 위에 탄 단추가 생긴다. 창을 열면 마지막에 한 탄(STAGE)부터 보여 준다
// 말(출근 · 퇴근 성공 …)은 탄 묶음의 text.records
let recordStage = STAGES[0];

function buildRecords() {
  const stage = recordStage;
  const t = stage.text.records;
  const rec = loadRecords(stage);
  const dex = loadDex();
  // 도감은 탄을 가리지 않고 한곳에 모으므로, 이 탄의 적 · 아이템만 더한다
  const sum = (counts, kinds) => Object.keys(kinds).reduce((a, k) => a + (counts[k] || 0), 0);
  const best = loadBest(stage);
  const score = loadBestScore(stage);
  const none = '—';

  const tabs = document.getElementById('recordTabs');
  tabs.innerHTML = '';
  const open = STAGES.filter(stageOpen);
  if (open.length > 1) {
    for (const s of open) {
      const btn = document.createElement('button');
      btn.textContent = s.name;
      btn.setAttribute('aria-pressed', String(s === stage));
      btn.addEventListener('click', () => {
        recordStage = s;
        buildRecords();
      });
      tabs.append(btn);
    }
  }

  const rows = [
    [t.plays, rec.plays + '번'],
    [t.clears, rec.clears + '번' + (rec.plays ? ' (' + Math.min(100, Math.round(100 * rec.clears / rec.plays)) + '%)' : '')],
    ['최고 점수', score === null ? none : score + '점'],
    [t.earliest, rec.bestOvertime === null ? none : clockOf(rec.bestOvertime, stage) + (rec.bestOvertime === 0 ? t.onTime : '')],
    [t.fastest, rec.bestTurns === null ? none : rec.bestTurns + '턴'],
    ['가장 멀리 간 곳', best === null ? none : t.reached(best)],
    [t.kills, sum(dex.enemies, stage.enemies) + t.killUnit],
    ['먹은 아이템', sum(dex.items, stage.items) + '개'],
  ];
  const stats = document.getElementById('recordStats');
  stats.innerHTML = '';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    if (v === none) dd.className = 'none';
    stats.append(dt, dd);
  }

  document.getElementById('recordRecentTitle').textContent = t.recentTitle;
  const recent = document.getElementById('recordRecent');
  recent.innerHTML = '';
  if (!rec.recent.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = t.empty;
    recent.append(li);
  }
  for (const r of rec.recent) {
    const li = document.createElement('li');
    const day = document.createElement('span');
    day.className = 'day';
    day.textContent = (Math.floor(r.date / 100) % 100) + '/' + (r.date % 100);
    const what = document.createElement('span');
    what.className = r.cleared ? 'win' : 'lose';
    what.textContent = r.cleared ? clockOf(r.overtime, stage) + ' ' + t.win : t.lose(r.floor);
    const detail = document.createElement('span');
    detail.className = 'detail';
    detail.textContent = r.cleared ? r.score + '점' : r.turn + '턴';
    li.append(day, what, detail);
    recent.append(li);
  }
}

function closeDialog() {
  document.querySelectorAll('.dialog.show').forEach((el) => el.classList.remove('show'));
}

// 환경설정 — 값은 sound.js 의 settings 에 있다
const volumeInput = document.getElementById('volume');
const volumeOut = document.getElementById('volumeOut');
const alarmInput = document.getElementById('alarmOn');
volumeInput.value = settings.volume;
volumeOut.textContent = settings.volume;
alarmInput.checked = settings.alarm;
volumeInput.addEventListener('input', () => {
  setVolume(Number(volumeInput.value));
  volumeOut.textContent = volumeInput.value;
});
volumeInput.addEventListener('change', () => sfx('item')); // 손을 떼면 들어 보기
alarmInput.addEventListener('change', () => setAlarmEnabled(alarmInput.checked));

for (const [btn, id] of [['startBtn', 'stages'], ['shopBtn', 'shop'],['manualBtn', 'manual'], ['dexBtn', 'dex'], ['recordsBtn', 'records'], ['settingsBtn', 'settings']]) {
  document.getElementById(btn).addEventListener('click', (e) => {
    e.currentTarget.blur();
    openDialog(id);
  });
}
document.getElementById('title').addEventListener('pointerdown', () => endIntro()); // 시작 연출 건너뛰기
document.querySelectorAll('.dialog').forEach((el) => {
  el.querySelector('.close').addEventListener('click', closeDialog);
  el.addEventListener('click', (e) => {
    if (e.target === el) closeDialog(); // 바깥을 누르면 닫기
  });
});
document.getElementById('restart').addEventListener('click', (e) => {
  e.currentTarget.blur();
  showTitle();
});

// 시작화면 뒤에도 그릴 맵이 있어야 해서 한 판을 미리 만들어 둔다 (퇴근하기에서 새로 시작)
newRun(pendingSeed || randomSeed());
showTitle();
draw();
