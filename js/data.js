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

// ai: melee(쫓아와서 때림) · ranged(한 줄로 보이면 던짐) · grab(붙잡기) · wander(돌아다니다 부름)
// short/obj: 문장에 넣을 이름 (받침에 따라 을/를)
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
    lines: [
      '팀장님이 잔을 채운다.',
      '팀장님: "한 잔만 더~"',
      '팀장님이 옛날 이야기를 시작했다.',
    ],
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
    lines: ['상사: "이거 누가 좀 해 봐." 주변 적이 몰려온다!'],
  },
};

// 보스: 1층 출구 앞을 지킨다. 살아 있는 동안 출구가 잠긴다
const BOSS = {
  name: '야근 강요하는 사장님',
  short: '사장님', obj: '사장님을',
  ai: 'boss',
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
  lines: [
    '사장님: "요즘 애들은 끈기가 없어."',
    '사장님: "내일 아침까지 되지?"',
    '사장님: "나 때는 말이야…"',
    '사장님: "퇴근? 일 다 했어?"',
  ],
};
ENEMY_TYPES.boss = BOSS;

// 층별 적 구성 (5F → 1F). 한 층에 한 종씩 새로 등장
const ENEMIES_PER_FLOOR = {
  5: { donggi: 3 },
  4: { donggi: 3, client: 2 },
  3: { donggi: 3, client: 2, leader: 1 },
  2: { donggi: 3, client: 2, leader: 2, sangsa: 1 },
  1: { donggi: 2, client: 1 },  // 보스 층은 가볍게 (사장님이 동기를 불러오므로)
};

// 상사가 쓰러지면 남은 적 공격력이 이만큼 오른다
const SANGSA_DEATH_BUFF = 1;

// 아이템. 층마다 min~max 개, chance 는 그 층에 나올 확률
// tag/desc: 메뉴얼에 보이는 글 (수치는 쓰지 않는다)
const ITEM_TYPES = {
  coffee: { name: '커피', key: 1, min: 2, max: 3, chance: 1, heal: 5,
    tag: '회복', desc: '멘탈을 회복한다. 가장 자주 나온다.' },
  annual: { name: '연차', key: 2, min: 1, max: 1, chance: 0.7, turns: 5,  // 무적. 강해서 한 층에 하나까지
    tag: '무적 · 탈출', desc: '잠시 무적이 된다. 팀장님에게 붙잡혔을 때 쓰면 빠져나온다.' },
  half:   { name: '반차', key: 3, min: 1, max: 2, chance: 0.8, turns: 5, power: 1.5, // 공격력 1.5배 (올림)
    tag: '공격 · 탈출', desc: '오전에 몰아서 끝낸다. 잠시 공격력이 1.5배가 된다. 팀장님에게 붙잡혔을 때 쓰면 빠져나온다.' },
};
