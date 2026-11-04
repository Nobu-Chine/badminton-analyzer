// 試作ページの部品をつなぐだけのファイル。
import { applyHomography } from './homography.js';
import { buildHomography, createCalibration, courtBoxInImage } from './calibration.js';
import { courtGeometry, pointName } from './courtPoints.js';
import { createPointPicker } from './pointPicker.js';
import { loadDetector, detectFeet, lastTileCount } from './detector.js';
import { createTracker } from './tracker.js';
import { createOverlay } from './overlay.js';
import { createZoom } from './zoom.js';
import { buildReport } from './report.js';

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const seek = document.getElementById('seek');
const runBtn = document.getElementById('runBtn');
const runStatus = document.getElementById('runStatus');
const calibStatus = document.getElementById('calibStatus');
const hiddenBtn = document.getElementById('hiddenBtn');
const undoBtn = document.getElementById('undoBtn');
const meSide = document.getElementById('meSide');
const modelSelect = document.getElementById('model');

const INTERVAL_MS = 100;  // 何ミリ秒ごとに解析するか（1秒に最大10コマ）
const TRAIL = 150;        // コート図に出す、最近の点の数（1人あたり）

const overlay = createOverlay(canvas, video);
const videoWrap = document.getElementById('videoWrap');
const zoomResetBtn = document.getElementById('zoomResetBtn');
// 動画の枠の中だけを2本指で拡大する。2本指で触り始めたら、1本指の操作（点を置く）は取り消す
const zoom = createZoom(videoWrap, document.getElementById('zoomLayer'), {
  onChange(scale) {
    zoomResetBtn.hidden = scale <= 1.01;
    updateTouchAction();
    redrawOverlay();
  },
  onGestureStart: () => calibration.cancelDrag(),
});
zoomResetBtn.onclick = () => zoom.reset();

// 動画の上を指でなぞったときにページをスクロールさせるかどうか
//   四隅の設定中・設定後・拡大中は、指の操作を点やピンチに使うのでスクロールしない
function updateTouchAction() {
  const st = calibration.state();
  const busy = st.active || st.imagePoints.length > 0 || zoom.scale() > 1.01;
  videoWrap.style.touchAction = busy ? 'none' : 'pan-y';
}
const tracker = createTracker(Rules.zone);
let H = null;             // 映像 → コートの変換の式
let Hinv = null;          // コート → 映像の変換の式（動画の上にコートの線を描く用）
let box = null;           // 解析する映像の範囲（対象のコートのまわりだけ）
let lastFeet = [];        // 直近のコマで見つかった足元（表示用）
let lastRun = 0;
let lastStamp = 0;
let costs = [];           // 1コマの処理にかかった時間（ミリ秒）
let videoName = '';       // 選んだ動画のファイル名（検証結果に書く）
let range = null;         // 解析した動画の範囲 { from, to }（秒）

// 解析の記録を消して、数え直す（動画や四隅の設定を変えたとき）
function resetAnalysis() {
  tracker.reset();
  costs = [];
  range = null;
}

Court.init(() => {});     // コート図は表示だけ（タップは使わない）

