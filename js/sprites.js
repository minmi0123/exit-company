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
  // 2탄 집
  F: '#c9a57a', // 마룻바닥
  H: '#b9935f', // 마룻바닥 이음매
  N: '#d5dcc6', // 벽지
  M: '#bcc6aa', // 벽지 줄무늬 · 그림자
  D: '#6b4630', // 짙은 나무 (걸레받이 · 문틀 · 침대 머리판 · TV 장)
  S: '#6a8fb5', // 소파
  T: '#4f7396', // 소파 그림자
  O: '#30343e', // 가전 검정 (TV · 폰)
  E: '#efe8d8', // 침대 시트
  I: '#c0607a', // 이불
  J: '#9a4760', // 이불 그림자
  U: '#57b894', // 배달 헬멧 민트
  V: '#5fae4e', // 소주병 초록
  1: '#ff5fa2', // 숏폼 분홍
  2: '#4fd6e0', // 숏폼 하늘 · 알고리즘 눈
  3: '#e50914', // 넷플릭스 빨강
  4: '#ffd75a', // 방해금지 초승달
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

// 가구 도트의 '.' 자리에 바닥을 깐다 (가구 칸도 바닥 무늬가 이어져 보이게). 기본은 사무실 카펫
function onFloor(rows, ox = 0, oy = 0, floor = FLOOR) {
  return Array.from({ length: TILE }, (_, y) =>
    [...rows[oy + y].slice(ox, ox + TILE)].map((ch, x) => (ch === '.' ? floor[y][x] : ch)).join(''));
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
// 2탄 집 — 바닥 · 벽 · 가구 · 유혹(적) · 아이템
// ─────────────────────────────────────────────
const HOME_FLOOR = [
  'FFFFFFFFFFFFFFFF',
  'FFFFFFFFFFFFFFFF',
  'FFFFFFFFFFFFFFFF',
  'HHHHHHHHHHHHHHHH',
  'FFFFFHFFFFFFFFFF',
  'FFFFFHFFFFFFFFFF',
  'FFFFFHFFFFFFFFFF',
  'HHHHHHHHHHHHHHHH',
  'FFFFFFFFFFFFHFFF',
  'FFFFFFFFFFFFHFFF',
  'FFFFFFFFFFFFHFFF',
  'HHHHHHHHHHHHHHHH',
  'FFHFFFFFFFFFFFFF',
  'FFHFFFFFFFFFFFFF',
  'FFHFFFFFFFFFFFFF',
  'HHHHHHHHHHHHHHHH',
];

// 벽 앞면: 줄무늬 벽지 + 나무 걸레받이
const HOME_WALL = [
  ...Array(10).fill('NNNMNNNMNNNMNNNM'),
  'MMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMMM',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'oooooooooooooooo',
];
const HOME_WALL_TOP = Array(TILE).fill('MMMMMMMMMMMMMMMM');

// 소파 (한 칸짜리. 두 칸을 나란히 놓는다)
const SOFA = [
  '................',
  '................',
  '..oooooooooooo..',
  '..oSSSSSSSSSSo..',
  '..oSSSSSSSSSSo..',
  '..oSSSSSSSSSSo..',
  '.oooTTTTTTTTooo.',
  '.oSoSSSSSSSSoSo.',
  '.oSoSSSSSSSSoSo.',
  '.oSoTTTTTTTToSo.',
  '.oSooooooooooSo.',
  '.oTTTTTTTTTTTTo.',
  '.oooooooooooooo.',
  '..oo........oo..',
  '................',
  '................',
];

// 식탁 (2x2 칸): 회의 테이블 모양에 의자는 나무, 상 위엔 접시
const HOME_TABLE = MEETING.map((row, y) => (y < 5 || y > 26
  ? row.replace(/t/g, 'D')
  : row.replace(/t/g, 'P').replace(/l/g, 'Y')));

const TV = [
  '................',
  '.oooooooooooooo.',
  '.oOOOOOOOOOOOOo.',
  '.oOllllllllllOo.',
  '.oOlwwlllllllOo.',
  '.oOlwllllllllOo.',
  '.oOllllllllllOo.',
  '.oOllllllllllOo.',
  '.oOOOOOOOOOOOOo.',
  '.oooooooooooooo.',
  '......oooo......',
  '..oooooooooooo..',
  '..oDDDDDDDDDDo..',
  '..oDDoDDDDoDDo..',
  '..oooooooooooo..',
  '..o..........o..',
];

// 냉장고: 부딪히면 탄산수 한 병 (집의 정수기). 파란 쪽지 = 아직 남았다
const FRIDGE = [
  '................',
  '...oooooooooo...',
  '...oAAAAAAAAo...',
  '...oACCAAAAAo...',
  '...oACCAAABAo...',
  '...oAAAAAABAo...',
  '...oooooooooo...',
  '...oAAAAAAAAo...',
  '...oAAAAAABAo...',
  '...oAAAAAABAo...',
  '...oAAAAAABAo...',
  '...oAAAAAAAAo...',
  '...oAAAAAAAAo...',
  '...oBBBBBBBBo...',
  '...oooooooooo...',
  '................',
];

// 다음 방으로 가는 문 (집의 계단)
const DOOR = [
  '................',
  '..oooooooooooo..',
  '..oDDDDDDDDDDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeyeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oDeeeeeeeeDo..',
  '..oooooooooooo..',
  '................',
];

// 침대 (집의 출구)
const BED = [
  '................',
  '.oooooooooooooo.',
  '.oDDDDDDDDDDDDo.',
  '.oooooooooooooo.',
  '.oEEEEEEEEEEEEo.',
  '.oEEPPPPPPPPEEo.',
  '.oEEPPPPPPPPEEo.',
  '.oEEEEEEEEEEEEo.',
  '.oIIIIIIIIIIIIo.',
  '.oIIIIIIIIIIIIo.',
  '.oIJIIIIIIIIJIo.',
  '.oIIIIIIIIIIIIo.',
  '.oIIIIIIIIIIIIo.',
  '.oJJJJJJJJJJJJo.',
  '.oooooooooooooo.',
  '................',
];

// 유혹(적)도 같은 몸 도트에 색을 바꾸고 소품을 덧그린다
const BLANK_ROW = '................';

// 넷플릭스 — 머리가 TV (빨간 N)
const NETFLIX_COLORS = { w: '#8c1c22', n: '#1f1f24', r: '#1f1f24', y: '#e50914' };
const NETFLIX_PROP = [
  BLANK_ROW,
  '..oooooooooooo..',
  '..oOOOOOOOOOOo..',
  '..oOO3OOO3OOOo..',
  '..oOO33OO3OOOo..',
  '..oOO3O3O3OOOo..',
  '..oOO3OO33OOOo..',
  '..oOO3OOO3OOOo..',
  '..oooooooooooo..',
  ...Array(7).fill(BLANK_ROW),
];

// 배달 앱 — 민트 헬멧 + 배달 상자
const DELIVERY_COLORS = { h: '#57b894', w: '#f4f4f0', n: '#3d4552', r: '#57b894', y: '#57b894' };
const DELIVERY_PROP = [
  ...Array(8).fill(BLANK_ROW),
  '............oooo',
  '............oddo',
  '............oPdo',
  '............oddo',
  '............oooo',
  ...Array(3).fill(BLANK_ROW),
];

// 숏폼 — 머리가 폰 화면 (재생 버튼)
const SHORTS_COLORS = { w: '#2b2b33', n: '#2b2b33', r: '#ff5fa2', y: '#4fd6e0' };
const SHORTS_PROP = [
  BLANK_ROW,
  '...oooooooooo...',
  '...o11111111o...',
  '...o111P1111o...',
  '...o111PP222o...',
  '...o111PP222o...',
  '...o111P2222o...',
  '...o22222222o...',
  '...oooooooooo...',
  ...Array(7).fill(BLANK_ROW),
];

// 술 — 빨간 볼 + 초록 병
const SOJU_COLORS = { w: '#5fae4e', n: '#3a4a38', r: '#f4f4f0', y: '#f4f4f0' };
const SOJU_PROP = [
  ...Array(6).fill(BLANK_ROW),
  '.............oo.',
  '....R......R.oVo',
  '............oVVo',
  '............oPPo',
  '............oVVo',
  '............oVVo',
  '............oooo',
  ...Array(3).fill(BLANK_ROW),
];

// 보스: 새벽 2시의 알고리즘 — 보라 후드, 얼굴은 어둠 속에서 눈만 빛난다. 2배 크기
const ALGO_COLORS = { h: '#5a3fa0', s: '#1b1b22', w: '#3d2a73', n: '#23232b', r: '#ff5fa2', y: '#4fd6e0' };
const ALGO_PROP = [
  ...Array(6).fill(BLANK_ROW),
  '.....22..22.....',
  ...Array(9).fill(BLANK_ROW),
];

// 아이템 — 물 한 잔
const WATER = [
  BLANK_ROW,
  BLANK_ROW,
  BLANK_ROW,
  '.....oooooo.....',
  '.....oxxxxo.....',
  '.....oxxxxo.....',
  '.....oCCCCo.....',
  '.....oCCCCo.....',
  '.....oCwCCo.....',
  '.....oCwCCo.....',
  '.....oCCCCo.....',
  '.....oCCCCo.....',
  '......oooo......',
  BLANK_ROW,
  BLANK_ROW,
  BLANK_ROW,
];

// 아이템 — 방해금지 모드 (폰 화면에 초승달)
const DND = [
  BLANK_ROW,
  '....oooooooo....',
  '....oOOOOOOo....',
  '....oOOO44Oo....',
  '....oOO44OOo....',
  '....oO44OOOo....',
  '....oO44OOOo....',
  '....oO44OOOo....',
  '....oOO44OOo....',
  '....oOOO44Oo....',
  '....oOOOOOOo....',
  '....oOOOOOOo....',
  '....oOOooOOo....',
  '....oooooooo....',
  BLANK_ROW,
  BLANK_ROW,
];

// 아이템 — 자기계발서
const BOOK = [
  BLANK_ROW,
  BLANK_ROW,
  '...oooooooooo...',
  '...oRRRRRRRRo...',
  '...oRRRRRRRRo...',
  '...oRyyyyyyRo...',
  '...oRyyyyyyRo...',
  '...oRRRRRRRRo...',
  '...oRRRyyRRRo...',
  '...oRRRyyRRRo...',
  '...oRRRRRRRRo...',
  '...oRRRRRRRRo...',
  '...oPPPPPPPPo...',
  '...oooooooooo...',
  BLANK_ROW,
  BLANK_ROW,
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
  // 2탄 집
  homeFloor: makeSprite(HOME_FLOOR),
  homeWall: makeSprite(HOME_WALL),
  homeWallTop: makeSprite(HOME_WALL_TOP),
  sofa: makeSprite(onFloor(SOFA, 0, 0, HOME_FLOOR)),
  homeTable: [[0, 0], [TILE, 0], [0, TILE], [TILE, TILE]].map(([x, y]) => makeSprite(onFloor(HOME_TABLE, x, y, HOME_FLOOR))),
  tv: makeSprite(onFloor(TV, 0, 0, HOME_FLOOR)),
  fridge: makeSprite(onFloor(FRIDGE, 0, 0, HOME_FLOOR)),
  fridgeEmpty: makeSprite(onFloor(FRIDGE, 0, 0, HOME_FLOOR), { colors: { C: PALETTE.A } }),
  homePlant: makeSprite(onFloor(PLANT, 0, 0, HOME_FLOOR)),
  homeShelf: makeSprite(onFloor(SHELF, 0, 0, HOME_FLOOR)),
  door: makeSprite(onFloor(DOOR, 0, 0, HOME_FLOOR)),
  bed: makeSprite(onFloor(BED, 0, 0, HOME_FLOOR)),
  netflix: makeWalker(NETFLIX_COLORS, NETFLIX_PROP),
  delivery: makeWalker(DELIVERY_COLORS, DELIVERY_PROP),
  shorts: makeWalker(SHORTS_COLORS, SHORTS_PROP),
  soju: makeWalker(SOJU_COLORS, SOJU_PROP),
  algo: makeWalker(ALGO_COLORS, ALGO_PROP),
  water: makeSprite(WATER),
  dnd: makeSprite(DND),
  book: makeSprite(BOOK),
};
