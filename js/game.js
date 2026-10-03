// 게임 상태 · 턴 처리 · 끝 (5~7)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 5. 게임 상태
// ─────────────────────────────────────────────
const params = new URLSearchParams(location.search);

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

const state = {
  seed: 0,
  turn: 0,
  floor: TOP_FLOOR,
  mental: HERO.maxMental,
  stat: { ...HERO },  // 이번 판 능력치 (강화로 바뀐다)
  perks: [],          // 받은 강화 이름
  choosing: false,    // 계단에서 강화를 고르는 중
  map: null,
  enemies: [],
  items: [],          // 바닥에 떨어진 아이템
  bag: { coffee: 0, annual: 0, half: 0 },
  annualTurns: 0,     // 연차: 남은 무적 턴
  halfTurns: 0,       // 반차: 공격력이 오른 남은 턴
  grab: null,         // 팀장님에게 붙잡힘 { by: 팀장님, turns: 남은 턴 }
  overtime: 0,        // 퇴근 시간이 밀린 분 (18:00 + overtime)
  over: false,        // 퇴근 성공 또는 멘탈 붕괴
  screen: 'title',    // title(시작화면) · play(게임 중). 결과 화면은 play + over
  rng: Math.random,   // 판 안의 무작위(상사 걸음, 대사). 시드가 같으면 같은 판
  hero: { x: 0, y: 0, facing: 1, step: 0, anim: { fromX: 0, fromY: 0, start: 0 } },
  throwCd: 0,         // 볼펜 던지기 남은 대기 턴
  popups: [],         // 피해 숫자 (연출)
  shots: [],          // 고객사가 던진 서류 · 주인공이 던진 볼펜 (연출)
  shake: 0,
};

function enterFloor(floorNo) {
  beginAction(); // 새 층에선 메시지를 새로 시작
  state.floor = floorNo;
  const rng = mulberry32(state.seed + floorNo * 7919);
  state.map = generateFloor(floorNo, rng);
  state.enemies = spawnEnemies(state.map, floorNo, rng);
  state.items = spawnItems(state.map, state.enemies, rng);
  const h = state.hero;
  h.x = state.map.start.x;
  h.y = state.map.start.y;
  h.anim = { fromX: h.x, fromY: h.y, start: 0 };
  state.grab = null;
  state.popups = [];
  state.shots = [];
  say(floorNo === 1
    ? '1F 로비. 그런데 사장님이 출구를 막고 있다! 지금 ' + clockText() + '.'
    : floorNo + 'F. 계단으로 내려가자. 모두 퇴근시키면 강화 보너스!');
  updateHud();
}

// 계단: 강화 두 장을 보여 주고, 고르면 다음 층으로
function offerPerks() {
  state.choosing = true;
  const pool = perkPool();
  const picks = [];
  while (picks.length < 2 && pool.length) {
    picks.push(pool.splice(Math.floor(state.rng() * pool.length), 1)[0]);
  }
  const cards = document.querySelector('#perk .cards');
  cards.innerHTML = '';
  picks.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.innerHTML = '<span class="key">' + (i + 1) + '</span><b>' + p.name + '</b><span>' + p.desc + '</span>';
    btn.addEventListener('click', () => choosePerk(p));
    cards.appendChild(btn);
  });
  state.perkChoices = picks;
  document.getElementById('perk').className = 'show';
  updateHud();
}

// 강화 후보 (더 받아도 소용없는 건 뺀다)
function perkPool() {
  return PERKS.filter((p) => !p.available || p.available(state.stat));
}

function applyPerk(p) {
  p.apply(state.stat);
  state.mental = Math.min(state.stat.maxMental, state.mental);
  state.perks.push(p.name);
}

// 층의 마지막 적을 퇴근시키면 무작위 강화 하나 (1층은 로비 문이 열리는 걸로 대신한다)
function clearBonus() {
  const pool = perkPool();
  if (!pool.length) return;
  const p = pool[Math.floor(state.rng() * pool.length)];
  applyPerk(p);
  state.shake = 4;
  sfx('perk');
  say('모두 퇴근시켰다! 보너스 강화: ' + p.name + ' — ' + p.desc);
}

