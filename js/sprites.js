// 도트 그림 데이터와 오프스크린 캔버스 (1~2)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 1. 도트 데이터 (팔레트 + 16x16 격자)
//    '.' = 투명. 나머지 글자는 PALETTE 의 키.
// ─────────────────────────────────────────────
const TILE = 16;

const PALETTE = {
  o: '#2b2230', // 외곽선
  h: '#3a2c28', // 머리카락
  s: '#f2c6a0', // 피부
  w: '#f4f4f0', // 흰 셔츠
  n: '#34406b', // 남색 바지
  r: '#d9434a', // 사원증 목걸이줄
  y: '#ffe27a', // 사원증
  k: '#1b1b22', // 구두
  // 사무실
  f: '#8a93a6', // 카펫
  g: '#7d8699', // 카펫 무늬
  b: '#d8cbb5', // 벽
  c: '#c2b49c', // 벽 그림자
  m: '#9c8c72', // 걸레받이
  d: '#9a6a44', // 책상 상판
  e: '#7a5234', // 책상 모서리
  t: '#3d4552', // 모니터 테두리
  l: '#7fc8e8', // 모니터 화면
  // 계단 · 출구
  p: '#b9b2a4', // 계단 밝은 면
  q: '#5e5868', // 계단 그림자
  z: '#2a2631', // 계단 아래 어둠
  v: '#5b6270', // 문틀
  x: '#a8d8ea', // 유리
  u: '#3fbf6f', // 비상구 초록
  // 사무실 가구
  a: '#5aa564', // 화분 잎
  i: '#2f6b3c', // 화분 잎 그림자
  j: '#b5654a', // 화분
  A: '#e4e4e8', // 복사기 · 정수기 몸통
  B: '#a9adb8', // 복사기 · 정수기 그림자
  C: '#6fb3e0', // 정수기 물통
  G: '#4a5160', // 다 마신 정수기 물통
  // 적 소품 (대문자 = 색을 바꾸지 않는 소품 전용)
  P: '#fbfbf7', // 종이 · 맥주 거품
  L: '#9aa3b5', // 종이 줄
  Y: '#f2b33d', // 맥주
  R: '#e04f5f', // 헤드폰 · 빨간 볼
  K: '#2b2b33', // 헤드폰 머리띠
};

// 적은 모두 신입사원과 같은 몸 도트에 색만 바꾸고, 소품을 덧그린다
// 일 못하는 동기
const DONGGI_COLORS = {
  h: '#7a5232', // 갈색 머리
  w: '#bcdcf2', // 하늘색 셔츠
  n: '#55555f', // 회색 바지
  r: '#4a8fd9', // 파란 목걸이줄
};

// 요구가 많은 고객사 — 남색 정장 + 서류 뭉치
const CLIENT_COLORS = {
  h: '#1f1f24', w: '#4f5b73', n: '#2e3444', r: '#c0392b', y: '#4f5b73',
};
const CLIENT_PROP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '............oooo',
  '............oPPo',
  '............oLPo',
  '............oPLo',
  '............oooo',
  '................',
  '................',
  '................',
];

// 회식 좋아하는 팀장님 — 흰머리 + 빨간 볼 + 맥주잔
const LEADER_COLORS = {
  h: '#9a9a9a', w: '#e9eef5', n: '#3b3b46', r: '#7d3c98', y: '#e9eef5',
};
const LEADER_PROP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....R......R....',
  '............PPPP',
  '............oYYo',
  '............oYYo',
  '............oYYo',
  '............oooo',
  '................',
  '................',
  '................',
];

