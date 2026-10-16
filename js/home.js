// 2탄 집 — 수치 · 유혹(적) · 아이템 · 강화. 밸런스 조정은 여기서만
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다
// data.js 뒤에 불러온다 (1탄 표와 같은 모양으로 만들어 STAGES 에 넣는다)

// ─────────────────────────────────────────────
// 2탄 집 — 21:00 에 집에 도착해 침실 침대에 눕기까지
//    규칙은 1탄과 같다. 체력 이름만 "의지". 방 4개 = 층 4개 (4 현관 → 3 거실 → 2 부엌 → 1 침실)
//    수치는 1탄 값에서 시작해 봇으로 1탄과 비슷한 난이도가 되게 맞췄다 (2026-10-11). 사람이 해 본 값은 아직 아니다
// ─────────────────────────────────────────────
const HOME_ROOMS = ['', '침실', '부엌', '거실', '현관']; // 층 번호 → 방 이름

// 효과는 1탄 강화와 같고 이름만 집에 맞췄다
const HOME_PERKS = [
  { id: 'slipper', name: '두꺼운 슬리퍼', desc: '슬리퍼 공격 +1',
    apply: (s) => { s.attack += 1; } },
  { id: 'socks', name: '양말 한 켤레 더', desc: '던지기 대기 1턴 줄임',
    apply: (s) => { s.throwCooldown -= 1; }, available: (s) => s.throwCooldown > 1 },
  { id: 'ball', name: '돌돌 만 양말', desc: '던지기 피해 +1',
    apply: (s) => { s.throwDamage += 1; } },
  { id: 'resolve', name: '굳은 결심', desc: '최대 의지 +5, 바로 5 회복',
    apply: (s) => { s.maxMental += 5; state.mental += 5; } },
  { id: 'cup', name: '큰 컵', desc: '물·냉장고 회복 +2',
    apply: (s) => { s.healBonus += 2; } },
  { id: 'earplug', name: '귀마개', desc: '받는 피해 -1 (최소 1)',
    apply: (s) => { s.guard += 1; }, available: (s) => s.guard < 2 },
  { id: 'clock', name: '칼취침 본능', desc: '시계가 느리게 간다 (30분에 25턴 더)',
    apply: (s) => { s.clockSlow += 25; }, available: (s) => s.clockSlow < 50 },
  { id: 'tidy', name: '정리 정돈', desc: '방에 들어갈 때마다 무작위 아이템 1개',
    apply: (s) => { s.floorItems += 1; } },
  { id: 'autoplay', name: '자동 재생 끄기', desc: '넷플릭스 붙잡기 1턴 줄임',
    apply: (s) => { s.grabResist += 1; }, available: (s) => s.grabResist < 2 },
  { id: 'reset', name: '알고리즘 초기화', desc: '시간이 밀려도 알고리즘 공격력이 안 오름',
    apply: (s) => { s.overtimeImmune = true; }, available: (s) => !s.overtimeImmune },
];

const HOME_ESCAPE = '(방해금지·자기계발서로 탈출)';

