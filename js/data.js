// 수치 · 적 · 아이템 · 강화 — 밸런스 조정은 여기서만 (3)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다

// ─────────────────────────────────────────────
// 3. 수치 (밸런스 조정은 여기서만)
//    2026-09-30 시뮬레이션(봇 120판, 보스 포함): 바로 돌진하는 봇 34% / 쉬었다 가는 봇 75%
//    (더 쉽게: 사장님 hp 15 + maxSummons 1 → 62% / 90%)
//    체력은 키보드 공격력(3)의 배수 경계를 조심 — 6→7 이면 2방→3방으로 급격히 어려워진다
// ─────────────────────────────────────────────
const HERO = {
  maxMental: 20,
  lowMental: 6,       // 이 이하면 위험: 화면 가장자리가 붉어지고 커피 버튼이 깜빡인다
  attack: 3,          // 키보드
  coolerHeal: 3,      // 정수기 한 번 (층마다 새 맵이라 다시 채워진다)
  throwDamage: 2,     // 볼펜 던지기 (원거리). 키보드보다 약하다
  throwRange: 7,      // 같은 줄(가로·세로)의 가장 가까운 적을 자동으로 조준. 벽·가구·다른 적에 가리면 못 던진다
  throwCooldown: 3,   // n턴에 한 번. 없으면 멀리서 계속 던져 동기가 닿기도 전에 쓰러진다
  // 아래는 강화로만 오른다
  healBonus: 0,       // 커피·정수기 회복량 추가
  guard: 0,           // 받는 피해 감소 (최소 1은 받는다)
  clockSlow: 0,       // 시계가 30분 가는 데 더 걸리는 턴
  floorItems: 0,      // 층 시작할 때 받는 아이템 수
  grabResist: 0,      // 팀장님 붙잡기 턴 감소 (최소 1턴)
  overtimeImmune: false, // 사장님이 퇴근 시간을 밀어도 공격력이 안 오름
};

// 계단을 내려갈 때마다 두 장 중 하나를 고른다 (5F→1F 동안 4번). 같은 강화를 또 받을 수 있다
// available: 더 받아 봐야 소용없으면 후보에서 뺀다
const PERKS = [
  { id: 'keyboard', name: '기계식 키보드', desc: '키보드 공격 +1',
    apply: (s) => { s.attack += 1; } },
  { id: 'pens', name: '볼펜 한 다스', desc: '던지기 대기 1턴 줄임',
    apply: (s) => { s.throwCooldown -= 1; }, available: (s) => s.throwCooldown > 1 },
  { id: 'fountain', name: '만년필', desc: '던지기 피해 +1',
    apply: (s) => { s.throwDamage += 1; } },
  { id: 'mental', name: '멘탈 관리', desc: '최대 멘탈 +5, 바로 5 회복',
    apply: (s) => { s.maxMental += 5; state.mental += 5; } },
  { id: 'tumbler', name: '텀블러', desc: '커피·정수기 회복 +2',
    apply: (s) => { s.healBonus += 2; } },
  { id: 'headphone', name: '노이즈캔슬링', desc: '받는 피해 -1 (최소 1)',
    apply: (s) => { s.guard += 1; }, available: (s) => s.guard < 2 },
  { id: 'clock', name: '칼퇴 본능', desc: '시계가 느리게 간다 (30분에 25턴 더)',
    apply: (s) => { s.clockSlow += 25; }, available: (s) => s.clockSlow < 50 },
  { id: 'network', name: '사내 인맥', desc: '층 시작마다 무작위 아이템 1개',
    apply: (s) => { s.floorItems += 1; } },
  { id: 'refuse', name: '거절의 기술', desc: '팀장님 회식 붙잡기 1턴 줄임',
    apply: (s) => { s.grabResist += 1; }, available: (s) => s.grabResist < 2 },
  { id: 'overtime', name: '야근 면역', desc: '퇴근 시간이 밀려도 사장님 공격력이 안 오름',
    apply: (s) => { s.overtimeImmune = true; }, available: (s) => !s.overtimeImmune },
];

