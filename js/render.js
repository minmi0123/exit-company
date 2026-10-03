// 그리기 (8)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 8. 그리기 — 주인공을 따라가는 카메라
// ─────────────────────────────────────────────
const VIEW_W = 15;
const VIEW_H = 11;
const MOVE_MS = 100;    // 한 칸 이동 연출 시간
const POPUP_MS = 600;   // 피해 숫자 표시 시간
const SHOT_MS = 180;    // 서류가 날아가는 시간
const canvas = document.getElementById('game');
canvas.width = VIEW_W * TILE;
canvas.height = VIEW_H * TILE;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function spriteFor(x, y) {
  const t = tileAt(x, y);
  if (t === '.') return SPRITES.floor;
  if (t === 'D') return SPRITES.desk;
  if (t === 'T') {
    // 회의 테이블 조각: 왼쪽/위가 테이블이면 오른쪽/아래 조각
    return SPRITES.meeting[(tileAt(x - 1, y) === 'T' ? 1 : 0) + (tileAt(x, y - 1) === 'T' ? 2 : 0)];
  }
  if (t === 'P') return SPRITES.plant;
  if (t === 'C') return SPRITES.copier;
  if (t === 'W') return SPRITES.cooler;
  if (t === 'V') return SPRITES.coolerEmpty;
  if (t === 'S') return SPRITES.shelf;
  if (t === '>') return SPRITES.stairs;
  if (t === 'E') return SPRITES.exit;
  // 벽: 아래가 바닥이면 앞면, 주변에 바닥이 있으면 윗면, 아니면 안 그림
  if (tileAt(x, y + 1) !== '#') return SPRITES.wall;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (tileAt(x + dx, y + dy) !== '#') return SPRITES.wallTop;
    }
  }
  return null;
}

// 3x5 도트 숫자 (캔버스 글꼴은 이 크기에서 뭉개져서 직접 그린다)
const PIXEL_FONT = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
  '+': ['000', '010', '111', '010', '000'],
  '♪': ['011', '010', '010', '110', '110'],
};