// 능력없는 상사 — 카멜 가디건 + 헤드폰
const SANGSA_COLORS = {
  h: '#4a3b2f', w: '#b08d57', n: '#5a4a3a', r: '#b08d57', y: '#b08d57',
};
const SANGSA_PROP = [
  '.....KKKKKK.....',
  '....K......K....',
  '...K........K...',
  '..K..........K..',
  '..K..........K..',
  '.RR..........RR.',
  '.RR..........RR.',
  '.RR..........RR.',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// 신입사원 — 정면, 걷기 2프레임 (다리만 다름)
const HERO_BODY = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohssssssho...',
  '...ossossosso...',
  '...osssssssso...',
  '....osssssso....',
  '...owwrwwrwwo...',
  '..oswwwrrwwwso..',
  '..oswwwyywwwso..',
  '...onnnnnnnno...',
];
const HERO_LEGS_A = [
  '....onnoonno....',
  '....okkookko....',
  '....ooo..ooo....',
];
const HERO_LEGS_B = [
  '....okkoonno....',
  '....ooo.okko....',
  '.........ooo....',
];

const FLOOR = [
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffgfffffffffgfff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffgfffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'fffffffffffgffff',
  'ffffffffffffffff',
  'ffgfffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffgfffffff',
  'ffffffffffffffff',
];

// 벽 앞면 (바로 아래가 바닥일 때)
const WALL = [
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbb',
  'cccccccccccccccc',
  'cccccccccccccccc',
  'cccccccccccccccc',
  'mmmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmmm',
  'oooooooooooooooo',
];

// 벽 윗면 (위에서 내려다본 벽 두께)
const WALL_TOP = Array(TILE).fill('cccccccccccccccc');

const DESK = [
  'ffffffffffffffff',
  'ffffottttttoffff',
  'ffffotlllltoffff',
  'ffffotlllltoffff',
  'ffffotlllltoffff',
  'ffffottttttoffff',
  'fffffffoofffffff',
  'oooooooooooooooo',
  'oddddddddddddddo',
  'oddddddddddddddo',
  'oddddddddddddddo',
  'oeeeeeeeeeeeeeeo',
  'oooooooooooooooo',
  'foffffffffffffof',
  'foffffffffffffof',
  'ffffffffffffffff',
];

// 회의 테이블 (2x2 칸). 네 조각으로 잘라 쓴다
const MEETING = [
  '................................',
  '......oooooo........oooooo......',
  '......ottttoo.......ottttoo.....',
  '......otttttoo......otttttoo....',
  '......oooooooo......oooooooo....',
  '.ooooooooooooooooooooooooooooooo',
  '.oeeeeeeeeeeeeeeeeeeeeeeeeeeeeeo',
  '.odddddddddddddddddddddddddddddo',
  '.odddPPPPdddddddddddddtttttddddo',
  '.odddPLLPdddddddddddddtllltddddo',
  '.odddPPPPdddddddddddddtllltddddo',
  '.odddPLLPdddddddddddddtttttddddo',
  '.odddPPPPddddddddddddtttttttdddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.oddddddddddddPPPPPddddddddddddo',
  '.oddddddddddddPLLLPddddddddddddo',
  '.oddddddddddddPPPPPddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.odddddddddddddddddddddddddddddo',
  '.oeeeeeeeeeeeeeeeeeeeeeeeeeeeeeo',
  '.ooooooooooooooooooooooooooooooo',
  '..oo........................oo..',
  '......oooooooo......oooooooo....',
  '......otttttto......otttttto....',
  '......otttttto......otttttto....',
  '......oooooooo......oooooooo....',
  '................................',
];

// 화분
const PLANT = [
  '................',
  '......a..a......',
  '....a.aaia.a....',
  '...aaiaaaiaa....',
  '....aaiaiaaaa...',
  '...aiaaaaiaia...',
  '....aaiaaaaa....',
  '.....aaiaaa.....',
  '......oooo......',
  '....oooooooo....',
  '....ojjjjjjo....',
  '....ojjjjjjo....',
  '.....ojjjjo.....',
  '.....ojjjjo.....',
  '......oooo......',
  '................',
];

