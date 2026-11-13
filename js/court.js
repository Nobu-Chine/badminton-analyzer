// コート図：両面コートの描画、タップ位置の変換、記録の点の表示
// 座標はメートル。ネットが y=0、相手コートは y<0、自分コートは y>0（保存する位置はいつもこの向き）。
// 見た目の向きだけを変えられる：
//   縦：自分コートが下（これまでどおり）
//   横：横から撮った動画と同じ向き。自分コートを左か右に置く
// 向きを変えても、コートを回して描くだけなので、タップした位置はいつも同じ座標に戻る。
const Court = (() => {
  const svg = document.getElementById('court');
  const NS = 'http://www.w3.org/2000/svg';

  // シングルスのコート寸法（m）は settings.js から
  const W = Settings.court.width;
  const HALF = Settings.court.half;
  const SHORT = Settings.court.shortLine;
  const MARGIN = 1;    // アウトの位置も押せるように外側の余白

  const COLORS = { 得点: '#2a7de1', 失点: '#d9443b' };
  let view = { orientation: 'vertical', meSide: 'right' };
  let content = null;  // コートを描く層（向きに合わせて回す）
  let dots = null;
  let last = { records: [], scoreOf: null }; // 向きを変えたときに点を描き直すため

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent.appendChild(e);
    return e;
  }

  // 向きごとの「回し方」と、図全体の範囲（viewBox）
  //   横・自分が右：-90度回す（y が大きいほど右）。横・自分が左：90度回す
  function layout() {
    const lenH = HALF + MARGIN;
    if (view.orientation === 'vertical') {
      return { transform: '', box: [-MARGIN, -lenH, W + MARGIN * 2, lenH * 2] };
    }
    if (view.meSide === 'right') {
      return { transform: 'rotate(-90)', box: [-lenH, -(W + MARGIN), lenH * 2, W + MARGIN * 2] };
    }
    return { transform: 'rotate(90)', box: [-lenH, -MARGIN, lenH * 2, W + MARGIN * 2] };
  }

  // 「相手コート」「自分コート」の文字（回すと読めないので、回さない層に置く）
  function labels(box) {
    const [bx, by, bw, bh] = box;
    const put = (text, x, y) => {
      const t = el('text', { x, y, 'font-size': 0.32, 'text-anchor': 'middle', fill: '#555' }, svg);
      t.textContent = text;
    };
    if (view.orientation === 'vertical') {
      put('相手コート', W / 2, -HALF - 0.35);
      put('自分コート', W / 2, HALF + 0.65);
      return;
    }
    const midY = by + bh / 2 + 0.11;
    const left = bx + MARGIN / 2;
    const right = bx + bw - MARGIN / 2;
    put(view.meSide === 'right' ? '相手' : '自分', left, midY);
    put(view.meSide === 'right' ? '自分' : '相手', right, midY);
  }

  function draw() {
    svg.innerHTML = '';
    const { transform, box } = layout();
    svg.setAttribute('viewBox', box.join(' '));
    svg.classList.toggle('horizontal', view.orientation === 'horizontal');
    el('rect', { x: box[0], y: box[1], width: box[2], height: box[3], fill: '#e9eef0' }, svg);

    content = el('g', { transform }, svg);
    el('rect', { x: 0, y: -HALF, width: W, height: HALF, fill: '#3f7f63' }, content); // 相手コート（少し暗く）
    el('rect', { x: 0, y: 0, width: W, height: HALF, fill: '#2e8b57' }, content);       // 自分コート

    const lines = el('g', { stroke: '#fff', 'stroke-width': 0.04, fill: 'none' }, content);
    el('rect', { x: 0, y: -HALF, width: W, height: HALF * 2 }, lines);
    [-1, 1].forEach((side) => {
      el('line', { x1: 0, y1: side * SHORT, x2: W, y2: side * SHORT }, lines);           // ショートサービスライン
      el('line', { x1: W / 2, y1: side * SHORT, x2: W / 2, y2: side * HALF }, lines);    // センターライン
    });
    el('line', { x1: -0.3, y1: 0, x2: W + 0.3, y2: 0, stroke: '#333', 'stroke-width': 0.08 }, content); // ネット

    labels(box);
    dots = el('g', {}, content);
    if (last.scoreOf) drawDots(last.records, last.scoreOf);
  }

  // onTap(x, y)：タップされた位置をコート図の座標（メートル）で受け取る
  // initialView：最初の向き { orientation, meSide }
  function init(onTap, initialView) {
    if (initialView) view = initialView;
    draw();
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      // 回したコートの層を基準に戻すので、向きに関係なく同じ座標になる
      const p = pt.matrixTransform(content.getScreenCTM().inverse());
      onTap(p.x, p.y);
    });
  }

  // 向きを変える（描き直す）
  function setView(next) {
    view = next;
    draw();
  }

  // records の点を描く。色は得点／失点で分ける
  // scoreOf(record)：'得点' か '失点' を返す関数（判定のルールは court では持たない）
  function drawDots(records, scoreOf) {
    last = { records, scoreOf };
    dots.innerHTML = '';
    records.forEach((r) => {
      el('circle', {
        cx: r.x, cy: r.y, r: 0.15,
        fill: COLORS[scoreOf(r)], stroke: '#fff', 'stroke-width': 0.03,
      }, dots);
    });
  }

  return { init, setView, drawDots };
})();
