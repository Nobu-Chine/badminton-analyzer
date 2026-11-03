// 動画の上でコートの4点をタップしてもらい、映像 → コートの変換の式を作る。
// ふだんは四隅（いちばん外側の線の角）。隠れている角は「見えない」を押して、代わりに別の線の交点を使える。
import { computeHomography } from './homography.js';
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

// タップの受付
//   onChange()：状態が変わるたび（画面の描き直し用）
//   onDone(pairs)：4点そろったとき
export function createCalibration(canvas, video, { onChange, onDone }) {
  const corners = courtGeometry().corners;
  let pairs = [];
  let active = false;
  let picking = false;     // 代わりの点をコート図で選んでいるところ
  let substitute = null;   // 選んだ代わりの点（次に動画の上でタップする点）

  canvas.addEventListener('click', (e) => {
    if (!active || picking) return;
    // 画面上の位置を、動画の元のピクセルに直す
    const rect = canvas.getBoundingClientRect();
    const img = [(e.clientX - rect.left) / rect.width * video.videoWidth,
                 (e.clientY - rect.top) / rect.height * video.videoHeight];
    pairs.push({ img, court: substitute || corners[pairs.length] });
    substitute = null;
    if (pairs.length === 4) active = false;
    onChange();
    if (pairs.length === 4) onDone(pairs);
  });

  return {
    start() { pairs = []; active = true; picking = false; substitute = null; onChange(); },
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
      };
    },
    pairs: () => pairs,
  };
}
