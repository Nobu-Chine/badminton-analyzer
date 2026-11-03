// 試作ページの部品をつなぐだけのファイル。
import { applyHomography } from './homography.js';
import { CORNER_LABELS, buildHomography, createCalibration } from './calibration.js';
import { loadDetector, detectFeet } from './detector.js';
import { createTracker } from './tracker.js';
import { createOverlay } from './overlay.js';

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const seek = document.getElementById('seek');
const runBtn = document.getElementById('runBtn');
const runStatus = document.getElementById('runStatus');
const calibStatus = document.getElementById('calibStatus');
const meSide = document.getElementById('meSide');
const modelSelect = document.getElementById('model');

const INTERVAL_MS = 100;  // 何ミリ秒ごとに解析するか（1秒に最大10コマ）
const TRAIL = 150;        // コート図に出す、最近の点の数（1人あたり）

const overlay = createOverlay(canvas, video);
const tracker = createTracker(Rules.zone);
let H = null;             // 映像 → コートの変換の式
let lastFeet = [];        // 直近のコマで見つかった足元（表示用）
let lastRun = 0;
let lastStamp = 0;
let costs = [];           // 1コマの処理にかかった時間（ミリ秒）

Court.init(() => {});     // コート図は表示だけ（タップは使わない）

function fmt(sec) {
  const s = Math.floor(sec || 0);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function redrawOverlay() {
  overlay.draw({
    corners: calibration.points(),
    feet: lastFeet,
    nextLabel: calibration.isActive() ? CORNER_LABELS[calibration.points().length] : null,
  });
}

// ===== 1. 動画 =====
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  tracker.reset();
  costs = [];
  render();
});
video.addEventListener('loadedmetadata', () => {
  seek.max = video.duration;
  redrawOverlay();
});
video.addEventListener('timeupdate', () => {
  seek.value = video.currentTime;
  document.getElementById('time').textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
});
seek.addEventListener('input', () => { video.currentTime = Number(seek.value); });

// ===== 2. 四隅のタップ =====
const calibration = createCalibration(canvas, video, {
  onPoint: redrawOverlay,
  onDone(points) {
    H = buildHomography(points, meSide.value === 'right');
    calibStatus.textContent = H ? '設定できました。このコートの中にいる人が緑の点になります'
                                : '四隅が読み取れませんでした。もう一度タップしてください';
    tracker.reset();
    redrawOverlay();
  },
});
document.getElementById('calibBtn').onclick = () => {
  if (!video.src) { alert('先に動画を選んでください'); return; }
  video.pause();
  H = null;
  calibStatus.textContent = 'コートの角を、案内の順に4か所タップしてください';
  calibration.start();
};
meSide.addEventListener('change', () => {
  if (calibration.points().length === 4) H = buildHomography(calibration.points(), meSide.value === 'right');
  tracker.reset();
  render();
});

// ===== 3. 解析しながら再生 =====
// 1コマ分を解析する
function analyze() {
  const now = performance.now();
  if (now - lastRun < INTERVAL_MS) return;
  lastRun = now;
  const stamp = Math.max(Math.round(now), lastStamp + 1); // MediaPipe には、毎回大きくなる時刻を渡す
  lastStamp = stamp;

  const t0 = performance.now();
  const feetImg = detectFeet(video, stamp);
  costs.push(performance.now() - t0);
  if (costs.length > 50) costs.shift();

  const feetCourt = feetImg.map((p) => applyHomography(H, p));
  lastFeet = feetImg.map(([x, y], i) => ({ x, y, inCourt: tracker.inCourt(feetCourt[i]) }));
  tracker.update(feetCourt, video.currentTime);
  redrawOverlay();
}

// 動画のコマが表示されるたびに呼ぶ（対応していないブラウザは画面の書き換えごと）
function loop() {
  if (video.paused || video.ended) return;
  analyze();
  if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(loop);
  else requestAnimationFrame(loop);
}

runBtn.onclick = async () => {
  if (!video.src) { alert('先に動画を選んでください'); return; }
  if (!H) { alert('先にコートの四隅をタップしてください'); return; }
  if (!video.paused) { video.pause(); return; }
  runBtn.disabled = true;
  runStatus.textContent = 'AIを読み込み中…（初回は数MBのダウンロードがあります）';
  try {
    await loadDetector(modelSelect.value);
  } catch (e) {
    runStatus.textContent = 'AIを読み込めませんでした：' + e.message;
    runBtn.disabled = false;
    return;
  }
  runBtn.disabled = false;
  runStatus.textContent = '解析中…（もう一度押すと止まります）';
  await video.play();
  loop();
};
video.addEventListener('play', () => { runBtn.textContent = '⏸ 止める'; });
video.addEventListener('pause', () => {
  runBtn.textContent = '▶ 解析しながら再生';
  if (H) runStatus.textContent = '止めました';
});
document.getElementById('resetBtn').onclick = () => { tracker.reset(); costs = []; lastFeet = []; render(); redrawOverlay(); };

// 試作ページは結果を保存しないので、解析したあとにページを離れようとしたら確認を出す
window.addEventListener('beforeunload', (e) => {
  if (tracker.summary().frames === 0) return;
  e.preventDefault();
  e.returnValue = ''; // ブラウザが「このページを離れますか？」と確認を出す
});

// ===== 結果の表示 =====
function render() {
  const players = tracker.trails();
  const points = [
    ...players.自分.trail.slice(-TRAIL).map((p) => ({ ...p, side: '自分' })),
    ...players.相手.trail.slice(-TRAIL).map((p) => ({ ...p, side: '相手' })),
  ];
  // 本体のコート図の色分け（得点＝青、失点＝赤）を、自分＝青、相手＝赤として使う
  Court.drawDots(points, (p) => (p.side === '自分' ? '得点' : '失点'));

  const s = tracker.summary();
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  const zones = ['ネット前', '中盤', 'コート奥', 'コート外'];
  const row = (name) => {
    const p = s[name];
    const found = s.frames ? Math.round(p.seen / s.frames * 100) : 0;
    return '<tr><th>' + name + '</th><td>' + p.distance.toFixed(1) + ' m</td>' +
      zones.map((z) => '<td>' + (p.share[z] || 0) + '%</td>').join('') +
      '<td>' + found + '%</td></tr>';
  };
  document.getElementById('stats').innerHTML =
    '<p class="perf">1コマの処理：' + avgCost.toFixed(0) + ' ms' +
    (avgCost ? '（1秒に約 ' + Math.min(1000 / INTERVAL_MS, 1000 / avgCost).toFixed(1) + ' コマ）' : '') +
    '<br>解析したコマ数：' + s.frames +
    '<br>見つかった人（平均）：' + s.avgDetected.toFixed(1) + '人、うち対象のコート内：' + s.avgInCourt.toFixed(1) + '人</p>' +
    '<table><tr><th></th><th>移動</th>' + zones.map((z) => '<th>' + z + '</th>').join('') + '<th>見つけた割合</th></tr>' +
    row('自分') + row('相手') + '</table>';
}
setInterval(() => { if (!video.paused) render(); }, 500);
video.addEventListener('pause', render);
render();
