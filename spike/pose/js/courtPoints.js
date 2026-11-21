// コートの床の線（交点と線分）の位置を持つ。計算だけで、画面には触らない。
// 四隅が見えないときの「代わりの点」と、動画の上にコートの線を重ねて描くのに使う。
//
// 座標は calibration.js の基準（自分が画面の右側にいるとき）：
//   x：コートの幅の方向（画面の奥のサイドラインが小さい側）。シングルスの幅が 0〜W
//   y：コートの長さの方向（画面の左のバックラインが -HALF、ネットが 0）
export function courtGeometry() {
  const W = Settings.court.width;
  const HALF = Settings.court.half;
  const SHORT = Settings.court.shortLine;
  const side = (6.10 - W) / 2;      // ダブルスとシングルスのサイドラインの間（0.46m）
  const LONG = HALF - 0.76;         // ダブルスのロングサービスライン（バックラインの 0.76m 内側）

  const xs = [-side, 0, W, W + side];                 // サイドライン（ダブルス・シングルス）
  const ys = [-HALF, -LONG, -SHORT, SHORT, LONG, HALF]; // バックライン・ロングサービスライン・ショートサービスライン

  // 線と線の交点
  const points = [];
  xs.forEach((x) => ys.forEach((y) => points.push([x, y])));
  [-HALF, -SHORT, SHORT, HALF].forEach((y) => points.push([W / 2, y])); // センターラインの端

  // 描く線（両端の点）
  const segments = [
    ...xs.map((x) => [[x, -HALF], [x, HALF]]),
    ...ys.map((y) => [[-side, y], [W + side, y]]),
    [[W / 2, -HALF], [W / 2, -SHORT]],
    [[W / 2, SHORT], [W / 2, HALF]],
  ];

  // 四隅：左奥 → 右奥 → 右手前 → 左手前（いちばん外側の線の角）
  const corners = [[-side, -HALF], [-side, HALF], [W + side, HALF], [W + side, -HALF]];

  return { points, segments, corners, bounds: { minX: -side, maxX: W + side, minY: -HALF, maxY: HALF } };
}

// 交点の名前（例：「手前のダブルスのサイドライン × 右のロングサービスライン」）。選んだ点の確認に使う
export function pointName([x, y]) {
  const W = Settings.court.width;
  const HALF = Settings.court.half;
  const side = (6.10 - W) / 2;
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const xName = near(x, -side) ? '奥のダブルスのサイドライン'
    : near(x, 0) ? '奥のシングルスのサイドライン'
    : near(x, W) ? '手前のシングルスのサイドライン'
    : near(x, W + side) ? '手前のダブルスのサイドライン'
    : 'センターライン';
  const lr = y < 0 ? '左の' : '右の';
  const yName = near(Math.abs(y), HALF) ? 'バックライン'
    : near(Math.abs(y), HALF - 0.76) ? 'ロングサービスライン（ダブルス）'
    : 'ショートサービスライン';
  return xName + ' × ' + lr + yName;
}

// pt にいちばん近い交点を返す。used に入っている点は選ばない
export function nearestPoint(pt, used = []) {
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  return courtGeometry().points
    .filter((p) => !used.some((u) => same(u, p)))
    .sort((a, b) => Math.hypot(a[0] - pt[0], a[1] - pt[1]) - Math.hypot(b[0] - pt[0], b[1] - pt[1]))[0];
}

// 4点が作る四角形の面積（m²）。小さすぎると、点が近すぎるか一直線に並んでいる
export function quadArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}