function choosePerk(p) {
  if (!state.choosing) return;
  state.choosing = false;
  document.getElementById('perk').className = '';
  applyPerk(p);
  sfx('perk');
  sfx('stairs', 0.35); // 강화음이 끝날 즈음 계단을 내려간다
  enterFloor(state.floor - 1);
  say('강화: ' + p.name + ' — ' + p.desc);
  giveFloorItems();
  updateHud();
}

// 사내 인맥: 층 시작마다 무작위 아이템
function giveFloorItems() {
  const kinds = Object.keys(ITEM_TYPES);
  for (let i = 0; i < state.stat.floorItems; i++) {
    const kind = kinds[Math.floor(state.rng() * kinds.length)];
    state.bag[kind] += 1;
    say('사내 인맥으로 ' + ITEM_TYPES[kind].name + '를 챙겼다.');
  }
}

// 받은 강화 목록: "기계식 키보드 ×2 · 텀블러"
function perksText() {
  const counts = new Map();
  for (const name of state.perks) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts].map(([name, n]) => (n > 1 ? name + ' ×' + n : name)).join(' · ');
}

// 판마다 새 시드 = 새 맵. 같은 판을 다시 보려면 주소에 ?seed=번호
function newRun(seed = randomSeed()) {
  state.seed = seed;
  state.rng = mulberry32(seed ^ 0x5eed);
  document.getElementById('seed').textContent = '시드 ' + seed;
  state.turn = 0;
  state.stat = { ...HERO };
  state.perks = [];
  state.choosing = false;
  document.getElementById('perk').className = '';
  state.mental = HERO.maxMental;
  state.bag = { coffee: 0, annual: 0, half: 0 };
  state.annualTurns = 0;
  state.throwCd = 0;
  state.overtime = 0;
  state.clockTurns = 0;   // 사장님 없이 흐른 턴 (시계용)
  state.stats = { kills: 0, items: 0 };
  state.halfTurns = 0;
  state.over = false;
  clearTimeout(overlayTimer);
  document.getElementById('overlay').className = '';
  enterFloor(TOP_FLOOR);
}

function tileAt(x, y) {
  if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) return '#';
  return state.map.grid[y][x];
}

function enemyAt(x, y) {
  return state.enemies.find((e) => e.x === x && e.y === y);
}

// 적이 설 수 없는 칸 (출구 문 위에 서면 영영 못 나가므로 출구도 막는다)
function occupied(x, y) {
  return BLOCKING.has(tileAt(x, y))
    || tileAt(x, y) === 'E'
    || enemyAt(x, y)
    || (state.hero.x === x && state.hero.y === y);
}

// 1층 로비 문은 그 층의 적을 모두 퇴근시켜야 열린다. 열려 있으면 null
// 계단은 언제나 열려 있다 — 대신 그 층 적을 다 퇴근시키면 강화 보너스 (2026-10)
function lockedMessage(t) {
  if (t !== 'E') return null;
  if (bossAlive()) return '로비 문이 잠겨 있다. 사장님: "퇴근? 누가?"';
  const n = state.enemies.length;
  if (n === 0) return null;
  return '로비 문이 잠겨 있다. 남은 적 ' + n + '명을 먼저 퇴근시키자.';
}

function bossAlive() {
  return state.enemies.some((e) => e.type.ai === 'boss');
}

