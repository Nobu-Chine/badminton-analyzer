// 代わりの点を選ぶための、小さいコート図（表示とタップだけ）。
// 動画と同じ向き（横長：左右がバックライン、上が奥のサイドライン）で描く。
import { courtGeometry, nearestPoint } from './courtPoints.js';

const NS = 'http://www.w3.org/2000/svg';

export function createPointPicker(svg, onPick) {
  const g = courtGeometry();
  const M = 0.6; // 図の外側の余白（m）
  // 図の横＝コートの y、図の縦＝コートの x
  svg.setAttribute('viewBox', [g.bounds.minY - M, g.bounds.minX - M,
    g.bounds.maxY - g.bounds.minY + M * 2, g.bounds.maxX - g.bounds.minX + M * 2].join(' '));
  let used = [];
  let chosen = null;

  function el(tag, attrs, parent = svg) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent.appendChild(e);
    return e;
  }

  function draw() {
    svg.innerHTML = '';
    el('rect', { x: g.bounds.minY - M, y: g.bounds.minX - M, width: 99, height: 99, fill: '#e9eef0' });
    el('rect', { x: g.bounds.minY, y: g.bounds.minX, width: g.bounds.maxY - g.bounds.minY,
      height: g.bounds.maxX - g.bounds.minX, fill: '#2e8b57' });
    g.segments.forEach(([[x1, y1], [x2, y2]]) =>
      el('line', { x1: y1, y1: x1, x2: y2, y2: x2, stroke: '#fff', 'stroke-width': 0.05 }));
    el('line', { x1: 0, y1: g.bounds.minX - 0.3, x2: 0, y2: g.bounds.maxX + 0.3, stroke: '#333', 'stroke-width': 0.1 }); // ネット
    // 交点：使用済みは灰色、選んだ点は黄色
    const same = (a, b) => a && b && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    g.points.forEach((p) => {
      const isUsed = used.some((u) => same(u, p));
      el('circle', { cx: p[1], cy: p[0], r: same(chosen, p) ? 0.28 : 0.16,
        fill: same(chosen, p) ? '#ffd400' : isUsed ? '#999' : '#fff', stroke: '#1f3', 'stroke-width': isUsed ? 0 : 0.03 });
    });
  }

  svg.addEventListener('click', (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    chosen = nearestPoint([p.y, p.x], used); // 図の縦横をコートの x, y に戻す
    draw();
    onPick(chosen);
  });

  return {
    // usedPoints：すでに使った点（選べないようにする）
    // svg には hidden の切り替え（svg.hidden = …）が効かないので、属性を直接付け外しする
    show(usedPoints) { used = usedPoints; chosen = null; svg.removeAttribute('hidden'); draw(); },
    hide() { svg.setAttribute('hidden', ''); },
  };
}
