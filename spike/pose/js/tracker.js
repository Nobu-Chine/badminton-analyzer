// 見つかった足元（コート上の位置）から、四隅をタップしたコートのシングルスの2人だけを選んで、動きを数える。
//   コートの外の人（隣のコートの人、審判など）は除く
//   ネットのどちら側にいるかで「自分（y>0）／相手（y<0）」を決める
// 画面には触らない（計算だけ）。

// 「コート内の人」とみなす範囲：タップした四隅（いちばん外側の線）の中だけ
//   コーチ席・審判・隣のコートの人を拾わないため。選手が線の外に出ている間は、位置を記録しない（飛ばすだけ）
//   線の外も少し含めたいときは EXTRA を増やす（m）
const EXTRA = 0;
const SIDE_OUT = 0.46 + EXTRA;  // シングルスのサイドラインから、ダブルスのサイドラインまで（0.46m）
const BACK_OUT = 0 + EXTRA;     // バックラインまで
// 見間違いの判定：前回から「経過時間 × MAX_SPEED ＋ MAX_STEP」より遠くに見つかったら無視する
//   （隠れていた・処理が遅くてコマを飛ばした、のように時間が空いたときは、そのぶん遠くても受け入れる）
const MAX_SPEED = 8;       // 人が動ける速さの上限（m/秒）
const MAX_STEP = 1;        // 足元の見つけ方のぶれの分（m）
const RECOVER = 3;         // 続けてこの回数「遠すぎる」になったら、そちらを本当の位置とみなして追いつく
const JUMP_SEC = 2;        // 前回からこれ以上時間が空いたら（動画を飛ばしたなど）、そこから数え直す
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
      自分: { pos: null, lastTime: 0, rejects: 0, trail: [], distance: 0, zones: {}, seen: 0 },
      相手: { pos: null, lastTime: 0, rejects: 0, trail: [], distance: 0, zones: {}, seen: 0 },
    };
    frames = 0;
    detectedTotal = 0;
    inCourtTotal = 0;
  }
  reset();

  function inCourt([x, y]) {
    return x >= -SIDE_OUT && x <= W + SIDE_OUT && Math.abs(y) <= HALF + BACK_OUT;
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
      const dt = timeSec - p.lastTime;
      let next;
      if (!prev || dt < 0 || dt > JUMP_SEC) {
        // 最初の1回、または動画を飛ばしたとき：そこから数え直す（移動距離には足さない）
        next = { x, y };
        p.rejects = 0;
      } else if (Math.hypot(x - prev.x, y - prev.y) > MAX_SPEED * dt + MAX_STEP) {
        // 経過時間のわりに遠すぎる：見間違いとして無視する
        // ただし続けて何回も遠くに見つかるなら、そちらが本当の位置なので追いつく（距離には足さない）
        p.rejects++;
        if (p.rejects < RECOVER) return;
        next = { x, y };
        p.rejects = 0;
      } else {
        next = { x: prev.x + (x - prev.x) * SMOOTH, y: prev.y + (y - prev.y) * SMOOTH };
        p.distance += Math.hypot(next.x - prev.x, next.y - prev.y);
        p.rejects = 0;
      }
      p.pos = next;
      p.lastTime = timeSec;
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

  // 「コート内の人」とみなす範囲（コート上の位置、m）。解析する映像の範囲を決めるのに使う
  const area = { minX: -SIDE_OUT, maxX: W + SIDE_OUT, minY: -HALF - BACK_OUT, maxY: HALF + BACK_OUT };

  return { update, summary, reset, trails: () => players, inCourt, area: () => area };
}
