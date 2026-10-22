// コート図：両面コートの描画、タップ位置の変換、記録の点の表示
// 座標はメートル。ネットが y=0、相手コートは上（マイナス）、自分コートは下（プラス）。
const Court = (() => {
  const svg = document.getElementById('court');
  const NS = 'http://www.w3.org/2000/svg';

  // シングルスのコート寸法（m）
  const W = 5.18;      // 幅
  const HALF = 6.70;   // ネットからバックラインまで
  const SHORT = 1.98;  // ネットからショートサービスラインまで
  const MARGIN = 1;    // アウトの位置も押せるように外側の余白

  const COLORS = { 得点: '#2a7de1', 失点: '#d9443b' };
  let dots = null;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent.appendChild(e);
    return e;
  }

  function label(text, y) {
    const t = el('text', { x: W / 2, y, 'font-size': 0.32, 'text-anchor': 'middle', fill: '#555' }, svg);
    t.textContent = text;
  }

  function draw() {
    svg.setAttribute('viewBox', [-MARGIN, -HALF - MARGIN, W + MARGIN * 2, (HALF + MARGIN) * 2].join(' '));
    el('rect', { x: -MARGIN, y: -HALF - MARGIN, width: W + MARGIN * 2, height: (HALF + MARGIN) * 2, fill: '#e9eef0' }, svg);
    el('rect', { x: 0, y: -HALF, width: W, height: HALF, fill: '#3f7f63' }, svg); // 相手コート（少し暗く）
    el('rect', { x: 0, y: 0, width: W, height: HALF, fill: '#2e8b57' }, svg);       // 自分コート

    const lines = el('g', { stroke: '#fff', 'stroke-width': 0.04, fill: 'none' }, svg);
    el('rect', { x: 0, y: -HALF, width: W, height: HALF * 2 }, lines);
    [-1, 1].forEach((side) => {
      el('line', { x1: 0, y1: side * SHORT, x2: W, y2: side * SHORT }, lines);           // ショートサービスライン
      el('line', { x1: W / 2, y1: side * SHORT, x2: W / 2, y2: side * HALF }, lines);    // センターライン
    });

    el('line', { x1: -0.3, y1: 0, x2: W + 0.3, y2: 0, stroke: '#333', 'stroke-width': 0.08 }, svg); // ネット
    label('相手コート', -HALF - 0.35);
    label('自分コート', HALF + 0.65);
    dots = el('g', {}, svg);
  }

  // onTap(x, y)：タップされた位置をコート図の座標（メートル）で受け取る
  function init(onTap) {
    draw();
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      onTap(p.x, p.y);
    });
  }

  // records の点を描く。色は得点／失点で分ける
  // scoreOf(record)：'得点' か '失点' を返す関数（判定のルールは court では持たない）
  function drawDots(records, scoreOf) {
    dots.innerHTML = '';
    records.forEach((r) => {
      el('circle', {
        cx: r.x, cy: r.y, r: 0.15,
        fill: COLORS[scoreOf(r)], stroke: '#fff', 'stroke-width': 0.03,
      }, dots);
    });
  }

  return { init, drawDots };
})();