// 복사기
const COPIER = [
  '................',
  '..oooooooooooo..',
  '..oBBBBBBBBBBo..',
  '..oAAAAAAAAAAo..',
  '.oooooooooooooo.',
  '.oAAAAAAAAAAAAo.',
  '.oAtltAAAuAAAAo.',
  '.oAAAAAAAAAAAAo.',
  '.oBBBBBBBBBBBBo.',
  '.oAPPPPPPPPPPAo.',
  '.oBBBBBBBBBBBBo.',
  '.oAAAAAAAAAAAAo.',
  '.oBBBBBBBBBBBBo.',
  '.oooooooooooooo.',
  '..oo........oo..',
  '................',
];

// 정수기
const COOLER = [
  '.....oooooo.....',
  '....oCCCCCCo....',
  '....oCxCCCCo....',
  '....oCxCCCCo....',
  '....oCCCCCCo....',
  '.....oooooo.....',
  '....oAAAAAAo....',
  '....oArAAlAo....',
  '....oAAAAAAo....',
  '....oBBBBBBo....',
  '....oAAAAAAo....',
  '....oAAAAAAo....',
  '....oAAAAAAo....',
  '....oBBBBBBo....',
  '....oooooooo....',
  '................',
];

// 책장
const SHELF = [
  '..oooooooooooo..',
  '..oeeeeeeeeeeo..',
  '..oerrydduttno..',
  '..oerrydduttno..',
  '..oerrydduttno..',
  '..oeeeeeeeeeeo..',
  '..oePPLdyyrdno..',
  '..oePPLdyyrdno..',
  '..oePPLdyyrdno..',
  '..oeeeeeeeeeeo..',
  '..oeddddddddeo..',
  '..oedddoodddeo..',
  '..oeddddddddeo..',
  '..oeeeeeeeeeeo..',
  '..oooooooooooo..',
  '..o..........o..',
];

// 가구 도트의 '.' 자리에 카펫을 깐다 (가구 칸도 바닥 무늬가 이어져 보이게)
function onFloor(rows, ox = 0, oy = 0) {
  return Array.from({ length: TILE }, (_, y) =>
    [...rows[oy + y].slice(ox, ox + TILE)].map((ch, x) => (ch === '.' ? FLOOR[y][x] : ch)).join(''));
}

// 내려가는 계단
const STAIRS = [
  'ffffffffffffffff',
  'foooooooooooooof',
  'foppppppppppppof',
  'foqqqqqqqqqqqqof',
  'fozzppppppppppof',
  'fozzqqqqqqqqqqof',
  'fozzzzppppppppof',
  'fozzzzqqqqqqqqof',
  'fozzzzzzppppppof',
  'fozzzzzzqqqqqqof',
  'fozzzzzzzzppppof',
  'fozzzzzzzzqqqqof',
  'fozzzzzzzzzzppof',
  'fozzzzzzzzzzqqof',
  'foooooooooooooof',
  'ffffffffffffffff',
];

// 1층 로비 출구 (유리문 + 비상구 표시)
const EXIT = [
  'ffffffffffffffff',
  'ffffuuuuuuuuffff',
  'fvvvvvvvvvvvvvvf',
  'fvxxxxxvvxxxxxvf',
  'fvxwxxxvvxwxxxvf',
  'fvxxwxxvvxxwxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvxxxxxvvxxxxxvf',
  'fvvvvvvvvvvvvvvf',
  'ffffffffffffffff',
];

// 아이템 — 커피 (테이크아웃 컵)
const COFFEE = [
  '................',
  '......oooo......',
  '....oooooooo....',
  '....okkkkkko....',
  '....oooooooo....',
  '....owwwwwwo....',
  '....owwwwwwo....',
  '....oddddddo....',
  '....odyyyydo....',
  '....oddddddo....',
  '....owwwwwwo....',
  '.....owwwwo.....',
  '.....oooooo.....',
  '................',
  '................',
  '................',
];

