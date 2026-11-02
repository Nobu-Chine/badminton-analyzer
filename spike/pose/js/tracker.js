// 見つかった足元（コート上の位置）から、四隅をタップしたコートのシングルスの2人だけを選んで、動きを数える。
//   コートの外の人（隣のコートの人、審判など）は除く
//   ネットのどちら側にいるかで「自分（y>0）／相手（y<0）」を決める
// 画面には触らない（計算だけ）。

const OUTSIDE = 1.5;       // コートの線から外に何mまでを「コート内の人」とみなすか（アウト際の動きも拾う）
const MAX_STEP = 3;        // 1回の更新で、これ以上動いたら見間違いとして無視する（m）
const SMOOTH = 0.5;        // 位置のぶれをならす強さ（0〜1、小さいほどなめらか）

export function createTracker(zoneOf) {
  const W = Settings.court.width;
  const HALF = Settings.court.half;
  let players = null;
  let frames = 0;
  let detectedTotal = 0;
  let inCourtTotal = 0;

  function reset() {
    players = {
      自分: { pos: null, trail: [], distance: 0, zones: {}, seen: 0 },
      相手: { pos: null, trail: [], distance: 0, zones: {}, seen: 0 },
    };
    frames = 0;
    detectedTotal = 0;
    inCourtTotal = 0;
  }
  reset();

  function inCourt([x, y]) {
    return x >= -OUTSIDE && x <= W + OUTSIDE && Math.abs(y) <= HALF + OUTSIDE;
  }

  // 1コマ分を受け取る。feet はコート上の位置 [[x, y], ...]
  function update(feet, timeSec) {
    frames++;
    detectedTotal += feet.length;
    const inside = feet.filter(inCourt);
    inCourtTotal += inside.length;

    [['自分', 1], ['相手', -1]].forEach(([name, sign]) => {
      const candidates = inside.filter(([, y]) => y * sign > 0);
      if (candidates.length === 0) return;
      // 同じ側に2人いたら（見間違い）、そのサイドの真ん中に近いほうを選ぶ
      const cx = W / 2, cy = sign * HALF / 2;
      const [x, y] = candidates.sort((a, b) =>
        Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
      const p = players[name];
      const prev = p.pos;
      const next = prev ? { x: prev.x + (x - prev.x) * SMOOTH, y: prev.y + (y - prev.y) * SMOOTH } : { x, y };
      if (prev) {
        const step = Math.hypot(next.x - prev.x, next.y - prev.y);
        if (step > MAX_STEP) return;
        p.distance += step;
      }
      p.pos = next;
      p.seen++;
      p.trail.push({ x: next.x, y: next.y, t: timeSec });
      const zone = zoneOf(next) || 'コート外';
      p.zones[zone] = (p.zones[zone] || 0) + 1;
    });
  }

  // 表示用のまとめ
  function summary() {
    const of = (p) => {
      const total = Object.values(p.zones).reduce((s, n) => s + n, 0) || 1;
      const share = {};
      Object.entries(p.zones).forEach(([k, n]) => { share[k] = Math.round(n / total * 100); });
      return { distance: p.distance, share, seen: p.seen };
    };
    return {
      frames,
      avgDetected: frames ? detectedTotal / frames : 0,
      avgInCourt: frames ? inCourtTotal / frames : 0,
      自分: of(players.自分),
      相手: of(players.相手),
    };
  }

  return { update, summary, reset, trails: () => players, inCourt };
}