// 아래층일수록 적 체력이 조금씩 오른다 (강화를 받는 만큼). 사장님은 BOSS.hp 에서 따로 정한다
const HP_PER_FLOOR = 0.1; // 한 층 내려갈 때마다 +10%

// ai: melee(쫓아와서 때림) · ranged(한 줄로 보이면 던짐) · grab(붙잡기) · wander(돌아다니다 부름) · boss
//     행동 규칙은 game.js 의 ENEMY_AI 에 있다. 새 적은 여기 한 덩어리만 추가하면 된다 (그림은 sprites.js 의 SPRITES[kind])
// short/obj: 문장에 넣을 이름 (받침에 따라 을/를)
// 적마다 하는 말(…Line)도 여기 둔다 — game.js 에는 적 이름이 나오지 않는다
const ENEMY_TYPES = {
  donggi: {
    name: '일 못하는 동기',
    short: '동기', obj: '동기를',
    ai: 'melee',
    desc: '가장 흔한 적. 알아채면 쫓아와서 때린다.',
    hp: 6,            // 키보드 2방
    attack: 3,
    sight: 8,         // 이 거리 안에 들어오면 알아채고 쫓아온다
    lines: [
      '동기가 자기 실수를 떠넘겼다.',
      '동기가 "이거 어떻게 해요?"를 열 번째 묻는다.',
      '동기가 회의록을 대신 써 달라고 한다.',
      '동기가 보고서 파일을 날렸다.',
    ],
  },
  client: {
    name: '요구가 많은 고객사',
    short: '고객사', obj: '고객사를',
    ai: 'ranged',
    desc: '같은 줄에 막힘없이 보이면 멀리서 "수정 요청" 서류를 던진다. 던진 뒤엔 잠깐 쉰다. 맷집은 약하다.',
    hp: 3,            // 키보드 1방. 대신 멀리서 때린다
    attack: 3,
    range: 5,         // 같은 줄(가로/세로)로 막힘 없이 이 거리 안이면 던진다
    sight: 8,
    lines: [
      '고객사가 "전면 수정" 요청을 던졌다.',
      '고객사: "어제 된다고 하셨잖아요."',
      '고객사: "로고 좀 더 크게요. 근데 작게요."',
      '고객사가 금요일 오후 6시에 메일을 던졌다.',
    ],
  },
  leader: {
    name: '회식 좋아하는 팀장님',
    short: '팀장님', obj: '팀장님을',
    ai: 'grab',
    desc: '옆에 붙으면 회식에 붙잡는다. 붙잡힌 동안 못 움직이고 매 턴 멘탈이 깎이며, 팀장님을 때릴 수도 없다. 연차·반차로 빠져나오거나, 버티면 풀려난다.',
    hp: 9,            // 키보드 3방
    attack: 2,        // 붙잡기 대기 중(쿨다운)일 때 그냥 때리는 피해
    grabDamage: 2,    // 붙잡힌 동안 매 턴
    grabTurns: 3,     // 이만큼 지나면 저절로 풀려남
    grabCooldown: 4,  // 풀어 준 뒤 다시 붙잡기까지
    sight: 8,
    lines: [   // 붙잡은 동안 매 턴
      '팀장님이 잔을 채운다.',
      '팀장님: "한 잔만 더~"',
      '팀장님이 옛날 이야기를 시작했다.',
    ],
    grabLabel: '회식',  // 화면 위 상태 표시: "회식 3턴"
    grabLine: (turns) => '팀장님: "오늘 회식 알지?" 붙잡혔다! (연차·반차로 탈출 / ' + turns + '턴 뒤 풀려남)',
    releaseLine: '팀장님: "1차만 하고 가~" 겨우 풀려났다.',
    escapeLine: '회식에서 빠져나왔다!',
    declineLine: '연차 중이라 회식 제안을 정중히 거절했다.',   // 무적일 때 붙잡으려 하면
    pokeLine: '팀장님이 어깨를 툭 친다. "다음엔 꼭 와~"',       // 붙잡기 대기 중에 때릴 때
    holdAttackLine: '팀장님한테 손을 댈 순 없다… (연차·반차로 탈출)',
    holdMoveLine: '팀장님이 놓아주지 않는다… (연차·반차로 탈출)',
    holdThrowLine: '팀장님 말고는 맞힐 사람이 없다… (연차·반차로 탈출)',
  },
  sangsa: {
    name: '능력없는 상사',
    short: '상사', obj: '상사를',
    ai: 'wander',
    desc: '헤드폰을 끼고 돌아다니기만 한다. 가까이 가거나 때리면 같은 방 적을 부른다. 쓰러뜨리면 일을 떠넘겨 남은 적이 강해진다.',
    hp: 6,
    attack: 0,        // 직접 공격하지 않는다
    notice: 2,        // 이 거리 안에 들어오면 알아채고 적을 부른다
    callCooldown: 8,  // 다시 부르기까지
    lines: [   // 부를 때
      '상사: "이거 누가 좀 해 봐." 주변 적이 몰려온다!',
      '상사: "아 그거 내가 말 안 했나?" 주변 적이 몰려온다!',
      '상사: "다 같이 고민해 보자고~" 주변 적이 몰려온다!',
      '상사: "나는 큰 그림만 볼게." 주변 적이 몰려온다!',
    ],
    aloneLine: '상사: "이거 누가 좀 해 봐." …아무도 없다.',  // 불렀는데 근처에 아무도 없을 때
    idleMark: '♪',    // 평소 머리 위 표시 (노래 듣는 중)
    // 쓰러지면 남은 적 공격력이 이만큼 오른다. 쓰러뜨린 수만큼 쌓인다 (상한 없음)
    deathBuff: 1,
    deathBuffLine: '일을 떠넘기고 갔다! 남은 적 공격력 +',
    leaveLines: [ // 쓰러질 때 (일을 떠넘기고 간다)
      '상사: "나머진 알아서들 해~"',
      '상사: "나 먼저 들어가 볼게. 내일 아침까지 부탁해~"',
      '상사: "이건 다 같이 한 걸로 하자."',
    ],
  },
};

