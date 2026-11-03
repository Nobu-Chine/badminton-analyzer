// 動画の上に重ねた canvas に、タップした点・コートの線・見つかった足元を描く（表示だけ）。
export function createOverlay(canvas, video) {
  const ctx = canvas.getContext('2d');

  // canvas の大きさを、動画の元のピクセルに合わせる（座標を動画と同じにするため）
  function fit() {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  // points：タップした点 [[x, y], ...]
  // lines：設定から求めたコートの線 [[[x1, y1], [x2, y2]], ...]（動画のピクセル）
  // feet：[{ x, y, inCourt }]、nextLabel：次にタップする場所の名前
  function draw({ points = [], lines = [], feet = [], nextLabel = null }) {
    fit();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = Math.max(4, canvas.width / 200);

    // コートの線（実際の線と重なっていれば、設定が合っている）
    ctx.lineWidth = Math.max(2, r / 2.5);
    ctx.strokeStyle = 'rgba(255, 212, 0, .85)';
    lines.forEach(([[x1, y1], [x2, y2]]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    // タップした点（番号付き）
    ctx.font = 'bold ' + r * 2.4 + 'px sans-serif';
    points.forEach(([x, y], i) => {
      ctx.fillStyle = '#ffd400';
      ctx.beginPath(); ctx.arc(x, y, r * 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillText(String(i + 1), x + r * 1.6, y - r * 1.2);
    });

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
      ctx.fillText('コートの「' + nextLabel + '」をタップ', size * 0.6, size * 1.25);
    }
  }

  return { draw };
}
