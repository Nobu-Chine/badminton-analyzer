// コート図：タップ位置の変換と、記録の点の表示
const Court = (() => {
  const svg = document.getElementById('court');
  const dots = document.getElementById('dots');

  // onTap(x, y)：タップされた位置をコート図の座標（メートル）で受け取る
  function init(onTap) {
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      onTap(p.x, p.y);
    });
  }

  function drawDots(records) {
    dots.innerHTML = '';
    records.forEach((r) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', r.x);
      c.setAttribute('cy', r.y);
      c.setAttribute('r', 0.15);
      c.setAttribute('fill', r.result === '得点' ? '#2a7de1' : '#d9443b');
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', 0.03);
      dots.appendChild(c);
    });
  }

  return { init, drawDots };
})();
