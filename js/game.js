// 게임 상태 · 턴 처리 · 끝 (5~7)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 5. 게임 상태
// ─────────────────────────────────────────────
const params = new URLSearchParams(location.search);

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

// 가방: 지금 탄의 아이템 종류마다 0개에서 시작 { coffee: 0, annual: 0, half: 0 }
function emptyBag() {
  return Object.fromEntries(Object.keys(STAGE.items).map((kind) => [kind, 0]));
}

const state = {
  seed: 0,
  turn: 0,
  floor: STAGE.topFloor,
  mental: STAGE.hero.maxMental,
  stat: { ...STAGE.hero },  // 이번 판 능력치 (강화로 바뀐다)
  perks: [],          // 받은 강화 이름
  choosing: false,    // 계단에서 강화를 고르는 중
  map: null,
  enemies: [],
  items: [],          // 바닥에 떨어진 아이템
  bag: emptyBag(),
  buffs: {},          // 쓴 아이템의 남은 효과 턴 { annual: 3 } — 무적·공격력 같은 효과는 아이템 표에서 읽는다
  grab: null,         // 붙잡힘 { by: 붙잡은 적, turns: 남은 턴 }
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
  say(STAGE.text.floorIntro(floorNo, clockText()));
  updateHud();
}

// 지금 걸려 있는 아이템 효과 중 flag(invincible · power) 를 가진 것의 종류. 없으면 undefined
function activeBuff(flag) {
  return Object.keys(state.buffs).find((kind) => state.buffs[kind] > 0 && STAGE.items[kind][flag]);
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
  document.getElementById('perkTitle').textContent = STAGE.text.perkTitle;
  document.getElementById('perk').className = 'show';
  updateHud();
}