function clockText() {
  const m = 18 * 60 + state.overtime;
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

// ─────────────────────────────────────────────
// 6. 턴 처리 — 주인공이 한 번 행동하면 적이 한 번씩 행동
// ─────────────────────────────────────────────
const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function moveUnit(u, nx, ny) {
  u.anim = { fromX: u.x, fromY: u.y, start: performance.now() };
  if (nx !== u.x) u.facing = nx > u.x ? 1 : -1;
  u.x = nx;
  u.y = ny;
  u.step ^= 1;
}

function act(dir) {
  if (state.over || state.choosing || state.screen !== 'play') return;
  beginAction();
  const [dx, dy] = DIRS[dir];
  const h = state.hero;
  if (dx !== 0) h.facing = dx;

  {
    const nx = h.x + dx;
    const ny = h.y + dy;
    const target = enemyAt(nx, ny);
    if (target && state.grab && state.grab.by === target) {
      // 붙잡은 팀장님은 때릴 수 없다 — 버티거나 연차·반차로 빠져나온다
      state.shake = 4;
      say('팀장님한테 손을 댈 순 없다… (연차·반차로 탈출)');
    } else if (target) {
      sfx('attack');
      heroAttack(target);
    } else if (tileAt(nx, ny) === 'W') {
      // 정수기: 부딪히면 한 번 마신다 (턴을 쓴다). 멘탈이 꽉 차 있으면 아껴 둔다
      if (state.mental >= state.stat.maxMental) {
        state.shake = 6;
        say('정수기다. 지금은 목이 안 마르다.');
        return;
      }
      state.map.grid[ny][nx] = 'V';
      const heal = state.stat.coolerHeal + state.stat.healBonus;
      state.mental = Math.min(state.stat.maxMental, state.mental + heal);
      sfx('drink');
      say('정수기 물을 마셨다. 멘탈 +' + heal);
    } else if (BLOCKING.has(tileAt(nx, ny))) {
      state.shake = 6; // 막힘: 턴을 소모하지 않는다
      return;
    } else if (lockedMessage(tileAt(nx, ny))) {
      state.shake = 6; // 잠긴 계단/출구: 턴을 소모하지 않는다
      say(lockedMessage(tileAt(nx, ny)));
      return;
    } else if (state.grab) {
      // 붙잡힌 동안: 이동은 못 하지만 턴은 흐른다 (다른 적 공격·아이템은 가능)
      state.shake = 4;
      say('팀장님이 놓아주지 않는다… (연차·반차로 탈출)');
    } else {
      moveUnit(h, nx, ny);
      sfx('step', h.step);
      pickUp();
    }
  }

  endHeroAction();
}

// 볼펜 던지기 자동 조준: 같은 가로줄·세로줄에서 가려지지 않은 가장 가까운 적.
// 대각선은 안 된다 — 어디서든 맞히면 너무 쉬웠다 (2026-10 플레이 피드백)
// 붙잡은 팀장님은 고르지 않는다 (때릴 수 없으니 다른 적을 노린다)
function throwTarget() {
  const h = state.hero;
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (state.grab && state.grab.by === e) continue;
    if (e.x !== h.x && e.y !== h.y) continue; // 대각선 제외
    const d = Math.abs(e.x - h.x) + Math.abs(e.y - h.y);
    if (d > state.stat.throwRange || d >= bestD || !clearShot(h, e)) continue;
    best = e;
    bestD = d;
  }
  return best;
}

// 두 칸 사이 직선이 벽·가구·다른 적에 막히지 않았는지 (칸 중심을 잘게 따라가며 본다)
function clearShot(a, b) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 3;
  for (let i = 1; i < steps; i++) {
    const x = Math.round(a.x + ((b.x - a.x) * i) / steps);
    const y = Math.round(a.y + ((b.y - a.y) * i) / steps);
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (BLOCKING.has(tileAt(x, y)) || enemyAt(x, y)) return false;
  }
  return true;
}

// 볼펜 던지기: 가장 가까운 적에게 자동으로 날아간다.
// 맞힐 적이 없거나 대기 중이면 턴을 쓰지 않는다
function throwPen() {
  if (state.over || state.choosing || state.screen !== 'play') return;
  beginAction();
  if (state.throwCd > 0) {
    say('볼펜을 다시 집는 중… (' + state.throwCd + '턴)');
    return;
  }
  const h = state.hero;
  const target = throwTarget();
  if (!target) {
    say(state.grab
      ? '팀장님 말고는 맞힐 사람이 없다… (연차·반차로 탈출)'
      : state.stat.throwRange + '칸 안, 같은 줄에 보이는 적이 없다.');
    return;
  }
  if (target.x !== h.x) h.facing = target.x > h.x ? 1 : -1;
  state.shots.push({ fromX: h.x, fromY: h.y, toX: target.x, toY: target.y, start: performance.now(), pen: true });
  state.throwCd = state.stat.throwCooldown;
  sfx('throw');
  heroAttack(target, state.stat.throwDamage, '볼펜');
  endHeroAction();
}

// 주인공 행동 뒤 공통 처리: 계단/출구 → 턴 경과 → 적 행동
function endHeroAction() {
  const h = state.hero;
  const here = tileAt(h.x, h.y);
  if (here === '>') {
    offerPerks();
    return;
  }
  if (here === 'E') {
    finish(true);
    return;
  }

  state.turn += 1;
  clockTick();

  enemiesAct();
  if (state.annualTurns > 0) state.annualTurns -= 1;
  if (state.halfTurns > 0) state.halfTurns -= 1;
  if (state.throwCd > 0) state.throwCd -= 1;
  updateHud();
}