// 유혹(적). 행동(ai)은 1탄과 같은 규칙을 쓴다: 숏폼 = 동기 · 배달 앱 = 고객사 · 넷플릭스 = 팀장님 · 술 = 상사
const HOME_ENEMIES = {
  shorts: {
    name: '끝없는 숏폼',
    short: '숏폼', obj: '숏폼을',
    ai: 'melee',
    desc: '가장 흔한 유혹. 눈에 띄면 쫓아와서 시간을 빼앗는다.',
    hp: 6,
    attack: 3,
    sight: 8,
    lines: [
      '숏폼: "딱 하나만 더." 벌써 열 개째다.',
      '숏폼이 다음 영상을 밀어 올렸다.',
      '숏폼: "이것만 보고 자야지."',
      '숏폼이 강아지 영상을 틀었다.',
    ],
  },
  delivery: {
    name: '배달 앱 알림',
    short: '배달 앱', obj: '배달 앱을',
    ai: 'ranged',
    desc: '같은 줄에 막힘없이 보이면 멀리서 할인 알림을 던진다. 던진 뒤엔 잠깐 쉰다. 맷집은 약하다.',
    hp: 3,
    attack: 3,
    range: 5,
    sight: 8,
    lines: [
      '배달 앱이 "오늘만 3천원 할인" 알림을 던졌다.',
      '배달 앱: "야식 어때요?"',
      '배달 앱이 치킨 사진을 던졌다.',
      '배달 앱: "최소 주문까지 2천원 남았어요."',
    ],
  },
  netflix: {
    name: '다음 화 자동 재생',
    short: '넷플릭스', obj: '넷플릭스를',
    ai: 'grab',
    desc: '옆에 붙으면 정주행에 붙잡는다. 붙잡힌 동안 못 움직이고 매 턴 의지가 깎이며, 넷플릭스를 때릴 수도 없다. 방해금지·자기계발서로 빠져나오거나, 버티면 풀려난다.',
    hp: 9,
    attack: 2,
    grabDamage: 2,
    grabTurns: 3,
    grabCooldown: 4,
    sight: 8,
    lines: [
      '다음 화가 5초 뒤에 시작된다.',
      '넷플릭스: "아직 보고 계신가요?"',
      '오프닝을 건너뛰었다.',
    ],
    grabLabel: '정주행',
    grabLine: (turns) => '넷플릭스: "다음 화 자동 재생." 붙잡혔다! (방해금지·자기계발서로 탈출 / ' + turns + '턴 뒤 풀려남)',
    releaseLine: '한 화가 끝났다. 겨우 일어났다.',
    escapeLine: '정주행에서 빠져나왔다!',
    declineLine: '방해금지 중이라 다음 화 알림이 오지 않았다.',
    pokeLine: '넷플릭스가 신작 예고편을 틀었다.',
    holdAttackLine: '리모컨이 손에 안 잡힌다… ' + HOME_ESCAPE,
    holdMoveLine: '소파에서 일어날 수가 없다… ' + HOME_ESCAPE,
    holdThrowLine: '넷플릭스 말고는 맞힐 게 없다… ' + HOME_ESCAPE,
  },
  soju: {
    name: '혼술 한 잔',
    short: '술', obj: '술을',
    ai: 'wander',
    desc: '돌아다니기만 한다. 가까이 가거나 때리면 같은 방 유혹을 부른다. 뿌리치면 취기가 올라 남은 유혹이 강해진다.',
    hp: 6,
    attack: 0,
    notice: 2,
    callCooldown: 8,
    lines: [
      '술: "안주가 있어야지." 주변 유혹이 몰려온다!',
      '술: "한 잔 하면서 뭐라도 틀자." 주변 유혹이 몰려온다!',
      '술: "오늘 고생했잖아~" 주변 유혹이 몰려온다!',
    ],
    aloneLine: '술: "한 잔만?" …아무 일도 없었다.',
    idleMark: '♪',
    deathBuff: 1,
    deathBuffLine: '취기가 올라온다! 남은 유혹 공격력 +',
    leaveLines: [
      '술: "딱 한 캔이었는데…"',
      '술: "내일의 나에게 맡길게."',
      '술: "이건 물이야, 물."',
    ],
  },
  algo: {
    name: '새벽 2시의 알고리즘',
    short: '알고리즘', obj: '알고리즘을',
    ai: 'boss',
    boss: true,
    scale: 2,
    desc: '침대를 차지하고 있다. 뿌리쳐야 누울 수 있다. 알아챈 뒤로 시간을 순삭하며 점점 세지고, 숏폼을 계속 추천한다. 평소엔 한 턴씩 걸러 움직이지만 (머리 위 "!" = 다음 턴에 행동), 궁지에 몰리면 매 턴 움직인다.',
    hp: 27,           // 1탄 사장님은 30. 방이 하나 적어 강화를 덜 받고 오므로 낮췄다. 24 는 조금 쉽다는 평가로 27 (2026-10-11)
    attack: 5,
    sight: 6,
    summonEvery: 5,
    maxSummons: 3,
    enrageAt: 0.5,
    firstSummonDelay: 6,
    actEvery: 2,
    overtimeEvery: 8,
    overtimeMaxBonus: 3,
    summonKind: 'shorts',
    summonLine: '알고리즘: "이런 영상은 어때요?" 숏폼이 추천됐다.',
    enrageLine: '알고리즘이 취향을 완전히 파악했다! "맞춤 추천 시작." 이제 매 턴 움직인다.',
    lockLine: '침대에 누울 수가 없다. 알고리즘: "하나만 더 보고 자요."',
    overtimeLine: ' 알고리즘이 시간을 순삭했다.',
    overtimeUpLine: ' 알고리즘 공격력 +1',
    overtimeImmuneLine: ' (알고리즘 초기화: 공격력 그대로)',
    lines: [
      '알고리즘: "회원님을 위한 추천."',
      '알고리즘: "5분이면 돼요."',
      '알고리즘: "다들 이거 보던데요?"',
      '알고리즘: "아직 안 졸리잖아요."',
    ],
  },
};

