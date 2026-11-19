// ラリーの自動検出の計算だけを持つ（画面にも動画にも触らない）。
// 音の大きさの記録 [{ t: 動画の時間, e: 高い音の強さ }] から、
//   1. まわりよりぐっと大きい瞬間を「打球音」として拾い
//   2. 打球音が短い間隔で続いている所を「ラリー」とみなして
//   3. ラリーの始まり（最初の打球音の少し前）の時間を返す
// 数字は settings.js の rallyDetect。
const RallyDetect = (() => {
  // 打球音の時間を拾う
  function findHits(samples, opt) {
    const pts = samples.filter((s) => s.e > 0).map((s) => ({ t: s.t, l: Math.log10(s.e) }));
    const hits = [];
    let lo = 0;
    let hi = 0;
    for (let i = 0; i < pts.length; i++) {
      // 前後1秒の中央値を「ふだんの音」とする
      while (pts[lo].t < pts[i].t - 1) lo++;
      while (hi < pts.length && pts[hi].t <= pts[i].t + 1) hi++;
      const around = pts.slice(lo, hi).map((p) => p.l).sort((a, b) => a - b);
      const base = around[around.length >> 1];
      const peak = (i === 0 || pts[i].l >= pts[i - 1].l) && (i === pts.length - 1 || pts[i].l >= pts[i + 1].l);
      if (peak && pts[i].l - base > opt.hitLoudness &&
          (hits.length === 0 || pts[i].t - hits[hits.length - 1] > opt.hitMinGap)) {
        hits.push(pts[i].t);
      }
    }
    return hits;
  }

  // 打球音を、間隔で区切ってラリーにまとめる → [{ start, end, hits }]
  function groupRallies(hits, opt) {
    const rallies = [];
    let cur = null;
    hits.forEach((t) => {
      if (cur && t - cur.end <= opt.rallyGap) { cur.end = t; cur.hits++; return; }
      cur = { start: t, end: t, hits: 1 };
      rallies.push(cur);
    });
    return rallies.filter((r) => r.hits >= opt.rallyMinHits);
  }

  // ラリーの始まりの時間（印を付ける時間）の一覧
  function findStarts(samples, opt = Settings.rallyDetect) {
    const rallies = groupRallies(findHits(samples, opt), opt);
    return rallies.map((r) => Math.max(0, r.start - opt.leadSeconds));
  }

  return { findHits, groupRallies, findStarts };
})();
