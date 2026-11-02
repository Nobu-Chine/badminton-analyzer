// AI（MediaPipe の姿勢推定）を読み込んで、映像に映っている人の足元の位置を返す。
// 動画はブラウザの中だけで処理する。最初に AI の部品（数MB）をダウンロードするだけで、動画はどこにも送らない。
const VERSION = '0.10.14';
const LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSION;
const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};

// 足元として使う体の点（MediaPipe の番号）：左右のかかと・つま先
const FOOT_POINTS = [29, 30, 31, 32];

let landmarker = null;
let loadedModel = null;

// model：'lite'（軽い）か 'full'（精度が高いが重い）
export async function loadDetector(model) {
  if (landmarker && loadedModel === model) return;
  const { FilesetResolver, PoseLandmarker } = await import(LIB + '/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(LIB + '/wasm');
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODELS[model], delegate },
    runningMode: 'VIDEO',
    numPoses: 6, // 奥のコートの人も映るので、多めに見つける（あとでコートの外の人は除く）
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
  if (landmarker) landmarker.close();
  // スマホの画像処理の機能（GPU）が使えなければ、CPU で動かす
  try {
    landmarker = await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (e) {
    landmarker = await PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }
  loadedModel = model;

  // 1回目の解析だけ準備で数秒かかるので、ここで空のコマを1回解析しておく（処理時間の測定に混ぜないため）
  const blank = document.createElement('canvas');
  blank.width = 640;
  blank.height = 360;
  blank.getContext('2d').fillRect(0, 0, 640, 360);
  landmarker.detectForVideo(blank, 1);
}

// 今のコマで見つかった人の足元（動画のピクセル）を返す：[[x, y], ...]
// timestampMs は呼ぶたびに大きくなる数（MediaPipe の決まり）
export function detectFeet(video, timestampMs) {
  if (!landmarker) return [];
  const result = landmarker.detectForVideo(video, timestampMs);
  return result.landmarks.map((points) => {
    const feet = FOOT_POINTS.map((i) => points[i]).filter(Boolean);
    const x = feet.reduce((s, p) => s + p.x, 0) / feet.length;
    const y = feet.reduce((s, p) => s + p.y, 0) / feet.length;
    return [x * video.videoWidth, y * video.videoHeight];
  });
}
