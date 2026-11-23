// つなぎ目の検出の計算だけを持つ（画面にも動画にも触らない）。
// RallyShot などでラリーだけを切り取ってつないだ動画は、カメラが固定なので、
// 同じラリーの中では前後のコマがほとんど変わらず、つなぎ目でだけ一瞬で大きく変わる。
// その「1コマだけ急に跳ねる所」をつなぎ目とみなす。数字は settings.js の cutDetect。
const CutDetect = (() => {
  // changes：[{ t: そのコマの時間, v: 前のコマから変わった割合（0〜1） }]
  // 戻り値：つなぎ目の時間の一覧（時間順）
  function findCuts(changes, opt = Settings.cutDetect) {
    const cuts = [];
    const lastTime = changes.length ? changes[changes.length - 1].t : 0;
    for (let i = 1; i < changes.length; i++) { // 最初のコマ（読み始め）は比べる相手がないので除く
      const c = changes[i];
      // 動画の始まりと終わりの近く（読み始め・読み終わりの絵の切り替わり）は、つなぎ目にしない
      if (c.t < opt.minGap || c.t > lastTime - opt.minGap || c.v < opt.minChange) continue;
      // まわりのコマ（前後 opt.around コマ）のふだんの変わり方（中央値）
      const around = [];
      for (let k = i - opt.around; k <= i + opt.around; k++) {
        if (k !== i && k >= 1 && k < changes.length) around.push(changes[k].v);
      }
      around.sort((a, b) => a - b);
      const usual = around.length ? around[around.length >> 1] : 0;
      // ふだんより十分大きく跳ねたら、つなぎ目
      if (c.v < opt.ratio * Math.max(usual, opt.floor)) continue;
      const last = cuts[cuts.length - 1];
      if (last && c.t - last.t < opt.minGap) {
        if (c.v > last.v) cuts[cuts.length - 1] = c; // 近すぎるときは、より大きく跳ねた方
      } else {
        cuts.push(c);
      }
    }
    return cuts.map((c) => c.t);
  }

  return { findCuts };
})();
