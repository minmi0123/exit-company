// 효과음 (번호 없음 — 나중에 붙인 파일이라 기존 1~10 번호를 밀지 않았다)
// 일반 <script> 로 불러온다 (모듈 아님): 파일끼리 전역을 공유하고, index.html 을 더블클릭해도 열린다
// 소리도 그림처럼 코드로 만든다 (Web Audio 로 그 자리에서 합성). 외부 사운드 파일은 쓰지 않는다

// ─────────────────────────────────────────────
// 효과음 — sfx('step') 처럼 이름으로 부른다
// ─────────────────────────────────────────────
const SFX_VOLUME = 0.35; // 환경설정 볼륨 100 일 때 (기본 70 = 0.245 — 처음 정한 0.25 와 거의 같다)

// 환경설정 — 이 기기의 localStorage 에 저장한다
const SETTINGS_KEY = 'exit-company.settings';
const settings = { volume: 70, alarm: true };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
} catch (e) {
  // 저장이 막힌 환경에서는 기본값으로
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // 저장만 못 한다
  }
}

function sfxGain() {
  return SFX_VOLUME * settings.volume / 100;
}

function setVolume(v) {
  settings.volume = v;
  if (sfxOut) sfxOut.gain.value = sfxGain();
  saveSettings();
}

function setAlarmEnabled(on) {
  settings.alarm = on;
  if (!on) setAlarm(false);
  saveSettings();
}

let audioCtx = null;
let sfxOut = null;

// 브라우저는 사용자가 누르기 전엔 소리를 막는다. 첫 소리는 항상 키·터치 처리 안에서 나므로 그때 만든다
function audio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    sfxOut = audioCtx.createGain();
    sfxOut.gain.value = sfxGain();
    sfxOut.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 음 하나: 파형 · 시작/끝 주파수 · 길이(초) · 크기 · 시작 지연(초)
function tone(wave, from, to, dur, vol = 1, delay = 0) {
  const c = audioCtx;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(sfxOut);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 잡음 한 번 (타격감 · 휙 소리). 필터 주파수로 소리 색을 바꾼다
function noise(dur, vol, filterFrom, filterTo, delay = 0) {
  const c = audioCtx;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(filterFrom, t);
  f.frequency.exponentialRampToValueAtTime(filterTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(sfxOut);
  src.start(t);
}

// 음 여러 개를 차례로 (멜로디)
function notes(wave, freqs, gap, dur, vol, delay = 0) {
  freqs.forEach((f, i) => tone(wave, f, f, dur, vol, delay + i * gap));
}

const SFX = {
  // 걸음: 뽁 · 뾱 번갈아 (발마다 음 높이가 다르다)
  step: (alt) => tone('sine', alt ? 1100 : 900, alt ? 450 : 380, 0.06, 0.6),
  // 키보드로 때림: 퍽
  attack: () => {
    tone('square', 260, 90, 0.09, 0.5);
    noise(0.07, 0.8, 1800, 500);
  },
  // 볼펜 던지기: 휙
  throw: () => noise(0.14, 0.7, 900, 4000),
  // 적에게 맞음: 낮게 꺾이는 소리
  hurt: () => {
    tone('sawtooth', 240, 70, 0.2, 0.5);
    noise(0.1, 0.5, 800, 200);
  },
  // 아이템 주움: 띠링
  item: () => notes('square', [988, 1319], 0.07, 0.1, 0.35),
  // 강화 받음: 올라가는 4음
  perk: () => notes('triangle', [523, 659, 784, 1047], 0.07, 0.16, 0.7),
  // 계단 내려감: 내려가는 4음
  stairs: (delay = 0) => notes('triangle', [784, 659, 523, 392], 0.08, 0.12, 0.6, delay),
  // 정수기 물 마심: 꿀꺽꿀꺽 (올라가는 물방울 셋)
  drink: () => {
    [0, 0.13, 0.26].forEach((d, i) => tone('sine', 280 + i * 40, 750 + i * 60, 0.09, 0.7, d));
    noise(0.3, 0.15, 600, 300);
  },
  // 멘탈 붕괴: 느리게 내려가다 길게 끝
  death: () => {
    notes('square', [392, 330, 262], 0.18, 0.18, 0.35);
    tone('sawtooth', 196, 60, 0.7, 0.4, 0.54);
  },
};

// 멘탈 위험 경보: 켜 두는 동안 위잉위잉 계속 운다 (updateHud 가 멘탈을 보고 켜고 끈다)
const ALARM = { volume: 0.12, low: 520, high: 780, speed: 1.6 }; // speed = 초당 위잉 횟수
let alarm = null;

function setAlarm(on) {
  if (on && (!settings.alarm || settings.volume === 0)) on = false;
  if (on === !!alarm) return;
  try {
    if (on) {
      if (!audio()) return;
      const c = audioCtx;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const lfo = c.createOscillator();   // 음 높이를 오르내리게 하는 느린 떨림
      const depth = c.createGain();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = (ALARM.low + ALARM.high) / 2;
      lfo.frequency.value = ALARM.speed;
      depth.gain.value = (ALARM.high - ALARM.low) / 2;
      lfo.connect(depth).connect(osc.frequency);
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(ALARM.volume, t + 0.3);
      osc.connect(g).connect(sfxOut);
      osc.start(t);
      lfo.start(t);
      alarm = { osc, lfo, g };
    } else {
      const { osc, lfo, g } = alarm;
      const t = audioCtx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.stop(t + 0.25);
      lfo.stop(t + 0.25);
      alarm = null;
    }
  } catch (e) {
    alarm = null;
  }
}

function sfx(name, ...args) {
  if (settings.volume === 0) return;
  try {
    if (!audio()) return;
    SFX[name](...args);
  } catch (e) {
    // 소리가 안 나는 환경이어도 게임은 그대로 돈다
  }
}
