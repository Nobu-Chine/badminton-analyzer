// AI（MediaPipe の物体検出）を読み込んで、映像に映っている人の足元の位置を返す。
// 人を「箱」で見つけて、箱の下の真ん中を足元とみなす。
// 体育館を2階から撮った映像のように、人が小さくたくさん映る場面では、姿勢推定より物体検出のほうがよく見つかる。
// 動画はブラウザの中だけで処理する。最初に AI の部品（数MB）をダウンロードするだけで、動画はどこにも送らない。
const VERSION = '0.10.14';
const LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSION;
const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  full: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite',
};
const MIN_SCORE = 0.25;   // これより自信のない検出は使わない
const MAX_WIDE = 1.3;     // 横幅が高さのこの倍より大きい箱は、人ではない（床に置いたバッグなど）とみなす
const TILE_STEP = 0.75;   // タイルをずらす幅（タイルの大きさに対して。0.75 なら 25% ずつ重なる）
const SAME_PERSON = 0.05; // 足元がタイルの大きさのこの割合より近ければ、同じ人とみなす

let detector = null;
let loadedModel = null;
const work = document.createElement('canvas'); // 切り出した映像を置く場所

// model：'lite'（軽い）か 'full'（精度が高いが重い）
export async function loadDetector(model) {
  if (detector && loadedModel === model) return;
  const { FilesetResolver, ObjectDetector } = await import(LIB + '/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(LIB + '/wasm');
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODELS[model], delegate },
    runningMode: 'VIDEO',
    categoryAllowlist: ['person'],
    scoreThreshold: MIN_SCORE,
    maxResults: 30,
  });
  if (detector) detector.close();
  // スマホの画像処理の機能（GPU）が使えなければ、CPU で動かす
  try {
    detector = await ObjectDetector.createFromOptions(fileset, options('GPU'));
  } catch (e) {
    detector = await ObjectDetector.createFromOptions(fileset, options('CPU'));
  }
  loadedModel = model;

  // 1回目の解析だけ準備で数秒かかるので、ここで空のコマを1回解析しておく（処理時間の測定に混ぜないため）
  work.width = 320;
  work.height = 320;
  work.getContext('2d').fillRect(0, 0, 320, 320);
  detector.detectForVideo(work, 1);
}

// 今のコマで見つかった人の足元（動画のピクセル）を返す：[[x, y], ...]
// box：映像のうち、解析する範囲 { x, y, w, h }（対象のコートのまわりだけを切り出して、人を大きく見せる）
//   AI は画像を正方形に縮めてから見るので、横長の範囲をそのまま渡すと人がつぶれて見えなくなる。
//   そこで、範囲を正方形のタイルに分けて1枚ずつ渡す（タイルは少し重ねて、境目の人を取りこぼさない）
// timestampMs は呼ぶたびに大きくなる数（MediaPipe の決まり。タイルごとに 1 ずつ足す）
export function detectFeet(video, timestampMs, box) {
  if (!detector) return [];
  const b = box || { x: 0, y: 0, w: video.videoWidth, h: video.videoHeight };
  const size = Math.min(b.w, b.h);
  const step = Math.max(1, Math.round(size * TILE_STEP));
  const feet = [];
  let stamp = timestampMs;
  let count = 0;
  // 横長なら左から右へ、縦長なら上から下へタイルを並べる
  const along = b.w >= b.h ? 'x' : 'y';
  const length = along === 'x' ? b.w : b.h;
  for (let pos = 0; ; pos += step) {
    const start = Math.min(pos, Math.max(0, length - size));
    const tx = along === 'x' ? b.x + start : b.x;
    const ty = along === 'y' ? b.y + start : b.y;
    count++;
    work.width = size;
    work.height = size;
    work.getContext('2d').drawImage(video, tx, ty, size, size, 0, 0, size, size);
    detector.detectForVideo(work, stamp++).detections
      .map((d) => d.boundingBox)
      .filter((r) => r.width <= r.height * MAX_WIDE)
      .forEach((r) => feet.push([tx + r.originX + r.width / 2, ty + r.originY + r.height]));
    if (start + size >= length) break;
  }
  // タイルの重なった所で同じ人を2回見つけたら、1人にまとめる
  const merged = [];
  feet.forEach((p) => {
    if (!merged.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < size * SAME_PERSON)) merged.push(p);
  });
  lastTiles = count;
  return merged;
}

// 直前の解析で使ったタイルの枚数（処理速度の表示用）
let lastTiles = 0;
export function lastTileCount() {
  return lastTiles;
}