// 보스: 1층 출구 앞을 지킨다. 살아 있는 동안 출구가 잠긴다
const BOSS = {
  name: '야근 강요하는 사장님',
  short: '사장님', obj: '사장님을',
  ai: 'boss',
  boss: true,         // 살아 있으면 출구가 잠긴다 · 체력은 화면 아래 큰 막대 · 층 체력 보정 없음
  scale: 2,           // 2배 크기로 그린다
  desc: '1층 로비 문을 막고 있다. 쓰러뜨려야 문이 열린다. 알아챈 뒤로 시계를 빨리 돌리며 점점 세지고, "긴급 회의"로 동기를 불러온다. 평소엔 바빠서 한 턴씩 걸러 움직이지만 (머리 위 "!" = 다음 턴에 행동), 궁지에 몰리면 분노해서 매 턴 움직인다.',
  hp: 30,             // 볼펜·아이템이 늘어서 18 → 27, 강화가 생겨서 → 30 (2026-09-30)
  attack: 5,          // 대신 2턴에 한 번만 때린다 (분노하면 매 턴). 4 로 낮췄다가 쉽다는 평가로 원복 (2026-10)
  sight: 6,
  summonEvery: 5,     // n턴마다 동기를 옆에 불러온다 ("긴급 회의")
  maxSummons: 3,      // 불려 온 동기는 동시에 최대
  enrageAt: 0.5,      // 체력이 이 비율 이하로 떨어지면 분노: 매 턴 행동
  firstSummonDelay: 6,// 알아챈 뒤 첫 소집까지 기다리는 턴
  actEvery: 2,        // 바쁜 사장님: 2턴에 한 번 행동. 행동 직전 턴엔 머리 위 빨간 "!"
  overtimeEvery: 8,   // 알아챈 뒤 n턴마다 퇴근 시간 30분 밀림 + 공격력 +1
  overtimeMaxBonus: 3,
  summonKind: 'donggi',
  summonLine: '사장님: "다들 모여, 긴급 회의다!" 동기가 불려 왔다.',
  enrageLine: '사장님이 넥타이를 풀었다! "오늘 아무도 못 가!" 이제 매 턴 움직인다.',
  lockLine: '로비 문이 잠겨 있다. 사장님: "퇴근? 누가?"',
  overtimeLine: ' 사장님이 퇴근 시간을 밀었다.',
  overtimeUpLine: ' 사장님 공격력 +1',
  overtimeImmuneLine: ' (야근 면역: 사장님 공격력 그대로)',
  lines: [
    '사장님: "요즘 애들은 끈기가 없어."',
    '사장님: "내일 아침까지 되지?"',
    '사장님: "나 때는 말이야…"',
    '사장님: "퇴근? 일 다 했어?"',
  ],
};
ENEMY_TYPES.boss = BOSS;