// 시계: 5층 18:00 부터. CLOCK.every 턴마다 30분, 00:00 이 되면 멈춘다 (판 전체로 이어진다)
// 75턴 = 2026-10 플레이 기록(2층 중간 526턴)으로 맞춤. 한 판 ~750턴이면 23시쯤 퇴근
const CLOCK = {
  every: 75,
  step: 30,
  max: 6 * 60,        // 18:00 + 6시간 = 00:00
};

function clockTick() {
  if (state.overtime >= CLOCK.max) return;
  const boss = state.enemies.find((e) => e.type.ai === 'boss');
  if (boss && boss.awake) {
    overtimeTick(boss); // 사장님을 만나면 시계가 빨라진다
    return;
  }
  state.clockTurns += 1;
  if (state.clockTurns % (CLOCK.every + state.stat.clockSlow) !== 0) return;
  addOvertime('');
}

function addOvertime(note) {
  state.overtime = Math.min(CLOCK.max, state.overtime + CLOCK.step);
  if (state.overtime >= CLOCK.max) {
    say('00:00. 막차가 끊겼다… 시계는 더 이상 보지 않기로 했다.' + note);
  } else {
    say('벌써 ' + clockText() + '.' + note);
  }
}

// 1층: 사장님이 나를 알아챈 뒤부터 퇴근 시간이 밀리고, 밀릴수록 사장님이 세진다
// (걸어가는 동안까지 세면 만나기 전에 이미 최대로 세져서 못 이긴다 — 2026-09-30 시뮬레이션)
function overtimeTick(boss) {
  boss.awakeTurns = (boss.awakeTurns || 0) + 1;
  if (boss.awakeTurns % BOSS.overtimeEvery !== 0) return;
  let note = '';
  if (state.stat.overtimeImmune) {
    note = ' (야근 면역: 사장님 공격력 그대로)';
  } else if (boss.bonus < BOSS.overtimeMaxBonus) {
    boss.bonus += 1;
    note = ' 사장님 공격력 +1';
  }
  addOvertime(' 사장님이 퇴근 시간을 밀었다.' + note);
}

function pickUp() {
  const h = state.hero;
  const item = state.items.find((it) => it.x === h.x && it.y === h.y);
  if (!item) return;
  state.items = state.items.filter((it) => it !== item);
  state.bag[item.kind] += 1;
  state.stats.items += 1;
  sfx('item');
  const type = ITEM_TYPES[item.kind];
  say(type.name + '를 주웠다. (' + type.key + '번으로 사용)');
}

function useItem(kind) {
  if (state.over || state.choosing || state.screen !== 'play') return;
  beginAction();
  if (state.bag[kind] <= 0) {
    say(ITEM_TYPES[kind].name + '가 없다.');
    return; // 턴을 쓰지 않는다
  }
  state.bag[kind] -= 1;
  const h = state.hero;
  const type = ITEM_TYPES[kind];
  if (kind === 'coffee') {
    const before = state.mental;
    state.mental = Math.min(state.stat.maxMental, state.mental + type.heal + state.stat.healBonus);
    popup(h.x, h.y, '+' + (state.mental - before), '#7fd6a8');
    say('커피를 마셨다. 정신이 든다.');
  } else if (kind === 'annual') {
    state.annualTurns = type.turns;
    say('연차를 냈다! ' + type.turns + '턴 동안 아무도 나를 건드릴 수 없다.');
  } else if (kind === 'half') {
    state.halfTurns = type.turns;
    say('반차를 냈다! 오전에 몰아서 끝낸다 — ' + type.turns + '턴 동안 공격력 ' + type.power + '배.');
  }
  // 연차·반차 = 회식 탈출
  if (kind !== 'coffee' && state.grab) {
    state.grab.by.cooldown = state.grab.by.type.grabCooldown;
    state.grab = null;
    say('회식에서 빠져나왔다!');
  }
  endHeroAction();
}