// 방별 유혹 구성 (4 현관 → 1 침실). 1탄보다 방이 하나 적어 강화를 덜 받으므로 1탄보다 조금 적게 둔다
// 2026-10-11 봇 비교: 1탄 구성을 그대로 옮기면(거실·부엌에 넷플릭스 1·2, 술 1·2 + 보스 체력 30) 같은 봇이 한 번도 못 깼다.
// 아래 구성 + 보스 체력 24 에서 1탄과 비슷해졌다 (맨몸 봇 2/150 · 의지 +40 봇 10/100, 1탄은 2/150 · 13/100)
const HOME_ENEMIES_PER_FLOOR = {
  4: { shorts: 3 },
  3: { shorts: 3, delivery: 1, netflix: 1, soju: 1 },
  2: { shorts: 3, delivery: 2, netflix: 1, soju: 1 },
  1: { shorts: 2, delivery: 1 },  // 보스 방은 가볍게 (알고리즘이 숏폼을 불러오므로)
};

// 효과는 1탄의 커피 · 연차 · 반차와 같다
const HOME_ITEMS = {
  water: { name: '물 한 잔', obj: '물 한 잔을', subj: '물 한 잔이', key: 1, min: 2, max: 3, chance: 1, heal: 5,
    tag: '회복', desc: '의지를 회복한다. 가장 자주 나온다.',
    useLine: '물 한 잔을 마셨다. 정신이 든다.' },
  dnd: { name: '방해금지', key: 2, min: 1, max: 1, chance: 0.7, turns: 5, invincible: true, escape: true,
    tag: '무적 · 탈출', desc: '방해금지 모드. 잠시 무적이 된다. 넷플릭스에 붙잡혔을 때 쓰면 빠져나온다.',
    useLine: (t) => '방해금지 모드를 켰다! ' + t.turns + '턴 동안 어떤 알림도 닿지 않는다.',
    guardLine: (who) => '방해금지 중이라 ' + who + '의 알림이 울리지 않았다.' },
  book: { name: '자기계발서', key: 3, min: 1, max: 2, chance: 0.8, turns: 5, power: 1.5, escape: true,
    tag: '공격 · 탈출', desc: '의욕이 불타오른다. 잠시 공격력이 1.5배가 된다. 넷플릭스에 붙잡혔을 때 쓰면 빠져나온다.',
    useLine: (t) => '자기계발서를 펼쳤다! "미라클 모닝" — ' + t.turns + '턴 동안 공격력 ' + t.power + '배.' },
};

// 시계: 현관 21:00 부터. 03:00 이 되면 멈춘다
const HOME_CLOCK = {
  start: 21 * 60,
  every: 75,
  step: 30,
  max: 6 * 60,        // 21:00 + 6시간 = 03:00
  midnightLine: '03:00. 내일 출근은 망했다… 시계는 더 이상 보지 않기로 했다.',
};

const HOME_WAKE = 7 * 60 + 24 * 60; // 다음 날 07:00 기상 (결과 화면의 "잘 수 있는 시간" 계산용)