// 층별 적 구성 (5F → 1F). 상사는 재밌는 캐릭터라 4F 부터 자주 나온다 (2026-10, 원래 2F 1명)
const ENEMIES_PER_FLOOR = {
  5: { donggi: 3 },
  4: { donggi: 3, client: 2, sangsa: 1 },
  3: { donggi: 3, client: 2, leader: 1, sangsa: 1 },
  2: { donggi: 3, client: 2, leader: 2, sangsa: 2 },
  1: { donggi: 2, client: 1 },  // 보스 층은 가볍게 (사장님이 동기를 불러오므로)
};

// 아이템. 층마다 min~max 개, chance 는 그 층에 나올 확률
// tag/desc: 도감에 보이는 글 (수치는 쓰지 않는다)
// 효과는 아래 값으로 정한다 — 새 아이템은 여기 한 줄만 추가하면 버튼 · 단축키 · 가방 · 도감이 따라온다
//   heal: 멘탈 회복량            turns: 효과가 이어지는 턴
//   invincible: 그동안 무적      power: 그동안 공격력 배수 (올림)
//   escape: 붙잡혔을 때 쓰면 빠져나온다
//   key: 단축키 숫자 (버튼도 이 순서로 놓인다)
const ITEM_TYPES = {
  coffee: { name: '커피', key: 1, min: 2, max: 3, chance: 1, heal: 5,
    tag: '회복', desc: '멘탈을 회복한다. 가장 자주 나온다.',
    useLine: '커피를 마셨다. 정신이 든다.' },
  annual: { name: '연차', key: 2, min: 1, max: 1, chance: 0.7, turns: 5, invincible: true, escape: true, // 강해서 한 층에 하나까지
    tag: '무적 · 탈출', desc: '잠시 무적이 된다. 팀장님에게 붙잡혔을 때 쓰면 빠져나온다.',
    useLine: (t) => '연차를 냈다! ' + t.turns + '턴 동안 아무도 나를 건드릴 수 없다.',
    guardLine: (who) => '연차 중이라 ' + who + '의 연락을 받지 않았다.' },
  half:   { name: '반차', key: 3, min: 1, max: 2, chance: 0.8, turns: 5, power: 1.5, escape: true,
    tag: '공격 · 탈출', desc: '오전에 몰아서 끝낸다. 잠시 공격력이 1.5배가 된다. 팀장님에게 붙잡혔을 때 쓰면 빠져나온다.',
    useLine: (t) => '반차를 냈다! 오전에 몰아서 끝낸다 — ' + t.turns + '턴 동안 공격력 ' + t.power + '배.' },
};

// 시계: 5층 18:00 부터. every 턴마다 step 분, max 가 되면 멈춘다 (판 전체로 이어진다)
// 75턴 = 2026-10 플레이 기록(2층 중간 526턴)으로 맞춤. 한 판 ~750턴이면 23시쯤 퇴근
const CLOCK = {
  start: 18 * 60,     // 18:00
  every: 75,
  step: 30,
  max: 6 * 60,        // 18:00 + 6시간 = 00:00
  midnightLine: '00:00. 막차가 끊겼다… 시계는 더 이상 보지 않기로 했다.',
};