// 강화 후보 (더 받아도 소용없는 건 뺀다)
function perkPool() {
  return STAGE.perks.filter((p) => !p.available || p.available(state.stat));
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
  say(STAGE.text.clearBonus + p.name + ' — ' + p.desc);
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

// 강화 floorItems (1탄 "사내 인맥"): 층 시작마다 무작위 아이템
function giveFloorItems() {
  const kinds = Object.keys(STAGE.items);
  for (let i = 0; i < state.stat.floorItems; i++) {
    const kind = kinds[Math.floor(state.rng() * kinds.length)];
    state.bag[kind] += 1;
    say(STAGE.text.floorItem(STAGE.items[kind]));
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
  state.stat = { ...STAGE.hero };
  state.perks = [];
  state.choosing = false;
  document.getElementById('perk').className = '';
  state.mental = STAGE.hero.maxMental;
  state.bag = emptyBag();
  state.buffs = {};
  state.throwCd = 0;
  state.overtime = 0;
  state.clockTurns = 0;   // 보스 없이 흐른 턴 (시계용)
  state.stats = { kills: 0, items: 0 };
  state.over = false;
  clearTimeout(overlayTimer);
  document.getElementById('overlay').className = '';
  enterFloor(STAGE.topFloor);
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
    || TILES[tileAt(x, y)].noEnemy
    || enemyAt(x, y)
    || (state.hero.x === x && state.hero.y === y);
}

// 1층 로비 문은 그 층의 적을 모두 퇴근시켜야 열린다. 열려 있으면 null
// 계단은 언제나 열려 있다 — 대신 그 층 적을 다 퇴근시키면 강화 보너스 (2026-10)
function lockedMessage(t) {
  if (TILES[t].goal !== 'exit') return null;
  const boss = findBoss();
  if (boss) return boss.type.lockLine;
  const n = state.enemies.length;
  if (n === 0) return null;
  return STAGE.text.exitLocked(n);
}

// 살아 있는 보스 (없으면 undefined)
function findBoss() {
  return state.enemies.find((e) => e.type.boss);
}

function clockText() {
  return clockOf(state.overtime);
}

// 야근한 분 → 시각 ("21:30")
function clockOf(overtime, stage = STAGE) {
  const m = stage.clock.start + overtime;
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
    const drink = TILES[tileAt(nx, ny)].drink;
    if (target && state.grab && state.grab.by === target) {
      // 붙잡은 적은 때릴 수 없다 — 버티거나 탈출 아이템으로 빠져나온다
      state.shake = 4;
      say(target.type.holdAttackLine);
    } else if (target) {
      sfx('attack');
      heroAttack(target);
    } else if (drink) {
      // 정수기: 부딪히면 한 번 마신다 (턴을 쓴다). 멘탈이 꽉 차 있으면 아껴 둔다
      if (state.mental >= state.stat.maxMental) {
        state.shake = 6;
        say(drink.fullLine);
        return;
      }
      state.map.grid[ny][nx] = drink.becomes;
      const heal = state.stat.coolerHeal + state.stat.healBonus;
      state.mental = Math.min(state.stat.maxMental, state.mental + heal);
      sfx('drink');
      say(drink.line(heal, STAGE.text.hp));
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
      say(state.grab.by.type.holdMoveLine);
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
    say(STAGE.text.throwWait(state.throwCd));
    return;
  }
  const h = state.hero;
  const target = throwTarget();
  if (!target) {
    say(state.grab
      ? state.grab.by.type.holdThrowLine
      : state.stat.throwRange + '칸 안, 같은 줄에 보이는 적이 없다.');
    return;
  }
  if (target.x !== h.x) h.facing = target.x > h.x ? 1 : -1;
  state.shots.push({ fromX: h.x, fromY: h.y, toX: target.x, toY: target.y, start: performance.now(), pen: true });
  state.throwCd = state.stat.throwCooldown;
  sfx('throw');
  heroAttack(target, state.stat.throwDamage, STAGE.text.thrown);
  endHeroAction();
}

// 주인공 행동 뒤 공통 처리: 계단/출구 → 턴 경과 → 적 행동
function endHeroAction() {
  const h = state.hero;
  const goal = TILES[tileAt(h.x, h.y)].goal;
  if (goal === 'stairs') {
    offerPerks();
    return;
  }
  if (goal === 'exit') {
    finish(true);
    return;
  }

  state.turn += 1;
  clockTick();

  enemiesAct();
  for (const kind of Object.keys(state.buffs)) {
    if (state.buffs[kind] > 0) state.buffs[kind] -= 1;
  }
  if (state.throwCd > 0) state.throwCd -= 1;
  updateHud();
}

// 시계 (수치는 data.js 의 CLOCK): every 턴마다 step 분, max 가 되면 멈춘다 (판 전체로 이어진다)
function clockTick() {
  const clock = STAGE.clock;
  if (state.overtime >= clock.max) return;
  const boss = findBoss();
  if (boss && boss.awake) {
    overtimeTick(boss); // 보스를 만나면 시계가 빨라진다
    return;
  }
  state.clockTurns += 1;
  if (state.clockTurns % (clock.every + state.stat.clockSlow) !== 0) return;
  addOvertime('');
}

function addOvertime(note) {
  const clock = STAGE.clock;
  state.overtime = Math.min(clock.max, state.overtime + clock.step);
  if (state.overtime >= clock.max) {
    say(clock.midnightLine + note);
  } else {
    say('벌써 ' + clockText() + '.' + note);
  }
}

// 보스가 나를 알아챈 뒤부터 퇴근 시간이 밀리고, 밀릴수록 보스가 세진다
// (걸어가는 동안까지 세면 만나기 전에 이미 최대로 세져서 못 이긴다 — 2026-09-30 시뮬레이션)
function overtimeTick(boss) {
  const t = boss.type;
  boss.awakeTurns = (boss.awakeTurns || 0) + 1;
  if (boss.awakeTurns % t.overtimeEvery !== 0) return;
  let note = '';
  if (state.stat.overtimeImmune) {
    note = t.overtimeImmuneLine;
  } else if (boss.bonus < t.overtimeMaxBonus) {
    boss.bonus += 1;
    note = t.overtimeUpLine;
  }
  addOvertime(t.overtimeLine + note);
}

function pickUp() {
  const h = state.hero;
  const item = state.items.find((it) => it.x === h.x && it.y === h.y);
  if (!item) return;
  state.items = state.items.filter((it) => it !== item);
  state.bag[item.kind] += 1;
  state.stats.items += 1;
  recordDex('items', item.kind);
  sfx('item');
  const type = STAGE.items[item.kind];
  say((type.obj || type.name + '를') + ' 주웠다. (' + type.key + '번으로 사용)');
}

// 아이템 효과는 data.js 의 아이템 표(heal · turns · escape …)대로 적용한다
function useItem(kind) {
  if (state.over || state.choosing || state.screen !== 'play') return;
  beginAction();
  const type = STAGE.items[kind];
  if (state.bag[kind] <= 0) {
    say((type.subj || type.name + '가') + ' 없다.');
    return; // 턴을 쓰지 않는다
  }
  state.bag[kind] -= 1;
  const h = state.hero;
  if (type.heal) {
    const before = state.mental;
    state.mental = Math.min(state.stat.maxMental, state.mental + type.heal + state.stat.healBonus);
    popup(h.x, h.y, '+' + (state.mental - before), '#7fd6a8');
  }
  if (type.turns) state.buffs[kind] = type.turns;
  say(typeof type.useLine === 'function' ? type.useLine(type) : type.useLine);
  // 탈출 아이템: 붙잡혀 있으면 빠져나온다
  if (type.escape && state.grab) {
    const by = state.grab.by;
    by.cooldown = by.type.grabCooldown;
    state.grab = null;
    say(by.type.escapeLine);
  }
  endHeroAction();
}

function heroAttack(e, dmg = state.stat.attack, weapon = STAGE.text.weapon) {
  // 공격력 배수 효과 중 (반차 1.5배). 올림 — 내림이면 3 → 4 라 세진 게 잘 안 느껴진다
  const boost = activeBuff('power');
  if (boost) dmg = Math.ceil(dmg * STAGE.items[boost].power);
  e.hp -= dmg;
  popup(e.x, e.y, '-' + dmg, boost ? '#ff9f43' : '#ffe27a');
  if (e.hp <= 0) {
    removeEnemy(e);
    return;
  }
  say(weapon + '로 ' + e.type.short + '에게 ' + dmg + ' 피해.');
  // 분노: 체력이 enrageAt 비율 아래로 떨어지면 매 턴 움직인다
  if (e.type.enrageAt && !e.enraged && e.hp <= e.maxHp * e.type.enrageAt) {
    e.enraged = true;
    e.busy = 0;
    state.shake = 8;
    say(e.type.enrageLine);
    return;
  }
  const ai = ENEMY_AI[e.type.ai];
  if (ai.onHit) ai.onHit(e); // 맞았을 때 따로 하는 행동이 있는 적
  else e.awake = true;
}

function removeEnemy(e) {
  state.enemies = state.enemies.filter((o) => o !== e);
  state.stats.kills += 1;
  recordDex('enemies', e.kind);
  if (state.grab && state.grab.by === e) state.grab = null;
  if (e.type.deathBuff) {
    // 쓰러지면서 일을 떠넘긴다 → 남은 적 공격력 상승 (쓰러뜨린 수만큼 쌓인다)
    for (const o of state.enemies) o.bonus += e.type.deathBuff;
    const leave = e.type.leaveLines[Math.floor(state.rng() * e.type.leaveLines.length)];
    say(STAGE.text.defeat(e.type.obj, false) + ' ' + leave + ' ' + e.type.deathBuffLine + e.type.deathBuff);
  } else {
    say(STAGE.text.defeat(e.type.obj, e.type.boss));
  }
  if (state.enemies.length === 0) {
    if (state.floor === 1) say(STAGE.text.exitOpen);
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

    // sight 가 없는 적(돌아다니는 상사)은 거리로는 알아채지 않는다
    if (!e.awake && d >= 0 && d <= e.type.sight) e.awake = true;

    const acted = ENEMY_AI[e.type.ai].act(e, adjacent, d);
    if (!acted && e.awake) chase(e, toHero, d);
  }
}

// 적 행동 규칙 — data.js 의 ai 이름으로 고른다. 새 행동은 여기 한 줄 + 함수 하나
//   act(e, adjacent, d): 이번 턴에 행동했으면 true. false 면 (알아챈 적은) 주인공을 쫓아간다
//   onHit(e): 맞았을 때. 없으면 그냥 알아챈다
const ENEMY_AI = {
  melee: { act: meleeTurn },
  ranged: { act: clientTurn },
  grab: { act: leaderTurn },
  wander: { act: sangsaTurn, onHit: sangsaCall }, // 맞으면 알아채고 부른다
  boss: { act: bossTurn },
};

// 근접: 옆에 있으면 때린다
function meleeTurn(e, adjacent) {
  if (!adjacent) return false;
  hurtHero(e, attackOf(e), pickLine(e));
  return true;
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
  return e.enraged ? 1 : e.type.actEvery;
}

function bossTurn(e, adjacent) {
  const t = e.type;
  if (!e.awake) return true; // 알아채기 전엔 출구 앞에서 기다린다
  if (!e.started) {
    e.started = true;
    e.cooldown = t.firstSummonDelay;
    e.busy = 0;
  }
  // 바쁜 사장님: actEvery 턴에 한 번만 움직이거나 때린다 (분노하면 매 턴)
  if (bossActEvery(e) > 1) {
    e.busy = (e.busy + 1) % bossActEvery(e);
    if (e.busy !== 0) return true;
  }
  const summoned = state.enemies.filter((o) => o.summoned).length;
  if (e.cooldown === 0 && summoned < t.maxSummons) {
    const spot = STEPS4
      .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
      .find((p) => !occupied(p.x, p.y));
    if (spot) {
      const d = makeEnemy(t.summonKind, spot.x, spot.y);
      d.awake = true;
      d.summoned = true;
      d.bonus = e.bonus; // 야근한 만큼 불려 온 동기도 세다
      state.enemies.push(d);
      e.cooldown = t.summonEvery;
      say(t.summonLine);
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
      say(t.releaseLine);
    }
    return true;
  }
  if (!adjacent) return false;
  e.facing = state.hero.x > e.x ? 1 : state.hero.x < e.x ? -1 : e.facing;
  if (e.cooldown === 0 && !state.grab) {
    if (activeBuff('invincible')) {
      say(t.declineLine);
      return true;
    }
    const turns = Math.max(1, t.grabTurns - state.stat.grabResist);
    state.grab = { by: e, turns };
    state.shake = 6;
    say(t.grabLine(turns));
    return true;
  }
  hurtHero(e, attackOf(e), t.pokeLine);
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
// (쫓아오지 않으므로 언제나 "행동함" 을 돌려준다)
function sangsaTurn(e, adjacent, d) {
  if (e.cooldown === 0 && d >= 0 && d <= e.type.notice) {
    sangsaCall(e);
    return true;
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
  return true;
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
    if (o === e || o.type.ai === e.type.ai) continue; // 같은 부류(상사)끼리는 부르지 않는다
    const inRange = room
      ? roomAt(state.map, o.x, o.y) === room
      : near[o.y][o.x] >= 0 && near[o.y][o.x] <= 6;
    if (inRange) {
      o.awake = true;
      called += 1;
    }
  }
  say(called ? pickLine(e) : e.type.aloneLine);
}

function hurtHero(e, dmg, line) {
  const h = state.hero;
  e.facing = h.x > e.x ? 1 : h.x < e.x ? -1 : e.facing;
  const guard = activeBuff('invincible');
  if (guard) {
    popup(h.x, h.y, '0', '#7fd6a8');
    say(STAGE.items[guard].guardLine(e.type.short));
    return;
  }
  dmg = Math.max(1, dmg - state.stat.guard);
  state.mental -= dmg;
  state.shake = 8;
  h.hitAt = performance.now(); // 맞은 순간: 주인공이 좌우로 흔들린다
  popup(h.x, h.y, '-' + dmg, '#ff7a7a');
  say(line + ' ' + STAGE.text.hp + ' -' + dmg);
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

// 저장 이름. 기록은 탄마다 따로 남긴다 — 1탄은 예전 이름 그대로 (exit-company.best), 다른 탄은 exit-company.home.best
function storeKey(name, stage = STAGE) {
  return 'exit-company.' + (stage === STAGES[0] ? '' : stage.id + '.') + name;
}

// 도감: 퇴근시킨 적 · 먹은 아이템 수. 판이 끝나도 남는다 { enemies: { donggi: 12 }, items: { coffee: 30 } }
// (탄을 가리지 않고 한곳에 모은다 — 적·아이템 종류 이름이 탄끼리 겹치지 않게 짓는다)
const DEX_KEY = 'exit-company.dex';

function loadDex() {
  try {
    const d = JSON.parse(localStorage.getItem(DEX_KEY)) || {};
    return { enemies: d.enemies || {}, items: d.items || {} };
  } catch (e) {
    return { enemies: {}, items: {} };
  }
}

function recordDex(group, kind) {
  const dex = loadDex();
  dex[group][kind] = (dex[group][kind] || 0) + 1;
  try {
    localStorage.setItem(DEX_KEY, JSON.stringify(dex));
  } catch (e) {
    // 저장이 막힌 환경에서는 기록만 못 남긴다
  }
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 저장이 막힌 환경에서는 기록만 못 남긴다
  }
}

// 통장과 옷장 (탄을 가리지 않고 하나). money = 모은 월급 · owned = 산 옷 · outfit = 입은 옷
// outfit 'auto' = 탄에 맞게 (1탄 셔츠 · 2탄 잠옷). 옷을 고르면 그 옷을 어느 탄에서나 입는다
const WALLET_KEY = 'exit-company.wallet';

function loadWallet() {
  return { money: 0, owned: [], outfit: 'auto', ...loadJson(WALLET_KEY) };
}

function ownsOutfit(wallet, outfit) {
  return outfit.price === 0 || wallet.owned.includes(outfit.id);
}

// 지금 입고 있는 옷 (고른 옷이 없거나 못 찾으면 이 탄의 기본 옷)
function currentOutfit() {
  const wallet = loadWallet();
  const picked = OUTFITS.find((o) => o.id === wallet.outfit && ownsOutfit(wallet, o));
  return picked || OUTFITS.find((o) => o.id === STAGE.outfit) || OUTFITS[0];
}

// 주인공 그림: 옷마다 한 번만 만들어 둔다. 매 프레임 불리므로 통장은 옷이나 탄이 바뀔 때만 다시 읽는다
const heroWalkers = {};
let heroOutfit = null;

function refreshOutfit() {
  heroOutfit = currentOutfit();
}

function heroWalker() {
  if (!heroOutfit) refreshOutfit();
  if (!heroWalkers[heroOutfit.id]) heroWalkers[heroOutfit.id] = makeWalker(heroOutfit.colors);
  return heroWalkers[heroOutfit.id];
}

// 판이 끝나면 월급이 들어온다. 받은 돈과 통장 잔액을 돌려준다
function payWage() {
  const pay = state.stats.kills * WAGE.perKill + state.stats.items * WAGE.perItem;
  const wallet = loadWallet();
  wallet.money += pay;
  saveJson(WALLET_KEY, wallet);
  return { pay, money: wallet.money };
}

// 기록 화면용 누적 기록. recent = 최근 판 (새 판이 앞)
const RECENT_MAX = 5;

function loadRecords(stage = STAGE) {
  return { plays: 0, clears: 0, bestOvertime: null, bestTurns: null, recent: [], ...loadJson(storeKey('records', stage)) };
}

// 최근 판에 적는 날짜 (20261011)
function todayKey(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// 판이 끝날 때 누적 기록을 남긴다. score = 퇴근 성공했을 때의 점수 (실패면 null)
function recordRun(cleared, score) {
  const rec = loadRecords();
  if (cleared) {
    rec.clears += 1;
    rec.bestOvertime = rec.bestOvertime === null ? state.overtime : Math.min(rec.bestOvertime, state.overtime);
    rec.bestTurns = rec.bestTurns === null ? state.turn : Math.min(rec.bestTurns, state.turn);
  }
  rec.recent.unshift({
    date: todayKey(), cleared, floor: state.floor, score, overtime: state.overtime, turn: state.turn,
  });
  rec.recent.length = Math.min(rec.recent.length, RECENT_MAX);
  saveJson(storeKey('records'), rec);
}

function loadBestScore(stage = STAGE) {
  try {
    const v = localStorage.getItem(storeKey('bestScore', stage));
    return v === null ? null : Number(v);
  } catch (e) {
    return null;
  }
}

// 최종 점수 (퇴근 성공했을 때만). 빨리·많이·덜 야근할수록 높다
const SCORE = {
  clear: 1000,        // 퇴근 성공
  perKill: 30,        // 퇴근시킨 적 (사장님이 불러온 동기 포함)
  perItem: 20,        // 주운 아이템
  perMental: 10,      // 남은 멘탈
  perTurn: -1,        // 걸린 턴 (야근 시간은 턴에서 나오므로 따로 깎지 않는다)
};

function scoreLines() {
  const t = STAGE.text;
  return [
    [t.score.clear, SCORE.clear],
    [t.score.kills(state.stats.kills), state.stats.kills * SCORE.perKill],
    [t.score.items(state.stats.items), state.stats.items * SCORE.perItem],
    ['남은 ' + t.hp + ' ' + state.mental, state.mental * SCORE.perMental],
    [t.score.turns(state.turn), state.turn * SCORE.perTurn],
  ];
}

// 이번 점수를 저장하고, 이전 최고 점수를 돌려준다
function saveBestScore(score) {
  let prev = null;
  try {
    const v = localStorage.getItem(storeKey('bestScore'));
    prev = v === null ? null : Number(v);
    if (prev === null || score > prev) localStorage.setItem(storeKey('bestScore'), String(score));
  } catch (e) {
    // 저장이 막힌 환경에서는 비교만 못 한다
  }
  return prev;
}

// 점수표를 띄우고 이번 점수를 돌려준다 (실패한 판은 점수가 없다 = null)
function showScore(cleared) {
  const box = document.getElementById('score');
  if (!cleared) {
    box.className = '';
    box.innerHTML = '';
    return null;
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
  return total;
}

function loadBest(stage = STAGE) {
  try {
    const v = localStorage.getItem(storeKey('best', stage));
    return v === null ? null : Number(v);
  } catch (e) {
    return null;
  }
}

function saveBest(reached) {
  const prev = loadBest();
  const best = prev === null ? reached : Math.min(prev, reached);
  try {
    localStorage.setItem(storeKey('best'), String(best));
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
  const t = STAGE.text;
  document.getElementById('overlayTitle').textContent = cleared ? t.win : t.lose;
  document.getElementById('result').textContent = cleared
    ? t.winResult(clockText(), state.overtime)
    : t.loseResult(state.floor, state.turn);
  document.getElementById('restart').textContent = t.restart;
  recordRun(cleared, showScore(cleared));
  document.getElementById('perks').textContent = state.perks.length ? '받은 강화: ' + perksText() : '';
  const wage = payWage();
  document.getElementById('wage').textContent = '월급 +' + wage.pay + WAGE.unit + ' (통장 ' + wage.money + WAGE.unit + ')';
  // 성공이면 점수 쪽에 최고 점수가 나오므로 층 기록은 실패했을 때만
  document.getElementById('best').textContent = cleared ? '' : t.best(best);
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
  clock.className = state.overtime >= STAGE.clock.max ? 'midnight'
    : state.overtime < 3 * 60 ? 'ok' : state.overtime < 5 * 60 ? '' : 'late';
  document.getElementById('enemiesLeft').textContent = state.enemies.length;
  document.getElementById('itemsLeft').textContent = state.items.length;
  const throwBtn = document.getElementById('throwBtn');
  throwBtn.textContent = state.throwCd > 0 ? '던지기 ' + state.throwCd : '던지기';
  throwBtn.disabled = state.throwCd > 0;
  document.getElementById('floor').textContent = STAGE.text.floorName(state.floor);
  document.getElementById('hpLabel').textContent = STAGE.text.hp;
  const m = document.getElementById('mental');
  m.textContent = state.mental + '/' + state.stat.maxMental;
  const low = state.mental <= STAGE.hero.lowMental && !state.over;
  m.className = state.mental <= STAGE.hero.lowMental ? 'low' : '';
  // 체력 막대: 남은 만큼 채우고, 절반 아래면 노랑 · 위험하면 빨강
  const ratio = Math.max(0, Math.min(1, state.mental / state.stat.maxMental));
  document.getElementById('hpFill').style.width = (100 * ratio) + '%';
  document.getElementById('hpBar').className = 'hpbar'
    + (state.mental <= STAGE.hero.lowMental ? ' low' : ratio <= 0.5 ? ' mid' : '');
  document.getElementById('stage').classList.toggle('danger', low);
  setAlarm(low && state.screen === 'play');

  for (const [kind, type] of Object.entries(STAGE.items)) {
    document.getElementById('n-' + kind).textContent = state.bag[kind];
    const btn = document.querySelector('#items [data-item="' + kind + '"]');
    btn.disabled = state.bag[kind] <= 0;
    // 지금 필요한 아이템을 가지고 있으면 강조: 멘탈이 낮으면 회복, 붙잡혔으면 탈출 아이템
    const need = type.heal ? low : !!(type.escape && state.grab);
    btn.classList.toggle('hint', need && state.bag[kind] > 0);
  }
  const effects = [];
  if (state.grab) effects.push('<b class="bad">' + state.grab.by.type.grabLabel + ' ' + state.grab.turns + '턴</b>');
  for (const [kind, type] of Object.entries(STAGE.items)) {
    if (state.buffs[kind] > 0) effects.push('<b>' + type.name + ' ' + state.buffs[kind] + '턴</b>');
  }
  document.getElementById('status').innerHTML = effects.map((t) => ' · ' + t).join('');

  // 보스 체력 막대: 보스가 알아챈 뒤부터
  const boss = findBoss();
  const bar = document.getElementById('bossbar');
  bar.className = boss && boss.awake && !state.over ? 'show' : '';
  document.getElementById('bossname').textContent = STAGE.boss ? STAGE.enemies[STAGE.boss.kind].name : '';
  if (boss) {
    document.getElementById('bossfill').style.width = (100 * boss.hp / boss.maxHp) + '%';
    document.getElementById('bossfill').style.background = boss.enraged ? 'var(--danger)' : '';
    document.getElementById('bossbonus').textContent = boss.bonus > 0 ? ' 공격력 +' + boss.bonus : '';
  }
}

function popup(x, y, text, color) {
  state.popups.push({ x, y, text, color, start: performance.now() });
}