function heroAttack(e, dmg = state.stat.attack, weapon = '키보드') {
  // 반차 중: 공격력 1.5배 (올림 — 내림이면 3 → 4 라 세진 게 잘 안 느껴진다)
  const boosted = state.halfTurns > 0;
  if (boosted) dmg = Math.ceil(dmg * ITEM_TYPES.half.power);
  e.hp -= dmg;
  popup(e.x, e.y, '-' + dmg, boosted ? '#ff9f43' : '#ffe27a');
  if (e.hp <= 0) {
    removeEnemy(e);
    return;
  }
  say(weapon + '로 ' + e.type.short + '에게 ' + dmg + ' 피해.');
  if (e.type.ai === 'boss' && !e.enraged && e.hp <= e.maxHp * BOSS.enrageAt) {
    e.enraged = true;
    e.busy = 0;
    state.shake = 8;
    say('사장님이 넥타이를 풀었다! "오늘 아무도 못 가!" 이제 매 턴 움직인다.');
    return;
  }
  if (e.type.ai === 'wander') sangsaCall(e); // 맞으면 알아채고 부른다
  else e.awake = true;
}

function removeEnemy(e) {
  state.enemies = state.enemies.filter((o) => o !== e);
  state.stats.kills += 1;
  if (state.grab && state.grab.by === e) state.grab = null;
  if (e.type.ai === 'boss') {
    say('사장님을 먼저 퇴근시켰다!');
  } else if (e.type.ai === 'wander') {
    // 상사: 쓰러지면서 일을 떠넘긴다 → 남은 적 공격력 상승
    for (const o of state.enemies) o.bonus += SANGSA_DEATH_BUFF;
    say(e.type.obj + ' 먼저 퇴근시켰다. …그런데 일을 떠넘기고 갔다! 남은 적 공격력 +' + SANGSA_DEATH_BUFF);
  } else {
    say(e.type.obj + ' 먼저 퇴근시켰다.');
  }
  if (state.enemies.length === 0) {
    if (state.floor === 1) say('모두 퇴근했다. 로비 문이 열렸다!');
    else clearBonus();
  }
}

function attackOf(e) {
  return e.type.attack + e.bonus;
}

function pickLine(e) {
  return e.type.lines[Math.floor(state.rng() * e.type.lines.length)];
}

function enemiesAct() {
  const h = state.hero;
  const toHero = distances(state.map.grid, h, ENEMY_BLOCKING);
  for (const e of [...state.enemies]) {
    if (state.over) return;
    if (e.cooldown > 0) e.cooldown -= 1;
    const d = toHero[e.y][e.x];
    const adjacent = Math.abs(e.x - h.x) + Math.abs(e.y - h.y) === 1;

    if (e.type.ai === 'wander') {
      sangsaTurn(e, d);
      continue;
    }
    if (!e.awake && d >= 0 && d <= e.type.sight) e.awake = true;

    let acted = false;
    if (e.type.ai === 'boss') acted = bossTurn(e, adjacent);
    else if (e.type.ai === 'grab') acted = leaderTurn(e, adjacent);
    else if (e.type.ai === 'ranged') acted = clientTurn(e);
    else if (adjacent) {
      hurtHero(e, attackOf(e), pickLine(e));
      acted = true;
    }
    if (!acted && e.awake) chase(e, toHero, d);
  }
}

// 주인공 쪽으로 한 칸 (막혀 있으면 이번 턴은 쉰다)
function chase(e, toHero, d) {
  const next = STEPS4
    .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
    .find((n) => toHero[n.y][n.x] >= 0 && toHero[n.y][n.x] < d && !occupied(n.x, n.y));
  if (next) moveUnit(e, next.x, next.y);
}

// 사장님: 알아채면 n턴마다 동기를 옆에 불러오고, 옆에 오면 때린다
function bossActEvery(e) {
  return e.enraged ? 1 : BOSS.actEvery;
}

function bossTurn(e, adjacent) {
  if (!e.awake) return true; // 알아채기 전엔 출구 앞에서 기다린다
  if (!e.started) {
    e.started = true;
    e.cooldown = BOSS.firstSummonDelay;
    e.busy = 0;
  }
  // 바쁜 사장님: actEvery 턴에 한 번만 움직이거나 때린다 (분노하면 매 턴)
  if (bossActEvery(e) > 1) {
    e.busy = (e.busy + 1) % bossActEvery(e);
    if (e.busy !== 0) return true;
  }
  const summoned = state.enemies.filter((o) => o.summoned).length;
  if (e.cooldown === 0 && summoned < BOSS.maxSummons) {
    const spot = STEPS4
      .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
      .find((p) => !occupied(p.x, p.y));
    if (spot) {
      const d = makeEnemy('donggi', spot.x, spot.y);
      d.awake = true;
      d.summoned = true;
      d.bonus = e.bonus; // 야근한 만큼 불려 온 동기도 세다
      state.enemies.push(d);
      e.cooldown = BOSS.summonEvery;
      say('사장님: "다들 모여, 긴급 회의다!" 동기가 불려 왔다.');
      return true;
    }
  }
  if (adjacent) {
    hurtHero(e, attackOf(e), pickLine(e));
    return true;
  }
  return false; // 쫓아간다
}