// ─────────────────────────────────────────────
// 월급과 상점 (모든 탄이 같이 쓴다) — 판이 끝나면 월급이 통장에 쌓이고, 시작화면 상점에서 옷을 산다
//    옷은 모양만 바꾼다. 능력치는 붙이지 않는다 (2026-10-11 기획자 확정)
// ─────────────────────────────────────────────
// 월급: 퇴근시킨 적 수 + 모은 아이템 수 (성공이든 실패든 받는다)
const WAGE = { perKill: 1, perItem: 1, unit: '만원' };

// 옷: 주인공 도트의 색만 바꾼다 (h 머리 · w 윗옷 · n 바지 · r 목걸이줄 · y 사원증 · k 신발). 빈 칸은 원래 색
// price 0 = 처음부터 가지고 있다. 살 수 있는 옷은 아래로 갈수록 비싸다
// 한 판에 버는 돈이 15~50만원쯤이라 (실패한 판 ~ 다 쓸어 담은 성공), 싼 옷은 두세 판이면 산다
const OUTFITS = [
  { id: 'shirt', name: '셔츠와 사원증', price: 0, desc: '출근할 때 입는 그 옷.',
    colors: {} },
  { id: 'pajama', name: '잠옷', price: 0, desc: '집에 오면 일단 갈아입는다. 분홍 슬리퍼 포함.',
    colors: { w: '#a9c8ec', n: '#8fb3dc', r: '#a9c8ec', y: '#f4f4f0', k: '#e8a0b0' } },
  { id: 'hoodie', name: '회색 후드티', price: 50, desc: '자율 복장이라고 해서 진짜 입고 왔다.',
    colors: { w: '#8d93a1', n: '#3f5a8a', r: '#c9ced8', y: '#8d93a1' } },
  { id: 'track', name: '삼선 츄리닝', price: 80, desc: '편한 게 최고다.',
    colors: { w: '#2f6b3c', n: '#2f6b3c', r: '#f4f4f0', y: '#2f6b3c', k: '#f4f4f0' } },
  { id: 'suit', name: '면접 정장', price: 120, desc: '오늘 반차 내고 어디 다녀왔어요?',
    colors: { w: '#2e3444', n: '#2e3444', r: '#c0392b', y: '#2e3444' } },
  { id: 'hawaii', name: '하와이안 셔츠', price: 150, desc: '연차 낸 날의 마음가짐.',
    colors: { w: '#ff8a5c', n: '#e9dcc0', r: '#ffd75a', y: '#4fd6e0', k: '#b5654a' } },
  { id: 'gold', name: '금수저', price: 500, desc: '퇴사해도 되는 옷.',
    colors: { w: '#e6b422', n: '#b8891a', r: '#fff3b0', y: '#fff3b0', k: '#e6b422' } },
];

