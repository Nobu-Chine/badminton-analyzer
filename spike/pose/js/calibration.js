// 動画の上でコートの4点をタップしてもらい、映像 → コートの変換の式を作る。
// ふだんは四隅（いちばん外側の線の角）。隠れている角は「見えない」を押して、代わりに別の線の交点を使える。
import { computeHomography, applyHomography } from './homography.js';
import { courtGeometry, quadArea } from './courtPoints.js';

// 順番に案内する四隅（画面で見た位置）
export const CORNER_LABELS = ['左奥', '右奥', '右手前', '左手前'];
const MIN_AREA = 8; // 4点が作る四角形がこれより小さい（m²）と、正確に変換できない

// 自分が画面の左側なら、コート図の上下・左右を入れ替えて、自分がいつも下（y>0）に来るようにする
function toCourt([x, y], meOnRight) {
  return meOnRight ? [x, y] : [Settings.court.width - x, -y];
}

// pairs：[{ img: [x, y], court: [x, y] }]（court は基準の向き）
// 戻り値：{ H: 映像→コート, Hinv: コート→映像 } か、作れなければ { error: 理由 }
export function buildHomography(pairs, meOnRight) {
  if (pairs.length !== 4) return { error: '4点そろっていません' };
  if (quadArea(pairs.map((p) => p.court)) < MIN_AREA) {
    return { error: '選んだ点が近すぎるか、一直線に並んでいます。なるべく離れた点を選んでください' };
  }
  const img = pairs.map((p) => p.img);
  const court = pairs.map((p) => toCourt(p.court, meOnRight));
  const H = computeHomography(img, court);
  const Hinv = computeHomography(court, img);
  return H && Hinv ? { H, Hinv } : { error: '点が読み取れませんでした。もう一度タップしてください' };
}

// 解析する映像の範囲（動画のピクセル）を求める：対象のコートのまわりだけ
//   Hinv：コート → 映像の変換の式、area：コート上の範囲 { minX, maxX, minY, maxY }（m）
//   足元は床の上にあるが、体はその上に映るので、上に広げる
export function courtBoxInImage(Hinv, area, videoW, videoH) {
  const pts = [[area.minX, area.minY], [area.minX, area.maxY], [area.maxX, area.maxY], [area.maxX, area.minY]]
    .map((p) => applyHomography(Hinv, p));
  let x1 = Math.min(...pts.map((p) => p[0]));
  let x2 = Math.max(...pts.map((p) => p[0]));
  let y1 = Math.min(...pts.map((p) => p[1]));
  let y2 = Math.max(...pts.map((p) => p[1]));
  const up = Math.max((y2 - y1) * 0.35, videoH * 0.15); // 体の高さのぶん
  const pad = videoW * 0.02;
  x1 = Math.max(0, Math.floor(x1 - pad));
  x2 = Math.min(videoW, Math.ceil(x2 + pad));
  y1 = Math.max(0, Math.floor(y1 - up));
  y2 = Math.min(videoH, Math.ceil(y2 + pad));
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}


// タップとドラッグの受付
//   指を置くと拡大鏡が出て、指をずらして位置を合わせ、離したところに点を置く（スマホで指に隠れて見えないため）
//   置いた点は、あとから指でつかんで動かせる（4点そろったあとも、黄色い線を見ながら微調整できる）
//   onChange()：状態が変わるたび（画面の描き直し用）
//   onDone(pairs)：4点そろったとき、またはそろったあとに点を動かしたとき
export function createCalibration(canvas, video, { onChange, onDone }) {
  const corners = courtGeometry().corners;
  const GRAB = 30;         // 置いた点から、画面上で何px以内を押したら「その点をつかんだ」とみなすか
  let pairs = [];
  let active = false;
  let picking = false;     // 代わりの点をコート図で選んでいるところ
  let substitute = null;   // 選んだ代わりの点（次に動画の上でタップする点）
  let drag = null;         // 指を置いている間：{ index: 動かしている点の番号（新しい点なら -1）, pos: 今の位置 }

  // 画面上の位置を、動画の元のピクセルに直す
  function toImage(e) {
    const rect = canvas.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width * video.videoWidth,
            (e.clientY - rect.top) / rect.height * video.videoHeight];
  }

  // 押した所の近くにある、置いた点の番号（なければ -1）
  function grabbedIndex(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / video.videoWidth;
    let best = -1;
    let bestDist = GRAB;
    pairs.forEach((p, i) => {
      const d = Math.hypot(p.img[0] * scale - (e.clientX - rect.left), p.img[1] * scale - (e.clientY - rect.top));
      if (d < bestDist) { best = i; bestDist = d; }
    });
    return best;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (picking || !video.videoWidth) return;
    const index = grabbedIndex(e);
    if (index < 0 && !active) return; // 設定が終わったあとは、置いた点をつかんだときだけ
    drag = { index, pos: toImage(e) };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 指でなく、プログラムから押したときなど */ }
    e.preventDefault();
    onChange();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.pos = toImage(e);
    if (drag.index >= 0) pairs[drag.index].img = drag.pos;
    onChange();
  });

  canvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const { index, pos } = drag;
    drag = null;
    if (index < 0) {
      // 新しい点を置く
      pairs.push({ img: pos, court: substitute || corners[pairs.length] });
      substitute = null;
      if (pairs.length === 4) active = false;
    }
    onChange();
    if (pairs.length === 4) onDone(pairs);
  });

  canvas.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag = null;
    onChange();
  });

  return {
    start() { pairs = []; active = true; picking = false; substitute = null; drag = null; onChange(); },
    // 1つ戻す：代わりの点を選んでいる途中ならそれを取り消し、そうでなければ最後に置いた点を消す
    undo() {
      if (picking || substitute) { picking = false; substitute = null; }
      else if (pairs.length > 0) { pairs.pop(); }
      active = true;
      onChange();
    },
    // 今の番の角が見えない → コート図で代わりの点を選ぶ
    markHidden() { if (active) { picking = true; substitute = null; onChange(); } },
    // コート図で代わりの点が選ばれた
    pick(courtPoint) { substitute = courtPoint; picking = false; onChange(); },
    state() {
      return {
        active,
        picking,
        substitute,
        // 次に動画の上でタップしてもらう点の名前
        nextLabel: !active || picking ? null : substitute ? '選んだ点' : CORNER_LABELS[pairs.length] + 'の角',
        imagePoints: pairs.map((p) => p.img),
        // 使用済みの点：もう使った点と、まだ使っていない残りの角（代わりの点に選ばないように）
        usedCourt: [...pairs.map((p) => p.court), ...corners.slice(pairs.length + 1)],
        // 指を置いている所（拡大鏡を出す位置）。指を置いていなければ null
        loupe: drag ? drag.pos : null,
        // 戻せるものがあるか
        canUndo: picking || !!substitute || pairs.length > 0,
      };
    },
    pairs: () => pairs,
  };
}