// 팀장님: 붙잡기 → 매 턴 멘탈 조금씩 → n턴 뒤 풀어 줌 → 한동안은 그냥 때림
function leaderTurn(e, adjacent) {
  const t = e.type;
  if (state.grab && state.grab.by === e) {
    state.grab.turns -= 1;
    hurtHero(e, t.grabDamage + e.bonus, pickLine(e));
    if (!state.over && state.grab && state.grab.turns <= 0) {
      state.grab = null;
      e.cooldown = t.grabCooldown;
      say('팀장님: "1차만 하고 가~" 겨우 풀려났다.');
    }
    return true;
  }
  if (!adjacent) return false;
  e.facing = state.hero.x > e.x ? 1 : state.hero.x < e.x ? -1 : e.facing;
  if (e.cooldown === 0 && !state.grab) {
    if (state.annualTurns > 0) {
      say('연차 중이라 회식 제안을 정중히 거절했다.');
      return true;
    }
    const turns = Math.max(1, t.grabTurns - state.stat.grabResist);
    state.grab = { by: e, turns };
    state.shake = 6;
    say('팀장님: "오늘 회식 알지?" 붙잡혔다! (연차·반차로 탈출 / ' + turns + '턴 뒤 풀려남)');
    return true;
  }
  hurtHero(e, attackOf(e), '팀장님이 어깨를 툭 친다. "다음엔 꼭 와~"');
  return true;
}

// 고객사: 같은 줄로 막힘 없이 보이면 던지고, 다음 턴은 쉰다
function clientTurn(e) {
  if (!e.awake || !lineOfFire(e)) return false;
  if (e.cooldown > 0) return true; // 다음 요청 작성 중 (제자리)
  const h = state.hero;
  e.facing = h.x > e.x ? 1 : h.x < e.x ? -1 : e.facing;
  state.shots.push({ fromX: e.x, fromY: e.y, toX: h.x, toY: h.y, start: performance.now() });
  hurtHero(e, attackOf(e), pickLine(e));
  e.cooldown = 2; // 턴 시작에 1 줄어드므로 "던지고 1턴 쉼"
  return true;
}

function lineOfFire(e) {
  const h = state.hero;
  if (e.x !== h.x && e.y !== h.y) return false;
  const dist = Math.abs(e.x - h.x) + Math.abs(e.y - h.y);
  if (dist > e.type.range) return false;
  const sx = Math.sign(h.x - e.x);
  const sy = Math.sign(h.y - e.y);
  for (let i = 1; i < dist; i++) {
    const x = e.x + sx * i;
    const y = e.y + sy * i;
    if (BLOCKING.has(tileAt(x, y)) || enemyAt(x, y)) return false;
  }
  return true;
}

// 상사: 평소엔 돌아다니기만. 가까이 오면 같은 방 적을 부른다
function sangsaTurn(e, d) {
  if (e.cooldown === 0 && d >= 0 && d <= e.type.notice) {
    sangsaCall(e);
    return;
  }
  if (state.rng() < 0.5) {
    const options = STEPS4
      .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
      .filter((n) => !occupied(n.x, n.y));
    if (options.length) {
      const n = options[Math.floor(state.rng() * options.length)];
      moveUnit(e, n.x, n.y);
    }
  }
}

function sangsaCall(e) {
  if (e.cooldown > 0) return;
  e.cooldown = e.type.callCooldown;
  const h = state.hero;
  e.facing = h.x > e.x ? 1 : h.x < e.x ? -1 : e.facing;
  // 같은 방 적. 상사가 복도에 있으면 6칸 안
  const room = roomAt(state.map, e.x, e.y);
  const near = distances(state.map.grid, e, ENEMY_BLOCKING);
  let called = 0;
  for (const o of state.enemies) {
    if (o === e || o.type.ai === 'wander') continue;
    const inRange = room
      ? roomAt(state.map, o.x, o.y) === room
      : near[o.y][o.x] >= 0 && near[o.y][o.x] <= 6;
    if (inRange) {
      o.awake = true;
      called += 1;
    }
  }
  say(called ? pickLine(e) : '상사: "이거 누가 좀 해 봐." …아무도 없다.');
}

