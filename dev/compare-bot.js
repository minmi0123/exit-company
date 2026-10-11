// 리팩터링 전후 비교용 봇. 공개 함수(newRun/act/throwPen/useItem/choosePerk)와 state 만 쓴다.
// 같은 시드 + 같은 봇 = 같은 판이어야 한다. 매 스텝의 상태·메시지·HUD 를 해시에 넣는다.
// 쓰는 법: 고치기 전 · 고친 뒤 페이지를 각각 열고, 개발자 도구 콘솔에 이 파일 내용을 붙여 넣은 다음
//   JSON.stringify([...runBot(100, 1000, 0), ...runBot(100, 5000, 40), ...runBot(100, 9000, 150)])
// 를 실행해 두 결과가 글자 하나까지 같은지 본다. (저장된 기록을 지우고 시작하니 평소 쓰는 브라우저 말고 다른 창에서)
// boost = 주인공 멘탈을 그만큼 올려 깊은 층 · 보스까지 가 보게 한다
// stage = 돌릴 탄 (기본: 1탄). 예) runBot(100, 1000, 0, STAGES[1])
window.runBot = function (count, firstSeed = 1000, boost = 0, stage = STAGES[0], maxSteps = 4000) {
  const BL = BLOCKING;
  if (typeof setStage === 'function') setStage(stage);
  const has = (flag) => Object.keys(STAGE.items).find((k) => STAGE.items[k][flag] && state.bag[k] > 0);
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const fnv = (h, s) => {
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  };
  const text = (id) => document.getElementById(id).textContent.replace(/\s+/g, '');
  Object.keys(localStorage).filter((k) => k.startsWith('exit-company')).forEach((k) => localStorage.removeItem(k));
  const results = [];
  for (let seed = firstSeed; seed < firstSeed + count; seed++) {
    state.screen = 'play';
    document.getElementById('title').className = '';
    newRun(seed);
    if (boost) { state.stat.maxMental += boost; state.mental += boost; } // 깊은 층·보스까지 가 보게
    let h = 2166136261;
    let steps = 0;
    let botR = seed;
    const r = () => (botR = (botR * 16807) % 2147483647) / 2147483647;
    let prevSig = '';
    let stuck = 0;
    while (!state.over && steps < maxSteps) {
      steps++;
      const hero = state.hero;
      if (state.choosing) {
        choosePerk(state.perkChoices[Math.floor(r() * state.perkChoices.length)]);
      } else if (state.grab && has('escape')) useItem(has('escape'));
      else if (state.mental <= 8 && has('heal')) useItem(has('heal'));
      else if (state.throwCd === 0 && throwTarget()) throwPen();
      else if (stuck >= 2) {
        act(Object.keys(DIRV)[Math.floor(r() * 4)]);
      } else {
        const grid = state.map.grid;
        const dist = distances(grid, hero, BL);
        let target = null;
        let best = 1e9;
        for (const e of state.enemies) {
          const d = dist[e.y][e.x];
          if (d >= 0 && d < best) { best = d; target = e; }
        }
        if (!target) {
          for (const it of state.items) {
            const d = dist[it.y][it.x];
            if (d >= 0 && d < best) { best = d; target = it; }
          }
        }
        if (!target) {
          grid.forEach((row, y) => row.forEach((t, x) => { if (TILES[t].goal) target = { x, y }; }));
        }
        const toT = distances(grid, target, BL);
        let dir = null;
        let bd = 1e9;
        for (const [name, [dx, dy]] of Object.entries(DIRV)) {
          const d = toT[hero.y + dy][hero.x + dx];
          if (d >= 0 && d < bd) { bd = d; dir = name; }
        }
        act(dir || Object.keys(DIRV)[Math.floor(r() * 4)]);
      }
      const sig = [state.turn, hero.x, hero.y, state.floor, state.choosing].join();
      stuck = sig === prevSig ? stuck + 1 : 0;
      prevSig = sig;
      h = fnv(h, JSON.stringify([
        state.turn, state.floor, state.mental, hero.x, hero.y, hero.facing, state.overtime, state.bag, state.throwCd,
        state.items.map((it) => [it.kind, it.x, it.y]),
        state.enemies.map((e) => [e.kind, e.x, e.y, e.hp, e.bonus, e.awake ? 1 : 0, e.cooldown, e.facing]),
        state.grab ? state.grab.turns : -1, state.perks, state.over,
        text('msg'), text('hud'), text('items'), text('bossbar'),
        document.getElementById('bossbar').className, document.getElementById('stage').className,
        [...document.querySelectorAll('#items button')].map((b) => [b.disabled, b.className]),
      ]));
    }
    results.push({
      seed, hash: h, steps, floor: state.floor, turn: state.turn, over: state.over,
      title: text('overlayTitle'), result: text('result'), score: text('score'), perks: text('perks'),
    });
  }
  return results;
};