function fmt(sec) {
  const s = Math.floor(sec || 0);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function redrawOverlay() {
  const st = calibration.state();
  // 設定ができたら、その設定でコートの線を動画の上に描く（実際の線と重なれば合っている）
  // コートの線は「自分は左／右」で入れ替えても同じ形なので、そのまま変換できる
  const lines = Hinv ? courtGeometry().segments.map(([a, b]) => [applyHomography(Hinv, a), applyHomography(Hinv, b)]) : [];
  overlay.draw({ points: st.imagePoints, lines, box, feet: lastFeet, nextLabel: st.nextLabel,
    preview: st.preview, zoom: zoom.scale() });
}

// ===== 1. 動画 =====
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  videoName = file.name;
  zoom.reset();
  resetAnalysis();
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
// 4点から変換の式を作る（4点そろっていなければ、設定なしに戻す）
function updateHomography() {
  const pairs = calibration.pairs();
  const result = pairs.length === 4 ? buildHomography(pairs, meSide.value === 'right') : {};
  H = result.H || null;
  Hinv = result.Hinv || null;
  box = Hinv ? courtBoxInImage(Hinv, tracker.area(), video.videoWidth, video.videoHeight) : null;
  return result;
}

// 4点がそろった／動かし終わったとき：設定を確定して、解析の記録を数え直す
function applyCalibration() {
  const result = updateHomography();
  calibStatus.textContent = H
    ? '設定できました。黄色い線が実際のコートの線と重なっていればOK（ずれていたら、黄色い点を指でつかんで動かせます）'
    : result.error;
  resetAnalysis();
  render();
  redrawOverlay();
}

const calibration = createCalibration(canvas, video, {
  onChange() {
    const st = calibration.state();
    // 点を動かしている間も、黄色い線をすぐに描き直す
    updateHomography();
    updateTouchAction();
    undoBtn.hidden = !st.canUndo;
    hiddenBtn.hidden = !st.active || st.picking || !!st.substitute;
    if (!st.picking && !st.substitute) picker.hide();
    if (st.active) {
      calibStatus.textContent = st.picking
        ? '下のコート図で、動画に映っている線の交点を選んでください（隠れている角に近い点ほど正確です）'
        : st.substitute
          ? '選んだ点：' + pointName(st.substitute) + '。動画の上で、この点をタップしてください（違っていたら、コート図をもう一度タップして選び直せます）'
          : '動画の上で、コートの「' + st.nextLabel + '」に指を置いてください。指を動かして合わせ、離したところに点が置かれます。細かい所は2本指で拡大できます（見えなければ「この角は見えない」）';
    }
    redrawOverlay();
  },
  onDone: applyCalibration,
  isBlocked: () => zoom.isGesturing(),
});

const picker = createPointPicker(document.getElementById('pointPicker'), (p) => calibration.pick(p));

document.getElementById('calibBtn').onclick = () => {
  if (!video.src) { alert('先に動画を選んでください'); return; }
  video.pause();
  H = null;
  Hinv = null;
  box = null;
  calibration.start();
};
hiddenBtn.onclick = () => {
  picker.show(calibration.state().usedCourt);
  calibration.markHidden();
};
undoBtn.onclick = () => calibration.undo();
meSide.addEventListener('change', () => {
  if (calibration.pairs().length === 4) applyCalibration();
  else { resetAnalysis(); render(); }
});

// ===== 3. 解析しながら再生 =====
// 1コマ分を解析する
function analyze() {
  const now = performance.now();
  if (now - lastRun < INTERVAL_MS) return;
  lastRun = now;
  const stamp = Math.max(Math.round(now), lastStamp + 1); // MediaPipe には、毎回大きくなる時刻を渡す
  lastStamp = stamp + 100; // タイルごとに時刻を 1 ずつ使うので、次のコマはそれより後にする

  const t0 = performance.now();
  const feetImg = detectFeet(video, stamp, box);
  costs.push(performance.now() - t0);
  if (costs.length > 50) costs.shift();

  const feetCourt = feetImg.map((p) => applyHomography(H, p));
  lastFeet = feetImg.map(([x, y], i) => ({ x, y, inCourt: tracker.inCourt(feetCourt[i]) }));
  tracker.update(feetCourt, video.currentTime);
  const t = video.currentTime;
  range = range ? { from: Math.min(range.from, t), to: Math.max(range.to, t) } : { from: t, to: t };
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
document.getElementById('resetBtn').onclick = () => { resetAnalysis(); lastFeet = []; render(); redrawOverlay(); };

// 試作ページは結果を保存しないので、解析したあとにページを離れようとしたら確認を出す
window.addEventListener('beforeunload', (e) => {
  if (tracker.summary().frames === 0) return;
  e.preventDefault();
  e.returnValue = ''; // ブラウザが「このページを離れますか？」と確認を出す
});

// ===== 結果の表示 =====
function averageCost() {
  return costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
}
// 1秒に何コマ解析できるか（解析の間隔の上限 10コマ を超えない）
function framesPerSecond(avgCost) {
  return avgCost ? Math.min(1000 / INTERVAL_MS, 1000 / avgCost) : 0;
}
function render() {
  const players = tracker.trails();
  const points = [
    ...players.自分.trail.slice(-TRAIL).map((p) => ({ ...p, side: '自分' })),
    ...players.相手.trail.slice(-TRAIL).map((p) => ({ ...p, side: '相手' })),
  ];
  // 本体のコート図の色分け（得点＝青、失点＝赤）を、自分＝青、相手＝赤として使う
  Court.drawDots(points, (p) => (p.side === '自分' ? '得点' : '失点'));

  const s = tracker.summary();
  const avgCost = averageCost();
  const zones = ['ネット前', '中盤', 'コート奥', 'コート外'];
  const row = (name) => {
    const p = s[name];
    const found = s.frames ? Math.round(p.seen / s.frames * 100) : 0;
    return '<tr><th>' + name + '</th><td>' + p.distance.toFixed(1) + ' m</td>' +
      zones.map((z) => '<td>' + (p.share[z] || 0) + '%</td>').join('') +
      '<td>' + found + '%</td></tr>';
  };
  document.getElementById('stats').innerHTML =
    '<p class="perf">1コマの処理：' + avgCost.toFixed(0) + ' ms（タイル ' + lastTileCount() + ' 枚）' +
    (avgCost ? '（1秒に約 ' + framesPerSecond(avgCost).toFixed(1) + ' コマ）' : '') +
    '<br>解析したコマ数：' + s.frames +
    '<br>見つかった人（平均）：' + s.avgDetected.toFixed(1) + '人、うち対象のコート内：' + s.avgInCourt.toFixed(1) + '人</p>' +
    '<table><tr><th></th><th>移動</th>' + zones.map((z) => '<th>' + z + '</th>').join('') + '<th>見つけた割合</th></tr>' +
    row('自分') + row('相手') + '</table>';
}
setInterval(() => { if (!video.paused) render(); }, 500);
video.addEventListener('pause', render);
render();

// ===== 検証結果のコピー（GitHub の PR #2 にコメントで貼るため） =====
const copyStatus = document.getElementById('copyStatus');
const reportText = document.getElementById('reportText');
document.getElementById('copyBtn').onclick = async () => {
  const s = tracker.summary();
  if (s.frames === 0) { copyStatus.textContent = 'まだ解析していません。解析してから押してください'; return; }
  const avgCost = averageCost();
  const text = buildReport({
    videoName: videoName || '（不明）',
    duration: video.duration,
    from: range ? range.from : 0,
    to: range ? range.to : 0,
    modelLabel: modelSelect.options[modelSelect.selectedIndex].text,
    avgCost,
    tiles: lastTileCount(),
    fps: framesPerSecond(avgCost),
    summary: s,
  });
  reportText.value = text;
  try {
    await navigator.clipboard.writeText(text);
    reportText.setAttribute('hidden', '');
    copyStatus.textContent = 'コピーしました。「PR #2 を開く」→ いちばん下のコメント欄に貼り付けて、メモを書き足して「Comment」を押してください';
  } catch (e) {
    // コピーできない環境では、文章を出して手で選んでもらう
    reportText.removeAttribute('hidden');
    reportText.select();
    copyStatus.textContent = '自動でコピーできませんでした。下の文章を長押しして、全部選んでコピーしてください';
  }
};