function hurtHero(e, dmg, line) {
  const h = state.hero;
  e.facing = h.x > e.x ? 1 : h.x < e.x ? -1 : e.facing;
  if (state.annualTurns > 0) {
    popup(h.x, h.y, '0', '#7fd6a8');
    say('연차 중이라 ' + e.type.short + '의 연락을 받지 않았다.');
    return;
  }
  dmg = Math.max(1, dmg - state.stat.guard);
  state.mental -= dmg;
  state.shake = 8;
  h.hitAt = performance.now(); // 맞은 순간: 주인공이 좌우로 흔들린다
  popup(h.x, h.y, '-' + dmg, '#ff7a7a');
  say(line + ' 멘탈 -' + dmg);
  if (state.mental <= 0) {
    state.mental = 0;
    finish(false); // 죽는 소리는 finish 가 낸다
  } else {
    sfx('hurt');
  }
}

// ─────────────────────────────────────────────
// 7. 끝 — 퇴근 성공 / 멘탈 붕괴, 최고 기록
//    기록: 0 = 퇴근 성공, 1~5 = 도달한 가장 낮은 층
// ─────────────────────────────────────────────
const BEST_KEY = 'exit-company.best';
const BEST_SCORE_KEY = 'exit-company.bestScore';

// 최종 점수 (퇴근 성공했을 때만). 빨리·많이·덜 야근할수록 높다
const SCORE = {
  clear: 1000,        // 퇴근 성공
  perKill: 30,        // 퇴근시킨 적 (사장님이 불러온 동기 포함)
  perItem: 20,        // 주운 아이템
  perMental: 10,      // 남은 멘탈
  perTurn: -1,        // 걸린 턴 (야근 시간은 턴에서 나오므로 따로 깎지 않는다)
};

function scoreLines() {
  return [
    ['퇴근 성공', SCORE.clear],
    ['퇴근시킨 적 ' + state.stats.kills + '명', state.stats.kills * SCORE.perKill],
    ['모은 아이템 ' + state.stats.items + '개', state.stats.items * SCORE.perItem],
    ['남은 멘탈 ' + state.mental, state.mental * SCORE.perMental],
    ['걸린 턴 ' + state.turn, state.turn * SCORE.perTurn],
  ];
}

