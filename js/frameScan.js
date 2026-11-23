// 動画を裏で速めに流しながら、コマを小さく縮めて「前のコマからどれだけ変わったか」を記録する。
// 音は使わない（体育館の音に左右されないように）。結果をどう使うかは受け取った側に任せる。
const FrameScan = (() => {
  const SIZE = 160;      // 縮めたときの長い辺（ピクセル）。小さくても、選手の位置が変わったのは分かる
  const PIXEL_DIFF = 20; // 明るさがこれ以上変わった点を「変わった」と数える
  const MAX_GAP = 0.25;  // 前に読んだコマからこれ以上（秒）飛んでいたら、その2つは比べない（つなぎ目と間違えないため）
  let running = null;

  // 解析中は画面が自動で消えないようにする（消えると解析が止まるため）。使えない端末では何もしない
  async function keepAwake(job) {
    try {
      if (!navigator.wakeLock || document.visibilityState !== 'visible') return;
      job.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* 使えなくても解析は続ける */ }
  }

  // url：動画のURL / rate：何倍速で流すか / onProgress(0〜1)
  // 戻り値：Promise<[{ t, v }]>（v は変わった点の割合 0〜1）。やめたときは null
  function scan(url, rate, onProgress) {
    stop();
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // 画面に置いておかないと絵を読み直さない端末があるので、見えない形で置く
    video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    const job = { cancelled: false };
    running = job;

    return new Promise((resolve, reject) => {
      let timer = null;
      const cleanup = () => {
        if (timer) clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        if (job.wakeLock) job.wakeLock.release().catch(() => {});
        if (running === job) running = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      };
      job.cancel = () => { job.cancelled = true; cleanup(); resolve(null); };

      // 別のページやアプリに切り替えると、iPhone ではページの動きが止められる。
      // 戻ってきたら、止まった位置から続きを読む（それまでの記録はそのまま）
      let lastResume = 0;
      const resumeIfStopped = () => {
        if (job.cancelled || video.ended || !video.paused || document.visibilityState !== 'visible') return;
        const now = Date.now();
        if (now - lastResume < 1000) return; // 何度も続けて頼まない
        lastResume = now;
        video.play().catch(() => {});
      };
      function onVisible() {
        // 裏に回ったら止める（コマを読めないまま進むと、離れたコマどうしを比べてしまうため）
        if (document.visibilityState !== 'visible') { video.pause(); return; }
        keepAwake(job); // 裏に回ると画面を消さない設定は解除されるので、かけ直す
        resumeIfStopped();
      }
      document.addEventListener('visibilitychange', onVisible);

      video.addEventListener('error', () => { cleanup(); reject(new Error('動画を読めませんでした')); });
      video.addEventListener('loadedmetadata', () => {
        // 動画の向きに合わせて縮める（縦長なら縦長のまま）
        const scale = SIZE / Math.max(video.videoWidth, video.videoHeight);
        const w = Math.max(1, Math.round(video.videoWidth * scale));
        const h = Math.max(1, Math.round(video.videoHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext('2d', { willReadFrequently: true });
        let prev = null;
        let prevTime = 0;
        let lastTime = -1;
        const changes = [];

        // 短い間隔で今のコマを読み、前のコマと比べる
        timer = setInterval(() => {
          if (job.cancelled) return;
          const t = video.currentTime;
          if (t !== lastTime) {
            lastTime = t;
            g.drawImage(video, 0, 0, w, h);
            const d = g.getImageData(0, 0, w, h).data;
            const gray = new Uint8Array(w * h);
            for (let i = 0; i < gray.length; i++) gray[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10;
            // 前に読んだコマから時間が飛んでいたら、比べ直しから始める
            if (prev && t - prevTime > MAX_GAP) prev = null;
            if (prev) {
              let changed = 0;
              for (let i = 0; i < gray.length; i++) if (Math.abs(gray[i] - prev[i]) > PIXEL_DIFF) changed++;
              changes.push({ t, v: changed / gray.length });
            }
            prev = gray;
            prevTime = t;
            if (video.duration) onProgress(Math.min(1, t / video.duration));
          }
          if (video.ended) { cleanup(); resolve(changes); return; }
          resumeIfStopped();
        }, 20);

        video.playbackRate = rate;
        keepAwake(job);
        video.play().catch((err) => { cleanup(); reject(err); });
      });
    });
  }

  function stop() {
    if (running) running.cancel();
  }

  return { scan, stop, isRunning: () => !!running };
})();
