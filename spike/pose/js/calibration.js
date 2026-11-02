// 動画の上でコートの四隅をタップしてもらい、映像 → コートの変換の式を作る。
// タップするのは、いちばん外側の線（ダブルスのサイドライン × バックライン）の角。
import { computeHomography } from './homography.js';

// 順番に案内する四隅（画面で見た位置）
export const CORNER_LABELS = ['左奥', '右奥', '右手前', '左手前'];

// コート上の四隅（メートル）。本体と同じ座標：シングルスの幅 0〜W、ネットが y=0、自分コートが y>0
// 自分が画面の右側にいるとき：画面の左のバックラインが相手側（y<0）、奥のサイドラインが x の小さい側
function courtCorners(meOnRight) {
  const W = Settings.court.width;
  const HALF = Settings.court.half;
  const side = (6.10 - W) / 2; // ダブルスとシングルスのサイドラインの間（0.46m）
  const corners = [[-side, -HALF], [-side, HALF], [W + side, HALF], [W + side, -HALF]];
  // 自分が左側なら、コート図の上下・左右を入れ替えて、自分がいつも下に来るようにする
  return meOnRight ? corners : corners.map(([x, y]) => [W - x, -y]);
}

// 映像の4点（タップした順）から変換の式を作る。作れなければ null
export function buildHomography(imagePoints, meOnRight) {
  if (imagePoints.length !== 4) return null;
  return computeHomography(imagePoints, courtCorners(meOnRight));
}

// タップの受付。onPoint(points) はタップのたびに、onDone(points) は4点そろったときに呼ばれる
export function createCalibration(canvas, video, { onPoint, onDone }) {
  let points = [];
  let active = false;

  canvas.addEventListener('click', (e) => {
    if (!active) return;
    // 画面上の位置を、動画の元のピクセルに直す
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * video.videoWidth;
    const y = (e.clientY - rect.top) / rect.height * video.videoHeight;
    points.push([x, y]);
    onPoint(points);
    if (points.length === 4) {
      active = false;
      onDone(points);
    }
  });

  return {
    start() { points = []; active = true; onPoint(points); },
    isActive: () => active,
    points: () => points,
  };
}