// 이번 점수를 저장하고, 이전 최고 점수를 돌려준다
function saveBestScore(score) {
  let prev = null;
  try {
    const v = localStorage.getItem(BEST_SCORE_KEY);
    prev = v === null ? null : Number(v);
    if (prev === null || score > prev) localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch (e) {
    // 저장이 막힌 환경에서는 비교만 못 한다
  }
  return prev;
}

function showScore(cleared) {
  const box = document.getElementById('score');
  if (!cleared) {
    box.className = '';
    box.innerHTML = '';
    return;
  }
  const lines = scoreLines();
  const total = Math.max(0, lines.reduce((sum, [, v]) => sum + v, 0));
  const prev = saveBestScore(total);
  const sign = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');
  box.innerHTML = '<div class="total">' + total + ' <small>점</small></div>'
    + '<dl>' + lines.map(([k, v]) => '<dt>' + k + '</dt><dd' + (v < 0 ? ' class="minus"' : '') + '>' + sign(v) + '</dd>').join('') + '</dl>'
    + (prev === null || total > prev
      ? '<div class="new">최고 점수!</div>'
      : '<div class="new" style="color: var(--muted)">최고 점수 ' + prev + '</div>');
  box.className = 'show';
}

function loadBest() {
  try {
    const v = localStorage.getItem(BEST_KEY);
    return v === null ? null : Number(v);
  } catch (e) {
    return null;
  }
}

function saveBest(reached) {
  const prev = loadBest();
  const best = prev === null ? reached : Math.min(prev, reached);
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch (e) {
    // 저장이 막힌 환경(시크릿 창 등)에서는 기록만 못 남긴다
  }
  return best;
}

let overlayTimer = 0; // 결과 화면을 늦게 띄우는 타이머 (그 사이 시작화면으로 가면 취소)

function finish(cleared) {
  state.over = true;
  if (!cleared) sfx('death');
  updateHud();
  const best = saveBest(cleared ? 0 : state.floor);
  const overlay = document.getElementById('overlay');
  document.getElementById('overlayTitle').textContent = cleared ? '퇴근 성공!' : '멘탈 붕괴…';
  const late = state.overtime > 0
    ? ' (야근 ' + ((state.overtime >= 60 ? Math.floor(state.overtime / 60) + '시간 ' : '')
      + (state.overtime % 60 ? (state.overtime % 60) + '분' : '')).trim() + ')'
    : ' (정시 퇴근!)';
  document.getElementById('result').textContent = cleared
    ? '퇴근 시각 ' + clockText() + late
    : state.floor + 'F 에서 쓰러졌다. (' + state.turn + '턴)';
  showScore(cleared);
  document.getElementById('perks').textContent = state.perks.length ? '받은 강화: ' + perksText() : '';
  // 퇴근 성공이면 점수 쪽에 최고 점수가 나오므로 층 기록은 실패했을 때만
  document.getElementById('best').textContent = cleared ? '' : '최고 기록: '
    + (best === 0 ? '퇴근 성공' : best + 'F 까지');
  overlayTimer = setTimeout(() => {
    overlay.className = cleared ? 'show scored' : 'show lose';
  }, 250);
}

// 한 행동 동안 생긴 메시지를 모아서 보여 준다 (붙잡힘 + 피해가 한 턴에 같이 나오는 경우 등)
let messages = [];

function beginAction() {
  messages = [];
}

function say(text) {
  messages.push(text);
  document.getElementById('msg').textContent = messages.join(' ');
}

function updateHud() {
  const clock = document.getElementById('clock');
  clock.textContent = clockText();
  clock.className = state.overtime >= CLOCK.max ? 'midnight'
    : state.overtime < 3 * 60 ? 'ok' : state.overtime < 5 * 60 ? '' : 'late';
  document.getElementById('enemiesLeft').textContent = state.enemies.length;
  document.getElementById('itemsLeft').textContent = state.items.length;
  const throwBtn = document.getElementById('throwBtn');
  throwBtn.textContent = state.throwCd > 0 ? '던지기 ' + state.throwCd : '던지기';
  throwBtn.disabled = state.throwCd > 0;
  document.getElementById('floor').textContent = state.floor + 'F';
  const m = document.getElementById('mental');
  m.textContent = state.mental + '/' + state.stat.maxMental;
  const low = state.mental <= HERO.lowMental && !state.over;
  m.className = state.mental <= HERO.lowMental ? 'low' : '';
  document.getElementById('stage').classList.toggle('danger', low);
  setAlarm(low && state.screen === 'play');

  for (const kind of Object.keys(ITEM_TYPES)) {
    document.getElementById('n-' + kind).textContent = state.bag[kind];
    const btn = document.querySelector('#items [data-item="' + kind + '"]');
    btn.disabled = state.bag[kind] <= 0;
    // 회식 탈출 아이템(연차·반차)을 가지고 있으면 강조
    // 멘탈이 낮으면 커피를 강조
    const need = kind === 'coffee' ? low : !!state.grab;
    btn.classList.toggle('hint', need && state.bag[kind] > 0);
  }
  const effects = [];
  if (state.grab) effects.push('<b class="bad">회식 ' + state.grab.turns + '턴</b>');
  if (state.annualTurns > 0) effects.push('<b>연차 ' + state.annualTurns + '턴</b>');
  if (state.halfTurns > 0) effects.push('<b>반차 ' + state.halfTurns + '턴</b>');
  document.getElementById('status').innerHTML = effects.map((t) => ' · ' + t).join('');

  // 보스 체력 막대: 사장님이 알아챈 뒤부터
  const boss = state.enemies.find((e) => e.type.ai === 'boss');
  const bar = document.getElementById('bossbar');
  bar.className = boss && boss.awake && !state.over ? 'show' : '';
  if (boss) {
    document.getElementById('bossfill').style.width = (100 * boss.hp / boss.maxHp) + '%';
    document.getElementById('bossfill').style.background = boss.enraged ? 'var(--danger)' : '';
    document.getElementById('bossbonus').textContent = boss.bonus > 0 ? ' 공격력 +' + boss.bonus : '';
  }
}

function popup(x, y, text, color) {
  state.popups.push({ x, y, text, color, start: performance.now() });
}