// ─────────────────────────────────────────────
// 탄 (스테이지) — 탄 하나에 필요한 것을 한 묶음으로. 게임은 지금 고른 탄(STAGE)만 본다
//    outfit: 옷을 따로 고르지 않은 사람이 이 탄에서 입는 옷 (OUTFITS 의 id)
//    새 탄은 위와 같은 표(적 · 층별 구성 · 아이템 · 강화 · 시계)를 따로 만들어 이 모양으로 묶고 STAGES 에 넣는다.
//    open: false 면 탄 고르기 창에 "준비 중" 으로만 보인다
//    requires: 'company' 면 그 탄을 한 번 깨야 열린다
//    sprites: 바닥 · 벽 · 계단 · 출구 그림을 이 탄의 것으로 바꾼다 { floor: 'homeFloor' }
//    아이템의 obj / subj: 이름이 받침으로 끝나면 '물 한 잔을' · '물 한 잔이' 를 따로 적는다 (없으면 '를' · '가')
// ─────────────────────────────────────────────
const COMPANY = {
  id: 'company',
  name: '1탄 · 회사',
  desc: '5F 부터 1F 로비까지 내려가 퇴근한다',
  open: true,
  topFloor: 5,                      // 맨 위층에서 시작해 1층까지 내려간다
  outfit: 'shirt',
  hero: HERO,
  perks: PERKS,
  enemies: ENEMY_TYPES,
  enemiesPerFloor: ENEMIES_PER_FLOOR,
  hpPerFloor: HP_PER_FLOOR,
  boss: { kind: 'boss', floor: 1 }, // 이 층 출구 앞에 선다
  items: ITEM_TYPES,
  clock: CLOCK,
  // 가구 배치 (칸 글자는 map.js 의 TILES). 같은 글자를 여러 번 넣으면 그만큼 자주 나온다
  map: {
    table: 'T',                               // 큰 방 한가운데 2x2 가구
    pair: 'D',                                // 두 칸씩 나란히 놓는 가구
    wallProps: ['P', 'P', 'C', 'W', 'S', 'S'], // 방 윗벽에 붙는 소품
    sideProps: ['P', 'P', 'W', 'C'],           // 양옆 벽에 붙는 소품
  },
  // 이 탄에서 쓰는 말. game.js 는 여기서만 읽는다 (탄마다 체력 이름 · 장소 이름 · 이겼을 때 하는 말이 다르다)
  text: {
    hp: '멘탈',                                   // 체력 이름: 화면 위 표시 · 피해/회복 메시지 · 점수표
    floorName: (floor) => floor + 'F',            // 화면 위 장소 표시 · 기록
    perkTitle: '계단에서 한숨 돌렸다',            // 강화 고르는 창 제목
    defeat: (obj, boss) => obj + ' 먼저 퇴근시켰다' + (boss ? '!' : '.'),
    clearBonus: '모두 퇴근시켰다! 보너스 강화: ', // 층의 적을 다 쓰러뜨렸을 때
    floorItem: (item) => '사내 인맥으로 ' + item.name + '를 챙겼다.', // 강화 "사내 인맥"
    bossWhere: '1F 출구',                         // 도감에 적는 보스 위치
    win: '퇴근 성공!',
    lose: '멘탈 붕괴…',
    winResult: (clock, overtime) => '퇴근 시각 ' + clock + (overtime > 0
      ? ' (야근 ' + ((overtime >= 60 ? Math.floor(overtime / 60) + '시간 ' : '')
        + (overtime % 60 ? (overtime % 60) + '분' : '')).trim() + ')'
      : ' (정시 퇴근!)'),
    loseResult: (floor, turn) => floor + 'F 에서 쓰러졌다. (' + turn + '턴)',
    best: (floor) => '최고 기록: ' + (floor === 0 ? '퇴근 성공' : floor + 'F 까지'), // 0 = 끝까지 깼다
    restart: '야근하기',
    score: { clear: '퇴근 성공', kills: (n) => '퇴근시킨 적 ' + n + '명', items: (n) => '모은 아이템 ' + n + '개', turns: (n) => '걸린 턴 ' + n },
    weapon: '키보드',
    thrown: '볼펜',
    throwWait: (turns) => '볼펜을 다시 집는 중… (' + turns + '턴)',
    floorIntro: (floor, clock) => (floor === 1
      ? '1F 로비. 그런데 사장님이 출구를 막고 있다! 지금 ' + clock + '.'
      : floor + 'F. 계단으로 내려가자. 모두 퇴근시키면 강화 보너스!'),
    exitLocked: (left) => '로비 문이 잠겨 있다. 남은 적 ' + left + '명을 먼저 퇴근시키자.',
    exitOpen: '모두 퇴근했다. 로비 문이 열렸다!',
  },
};

// 탄 목록 (탄 고르기 창에 이 순서로 나온다). 2탄부터는 탄마다 파일을 따로 두고 거기서 push 한다 (js/home.js)
const STAGES = [COMPANY];

let STAGE = COMPANY; // 지금 고른 탄