const HOME = {
  id: 'home',
  name: '2탄 · 집',
  desc: '현관부터 침실까지, 유혹을 뿌리치고 침대에 눕는다',
  open: true,
  requires: 'company',              // 1탄을 한 번 깨야 열린다
  topFloor: 4,
  outfit: 'pajama',                 // 옷을 따로 고르지 않았으면 집에선 잠옷
  hero: HERO,                      // 능력치는 1탄과 같다
  perks: HOME_PERKS,
  enemies: HOME_ENEMIES,
  enemiesPerFloor: HOME_ENEMIES_PER_FLOOR,
  hpPerFloor: HP_PER_FLOOR,
  boss: { kind: 'algo', floor: 1 },
  items: HOME_ITEMS,
  clock: HOME_CLOCK,
  sprites: { floor: 'homeFloor', wall: 'homeWall', wallTop: 'homeWallTop', stairs: 'door', exit: 'bed' },
  map: {
    table: 't',                                // 식탁
    pair: 's',                                 // 소파
    wallProps: ['p', 'p', 'v', 'r', 'h', 'h'], // 화분 · TV · 냉장고 · 책장
    sideProps: ['p', 'p', 'r', 'v'],
  },
  text: {
    hp: '의지',
    floorName: (floor) => HOME_ROOMS[floor],
    perkTitle: '방문 앞에서 숨을 골랐다',
    defeat: (obj, boss) => obj + ' 뿌리쳤다' + (boss ? '!' : '.'),
    clearBonus: '유혹을 모두 뿌리쳤다! 보너스 강화: ',
    floorItem: (item) => '정리해 둔 덕에 ' + (item.obj || item.name + '를') + ' 찾았다.', // 강화 "정리 정돈"
    bossWhere: '침실 침대 앞',
    dexVerb: '뿌리침',
    win: '취침 성공!',
    lose: '의지 박약…',
    winResult: (clock, overtime) => {
      const sleep = HOME_WAKE - (HOME_CLOCK.start + overtime);
      return '잠든 시각 ' + clock + ' (7시 기상까지 ' + Math.floor(sleep / 60) + '시간'
        + (sleep % 60 ? ' ' + (sleep % 60) + '분' : '') + ')';
    },
    loseResult: (floor, turn) => HOME_ROOMS[floor] + '에서 무너졌다. (' + turn + '턴)',
    best: (floor) => '최고 기록: ' + (floor === 0 ? '취침 성공' : HOME_ROOMS[floor] + '까지'),
    restart: '한 편만 더',
    score: { clear: '취침 성공', kills: (n) => '뿌리친 유혹 ' + n + '개', items: (n) => '모은 아이템 ' + n + '개', turns: (n) => '걸린 턴 ' + n },
    weapon: '슬리퍼',
    thrown: '양말',
    throwWait: (turns) => '양말을 다시 줍는 중… (' + turns + '턴)',
    floorIntro: (floor, clock) => (floor === 1
      ? '침실. 그런데 알고리즘이 침대를 차지하고 있다! 지금 ' + clock + '.'
      : HOME_ROOMS[floor] + '. 다음 방으로 가는 문을 찾자. 유혹을 모두 뿌리치면 강화 보너스!'),
    exitLocked: (left) => '아직 누울 수 없다. 남은 유혹 ' + left + '개를 먼저 뿌리치자.',
    exitOpen: '유혹이 모두 사라졌다. 이제 누울 수 있다!',
    records: {
      plays: '귀가', clears: '취침 성공', earliest: '가장 이른 취침', fastest: '가장 빠른 취침',
      kills: '뿌리친 유혹', killUnit: '개', onTime: ' 오자마자 잠들었다!',
      reached: (best) => (best === 0 ? '침대에 누움' : HOME_ROOMS[best]),
      recentTitle: '최근 잠들기',
      win: '취침 성공',
      lose: (floor) => HOME_ROOMS[floor] + '에서 의지 박약',
      empty: '아직 끝낸 판이 없다. 퇴근하기에서 2탄을 골라 보자.',
    },
  },
};

STAGES.push(
  HOME,
  { id: 'party', name: '3탄 · 회식', desc: '준비 중', open: false },
);
