// 動画の上に重ねた canvas に、タップした四隅と、見つかった足元を描く（表示だけ）。
export function createOverlay(canvas, video) {
  const ctx = canvas.getContext('2d');

  // canvas の大きさを、動画の元のピクセルに合わせる（座標を動画と同じにするため）
  function fit() {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  // corners：タップした点 [[x, y], ...]、feet：[{ x, y, inCourt }]、labels：次にタップする場所の名前
  function draw({ corners = [], feet = [], nextLabel = null }) {
    fit();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = Math.max(4, canvas.width / 200);

    // 四隅と、それを結んだ線
    ctx.lineWidth = r / 2;
    ctx.strokeStyle = '#ffd400';
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    if (corners.length === 4) ctx.closePath();
    ctx.stroke();
    corners.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });

    // 足元：コート内の人は緑、外の人（除外した人）は灰色
    feet.forEach(({ x, y, inCourt }) => {
      ctx.fillStyle = inCourt ? '#2ee86b' : 'rgba(200,200,200,.8)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.fill();
    });

    // 次にタップする場所の案内
    if (nextLabel) {
      const size = Math.max(16, canvas.width / 30);
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, 0, canvas.width, size * 1.8);
      ctx.fillStyle = '#fff';
      ctx.fillText('コートの「' + nextLabel + '」の角をタップ', size * 0.6, size * 1.25);
    }
  }

  return { draw };
}