function drawPixelText(text, x, y, color) {
  const pixels = [];
  [...text].forEach((ch, i) => {
    (PIXEL_FONT[ch] || []).forEach((row, dy) => {
      [...row].forEach((bit, dx) => {
        if (bit === '1') pixels.push([x + i * 4 + dx, y + dy]);
      });
    });
  });
  // 테두리 먼저, 그 위에 색
  ctx.fillStyle = PALETTE.o;
  for (const [px, py] of pixels) ctx.fillRect(px - 1, py - 1, 3, 3);
  ctx.fillStyle = color;
  for (const [px, py] of pixels) ctx.fillRect(px, py, 1, 1);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// 연출 중인 화면 위치 (픽셀)
function screenPos(u, now) {
  const t = Math.min(1, (now - u.anim.start) / MOVE_MS);
  return {
    x: (u.anim.fromX + (u.x - u.anim.fromX) * t) * TILE,
    y: (u.anim.fromY + (u.y - u.anim.fromY) * t) * TILE,
    hop: t < 1 ? -Math.round(Math.sin(t * Math.PI) * 2) : 0,
  };
}

// scale 2 = 보스. 발은 제 칸에 두고 위·옆으로 크게 그린다
const HIT_MS = 300;      // 맞았을 때 흔들리는 시간
const BOB_MS = 900;      // 바닥 아이템이 한 번 떴다 내려오는 시간

function drawWalker(frames, u, now, scale = 1, dx = 0) {
  const p = screenPos(u, now);
  const set = u.facing < 0 ? frames.left : frames.right;
  const size = TILE * scale;
  const ox = (size - TILE) / 2;
  const oy = size - TILE;
  ctx.drawImage(set[u.step], Math.round(p.x) - ox + dx, Math.round(p.y) - oy + p.hop, size, size);
  return p;
}

function draw() {
  const now = performance.now();
  const h = state.hero;
  const hp = screenPos(h, now);

  const camX = Math.round(clamp(hp.x - (VIEW_W * TILE) / 2 + TILE / 2, 0, MAP_W * TILE - VIEW_W * TILE));
  const camY = Math.round(clamp(hp.y - (VIEW_H * TILE) / 2 + TILE / 2, 0, MAP_H * TILE - VIEW_H * TILE));

  let shakeX = 0;
  if (state.shake > 0) {
    shakeX = state.shake % 2 ? 1 : -1;
    state.shake -= 1;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, -camX + shakeX, -camY);

  const x0 = Math.floor(camX / TILE);
  const y0 = Math.floor(camY / TILE);
  for (let y = y0; y <= y0 + VIEW_H; y++) {
    for (let x = x0; x <= x0 + VIEW_W; x++) {
      const img = spriteFor(x, y);
      if (img) ctx.drawImage(img, x * TILE, y * TILE);
      // 잠긴 계단/출구는 어둡게
      if (img && lockedMessage(tileAt(x, y))) {
        ctx.fillStyle = 'rgba(20, 18, 26, 0.55)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // 바닥 아이템: 둥둥 떠 있다. 칸마다 박자를 어긋나게 해서 한꺼번에 움직이지 않게
  for (const it of state.items) {
    const phase = (now / BOB_MS + (it.x * 7 + it.y * 3) / 10) * Math.PI * 2;
    const bob = Math.round((Math.sin(phase) - 1) * 1.5); // 0 ~ -3px (위로만 뜬다)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';               // 그림자: 뜰수록 작아진다
    ctx.fillRect(it.x * TILE + 5 - bob / 2, it.y * TILE + 13, 6 + bob, 2);
    ctx.drawImage(SPRITES[it.kind], it.x * TILE, it.y * TILE + bob);
  }

  const enemyPos = state.enemies.map((e) => drawWalker(SPRITES[e.kind], e, now, e.type.ai === 'boss' ? 2 : 1));
  // 연차 중에는 깜빡인다
  if (state.annualTurns > 0 && Math.floor(now / 120) % 2) ctx.globalAlpha = 0.4;
  // 맞았을 때: 좌우로 2px 흔들리다 잦아든다
  const hitT = h.hitAt ? (now - h.hitAt) / HIT_MS : 1;
  const hitDx = hitT < 1 ? Math.round(Math.sin(hitT * Math.PI * 6) * 2 * (1 - hitT)) : 0;
  drawWalker(SPRITES.hero, h, now, 1, hitDx);
  ctx.globalAlpha = 1;

  // 던지기 조준 표시: 지금 던지면 맞을 적의 네 귀퉁이에 노란 꺾쇠
  if (!state.over && state.throwCd === 0) {
    const t = throwTarget();
    if (t) {
      const p = enemyPos[state.enemies.indexOf(t)];
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.fillStyle = PALETTE.y;
      for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [15, 0, -1, 1], [0, 15, 1, -1], [15, 15, -1, -1]]) {
        ctx.fillRect(x + cx + (sx < 0 ? -2 : 0), y + cy, 3, 1);
        ctx.fillRect(x + cx, y + cy + (sy < 0 ? -2 : 0), 1, 3);
      }
    }
  }

  // 체력 막대 · "!" 는 캐릭터 위에 덮어 그린다 (주인공에 가려지지 않게)
  state.enemies.forEach((e, i) => {
    const p = enemyPos[i];
    if (e.type.ai === 'boss') {
      // 체력은 화면 위 큰 막대. 다음 턴에 행동할 차례면 머리 위 빨간 "!" (예고)
      // 2배 그림의 오른쪽 위 빈 곳 (머리 위에 두면 맨 윗줄에서 화면 밖으로 나간다)
      if (e.started && e.busy === bossActEvery(e) - 1) {
        const bx = Math.round(p.x) + 19;
        const by = Math.round(p.y) - 15;
        ctx.fillStyle = PALETTE.o;
        ctx.fillRect(bx - 1, by - 1, 5, 9);
        ctx.fillStyle = '#ff5a5a';
        ctx.fillRect(bx, by, 3, 5);
        ctx.fillRect(bx, by + 6, 3, 1);
      }
      return;
    }
    // 다친 적만 체력 막대
    if (e.hp < e.maxHp) {
      const bx = Math.round(p.x) + 2;
      const by = Math.round(p.y) - 2;
      ctx.fillStyle = '#2b2230';
      ctx.fillRect(bx, by, 12, 2);
      ctx.fillStyle = '#ff7a7a';
      ctx.fillRect(bx, by, Math.max(1, Math.round((12 * e.hp) / e.maxHp)), 2);
    }
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    // 머리 위 표시: 상사는 평소 음표(노래 듣는 중), 방금 부른 직후엔 "!"
    const calling = e.type.ai === 'wander' && e.cooldown > e.type.callCooldown - 3;
    if (e.type.ai === 'wander' && !calling) {
      const bob = Math.floor(now / 300) % 2;
      drawPixelText('♪', px + 10, py - 5 - bob, '#bcdcf2');
    } else if ((e.awake || calling) && e.hp === e.maxHp) {
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(px + 7, py - 5, 2, 3);
      ctx.fillRect(px + 7, py - 1, 2, 1);
    }
    // 상사가 떠넘긴 일로 강해진 적
    if (e.bonus > 0) drawPixelText('+', px, py - 4, '#ff7a7a');
  });

  // 고객사가 던진 서류 · 주인공이 던진 볼펜: 던진 자리에서 맞은 자리까지 날아간다
  state.shots = state.shots.filter((s) => now - s.start < SHOT_MS);
  for (const s of state.shots) {
    const k = (now - s.start) / SHOT_MS;
    const sx = Math.round((s.fromX + (s.toX - s.fromX) * k) * TILE) + 6;
    const sy = Math.round((s.fromY + (s.toY - s.fromY) * k) * TILE) + 6;
    if (s.pen) {
      const flat = Math.abs(s.toX - s.fromX) >= Math.abs(s.toY - s.fromY); // 가로 쪽으로 날면 눕혀서
      ctx.fillStyle = PALETTE.o;
      ctx.fillRect(sx - 1, sy - 1, flat ? 8 : 3, flat ? 3 : 8);
      ctx.fillStyle = PALETTE.n;
      ctx.fillRect(sx, sy, flat ? 6 : 1, flat ? 1 : 6);
      continue;
    }
    ctx.fillStyle = PALETTE.o;
    ctx.fillRect(sx - 1, sy - 1, 6, 5);
    ctx.fillStyle = PALETTE.P;
    ctx.fillRect(sx, sy, 4, 3);
    ctx.fillStyle = PALETTE.L;
    ctx.fillRect(sx + 1, sy + 1, 2, 1);
  }

  // 피해 숫자: 맞은 캐릭터 몸 위에서 떠오른다
  state.popups = state.popups.filter((pp) => now - pp.start < POPUP_MS);
  for (const pp of state.popups) {
    const k = Math.max(0, (now - pp.start) / POPUP_MS);
    const w = pp.text.length * 4 - 1;
    const px = pp.x * TILE + Math.round((TILE - w) / 2);
    const py = pp.y * TILE + 5 - Math.round(k * 6);
    drawPixelText(pp.text, px, py, pp.color);
  }

  requestAnimationFrame(draw);
}
