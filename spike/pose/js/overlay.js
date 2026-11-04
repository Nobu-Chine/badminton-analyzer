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
  // box：解析する範囲 { x, y, w, h }（点線で囲む）
  // loupe：指を置いている所 [x, y]（拡大鏡を出す）。指を置いていなければ null
  function draw({ points = [], lines = [], box = null, feet = [], nextLabel = null, loupe = null }) {
    fit();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = Math.max(4, canvas.width / 200);

    // 解析する範囲（この外の人は見ない）
    if (box) {
      ctx.save();
      ctx.setLineDash([r * 2, r * 1.5]);
      ctx.lineWidth = Math.max(2, r / 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, .7)';
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.restore();
    }

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
    const barHeight = Math.max(16, canvas.width / 30) * 1.8;
    if (nextLabel) {
      const size = barHeight / 1.8;
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, 0, canvas.width, barHeight);
      ctx.fillStyle = '#fff';
      ctx.fillText('コートの「' + nextLabel + '」をタップ（指を置いたまま動かして合わせる）', size * 0.6, size * 1.25);
    }

    if (loupe) drawLoupe(loupe, barHeight, r);
  }

  // 拡大鏡：指を置いている所のまわりを3倍に広げて、指で隠れない側の上の隅に出す
  function drawLoupe([px, py], top, r) {
    const ZOOM = 3;
    const R = Math.min(canvas.width, canvas.height) * 0.22;   // 拡大鏡の半径
    const margin = R * 0.15;
    const cx = px < canvas.width / 2 ? canvas.width - R - margin : R + margin;
    const cy = top + R + margin;
    const src = R / ZOOM;                                      // 動画から切り出す範囲の半径

    // 指を置いている所に、小さい十字を出す
    ctx.strokeStyle = '#ff2bd6';
    ctx.lineWidth = Math.max(2, r / 3);
    ctx.beginPath();
    ctx.moveTo(px - r * 2, py); ctx.lineTo(px + r * 2, py);
    ctx.moveTo(px, py - r * 2); ctx.lineTo(px, py + r * 2);
    ctx.stroke();

    // 丸の中に、動画と、その上に描いた線・点を広げて描く
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.drawImage(video, px - src, py - src, src * 2, src * 2, cx - R, cy - R, R * 2, R * 2);
    ctx.drawImage(canvas, px - src, py - src, src * 2, src * 2, cx - R, cy - R, R * 2, R * 2);
    // 真ん中の十字（ここに点が置かれる）
    ctx.strokeStyle = '#ff2bd6';
    ctx.lineWidth = Math.max(2, r / 2.5);
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.25, cy); ctx.lineTo(cx + R * 0.25, cy);
    ctx.moveTo(cx, cy - R * 0.25); ctx.lineTo(cx, cy + R * 0.25);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, r / 2);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  }

  return { draw };
}
