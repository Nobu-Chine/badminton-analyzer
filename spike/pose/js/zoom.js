// 動画の枠の中だけを、2本指で拡大・移動する（ピンチ）。
//   2本指：ピンチで拡大・縮小、そのまま動かすと見る場所を移動
//   1本指の操作（点を置く・動かす）は calibration.js に任せる
// 中の層（動画と、上に重ねた canvas）を CSS の transform で拡大するだけなので、
// 点の位置の計算（getBoundingClientRect を使う）はそのまま正しく動く。
const MAX_SCALE = 5;

// wrap：枠（はみ出した所は隠す）、layer：拡大する中の層
// onChange(scale)：拡大率が変わったとき
// onGestureStart()：2本指で触り始めたとき（1本指の操作を取り消してもらうため）
export function createZoom(wrap, layer, { onChange, onGestureStart }) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const pointers = new Map(); // 触っている指：id → { x, y }（画面上の位置）
  let start = null;           // 2本指で触り始めたときの状態

  function apply() {
    // 拡大しても、枠の中に隙間ができないように移動の範囲をしぼる
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    tx = Math.min(0, Math.max(w - w * scale, tx));
    ty = Math.min(0, Math.max(h - h * scale, ty));
    layer.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
    onChange(scale);
  }

  // 枠の左上からの位置（画面上の px）
  function local(p) {
    const rect = wrap.getBoundingClientRect();
    return { x: p.x - rect.left, y: p.y - rect.top };
  }

  function twoFingers() {
    const [a, b] = [...pointers.values()];
    const mid = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    return { mid, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  // 指の動きは、枠の中の層より先に受け取る（capture）。1本指のときは、そのまま点の操作に渡す
  wrap.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      onGestureStart();
      const { mid, dist } = twoFingers();
      // 触り始めた2本指の真ん中が、拡大前の映像のどこにあたるか
      start = { dist, scale, contentX: (mid.x - tx) / scale, contentY: (mid.y - ty) / scale };
    }
  }, true);

  wrap.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size !== 2 || !start) return;
    const { mid, dist } = twoFingers();
    scale = Math.min(MAX_SCALE, Math.max(1, start.scale * dist / start.dist));
    // 2本指の真ん中にあった映像の場所が、指の真ん中に来るように移動する（ピンチしながら動かせる）
    tx = mid.x - start.contentX * scale;
    ty = mid.y - start.contentY * scale;
    apply();
  }, true);

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) start = null;
  };
  wrap.addEventListener('pointerup', end, true);
  wrap.addEventListener('pointercancel', end, true);

  return {
    // 2本以上の指で触っているか（このときは点を置かない）
    isGesturing: () => pointers.size >= 2,
    reset() { scale = 1; tx = 0; ty = 0; apply(); },
    scale: () => scale,
  };
}