// 아이템 — 연차 (달력에 동그라미 친 날)
const ANNUAL = [
  '................',
  '....o......o....',
  '...oooooooooo...',
  '...orrrrrrrro...',
  '...orrrrrrrro...',
  '...oooooooooo...',
  '...owwwwwwwwo...',
  '...owowowowwo...',
  '...owwwwwwwwo...',
  '...owowwrrrwo...',
  '...owwwwrwrwo...',
  '...owowwrrrwo...',
  '...owwwwwwwwo...',
  '...oooooooooo...',
  '................',
  '................',
];

// 아이템 — 반차 (반만 칠한 시계)
const HALF = [
  '................',
  '................',
  '......oooo......',
  '....oowwyyoo....',
  '...owwwwyyyyo...',
  '..owwwwwoyyyyo..',
  '..owwwwwoyyyyo..',
  '..owwwwwoyyyyo..',
  '..owwwwwoyyyyo..',
  '..owwwwwwyyyyo..',
  '...owwwwyyyyo...',
  '...owwwwyyyyo...',
  '....oowwyyoo....',
  '......oooo......',
  '................',
  '................',
];

// 보스: 야근 강요하는 사장님 — 검은 정장 + 금색 넥타이 + 콧수염. 2배 크기로 그린다
const BOSS_COLORS = {
  h: '#2b2b2b', w: '#2f2f3a', n: '#23232b', r: '#e6b422', y: '#e6b422',
};
const BOSS_PROP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....KKKKKK.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// ─────────────────────────────────────────────
// 2. 도트 → 오프스크린 캔버스 (한 번만 그려 둔다)
// ─────────────────────────────────────────────
function makeSprite(rows, { flip = false, colors = {} } = {}) {
  const pal = { ...PALETTE, ...colors };
  const cv = document.createElement('canvas');
  cv.width = TILE;
  cv.height = TILE;
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || !pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(flip ? TILE - 1 - x : x, y, 1, 1);
    });
  });
  return cv;
}

// 소품 도트를 몸 위에 덮어쓴다 ('.' 은 몸 그대로)
function overlay(rows, prop) {
  if (!prop) return rows;
  return rows.map((row, y) => [...row].map((ch, x) => (prop[y][x] !== '.' ? prop[y][x] : ch)).join(''));
}

// 걷기 2프레임 × 좌우
function makeWalker(colors = {}, prop = null) {
  const a = overlay([...HERO_BODY, ...HERO_LEGS_A], prop);
  const b = overlay([...HERO_BODY, ...HERO_LEGS_B], prop);
  return {
    right: [makeSprite(a, { colors }), makeSprite(b, { colors })],
    left: [makeSprite(a, { flip: true, colors }), makeSprite(b, { flip: true, colors })],
  };
}

const SPRITES = {
  floor: makeSprite(FLOOR),
  wall: makeSprite(WALL),
  wallTop: makeSprite(WALL_TOP),
  desk: makeSprite(DESK),
  meeting: [[0, 0], [TILE, 0], [0, TILE], [TILE, TILE]].map(([x, y]) => makeSprite(onFloor(MEETING, x, y))),
  plant: makeSprite(onFloor(PLANT)),
  copier: makeSprite(onFloor(COPIER)),
  cooler: makeSprite(onFloor(COOLER)),
  coolerEmpty: makeSprite(onFloor(COOLER), { colors: { C: PALETTE.G, x: PALETTE.G } }),
  shelf: makeSprite(onFloor(SHELF)),
  stairs: makeSprite(STAIRS),
  exit: makeSprite(EXIT),
  hero: makeWalker(),
  donggi: makeWalker(DONGGI_COLORS),
  client: makeWalker(CLIENT_COLORS, CLIENT_PROP),
  leader: makeWalker(LEADER_COLORS, LEADER_PROP),
  sangsa: makeWalker(SANGSA_COLORS, SANGSA_PROP),
  boss: makeWalker(BOSS_COLORS, BOSS_PROP),
  coffee: makeSprite(COFFEE),
  annual: makeSprite(ANNUAL),
  half: makeSprite(HALF),
};
