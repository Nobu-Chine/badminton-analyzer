// 動画の音を裏で読んで、高い音の強さを時間ごとに記録する（スピーカーからは鳴らさない）。
// 動画は速めに流して、時間を短くする。結果をどう使うかは受け取った側に任せる。
const AudioScan = (() => {
  // 音の処理（別の流れで動くので、画面が忙しくても取りこぼさない）
  //   高い音だけを強める（隣の値との差）→ 512 個ごとの強さを送る
  const WORKLET = `class HighEnergy extends AudioWorkletProcessor {
    constructor() { super(); this.prev = 0; this.sum = 0; this.n = 0; }
    process(inputs) {
      const ch = inputs[0][0];
      if (!ch) return true;
      for (let i = 0; i < ch.length; i++) { const d = ch[i] - this.prev; this.prev = ch[i]; this.sum += d * d; }
      this.n += ch.length;
      if (this.n >= 512) { this.port.postMessage(this.sum / this.n); this.sum = 0; this.n = 0; }
      return true;
    }
  }
  registerProcessor('high-energy', HighEnergy);`;

  let running = null; // 解析中のもの（やめるときに使う）

  // url：動画のURL / rate：何倍速で流すか / onProgress(0〜1)
  // 戻り値：Promise<[{ t, e }]>。やめたときは null
  // ※ 画面のボタンを押した流れの中で呼ぶこと（ブラウザが音の再生を許すため）
  function scan(url, rate, onProgress) {
    stop();
    const ctx = new AudioContext();
    const video = document.createElement('video');
    video.src = url;
    video.playsInline = true;
    video.preload = 'auto';
    // 音の行き先を差し替える（何もつながなければ、スピーカーからは鳴らない）
    const source = ctx.createMediaElementSource(video);
    video.playbackRate = rate;
    const started = video.play(); // ボタンを押した直後に再生を始める

    const samples = [];
    const job = { ctx, video, cancelled: false };
    running = job;

    return new Promise((resolve, reject) => {
      const finish = (result) => {
        if (running === job) running = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
        ctx.close();
        resolve(result);
      };
      job.cancel = () => { job.cancelled = true; finish(null); };

      ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })))
        .then(() => {
          if (job.cancelled) return;
          const node = new AudioWorkletNode(ctx, 'high-energy');
          node.port.onmessage = (m) => {
            samples.push({ t: video.currentTime, e: m.data });
            if (video.duration) onProgress(Math.min(1, video.currentTime / video.duration));
          };
          source.connect(node);
          // 処理を動かし続けるために出口までつなぐ（音量0なので聞こえない）
          const mute = ctx.createGain();
          mute.gain.value = 0;
          node.connect(mute);
          mute.connect(ctx.destination);
          return ctx.resume();
        })
        .then(() => started)
        .catch((err) => { if (running === job) { running = null; ctx.close(); } reject(err); });

      video.playbackRate = rate;
      video.addEventListener('ended', () => { if (!job.cancelled) finish(samples); });
      video.addEventListener('error', () => { if (!job.cancelled) { running = null; ctx.close(); reject(new Error('動画を読めませんでした')); } });
    });
  }

  function stop() {
    if (running) running.cancel();
  }

  return { scan, stop, isRunning: () => !!running };
})();
