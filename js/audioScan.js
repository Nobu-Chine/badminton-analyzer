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

  // 速く流すと音を消す端末（iPhone の Safari など）があるので、
  // 始めてしばらく無音が続いたら、遅い速さに落として最初から読み直す
  const SILENCE_CHECK = 200; // 何回分（約2秒）の音を見て「無音」と判断するか

  // url：動画のURL / rates：試す速さ（速い順。例 [4, 2, 1]）/ onProgress(0〜1, 今の速さ)
  // 戻り値：Promise<{ samples: [{ t, e }], rate }>。どの速さでも無音なら rate は null。やめたときは null
  // ※ 画面のボタンを押した流れの中で呼ぶこと（ブラウザが音の再生を許すため）
  function scan(url, rates, onProgress) {
    let rateIndex = 0;
    const rate = rates[0];
    stop();
    const ctx = new AudioContext();
    // iPhone の Safari は、ボタンを押したその流れの中で動かし始めないと、音の処理が止まったままになる
    ctx.resume();
    const video = document.createElement('video');
    video.src = url;
    video.playsInline = true;
    video.preload = 'auto';
    // 音の行き先を差し替える（何もつながなければ、スピーカーからは鳴らない）
    const source = ctx.createMediaElementSource(video);
    video.playbackRate = rate;
    const started = video.play(); // ボタンを押した直後に再生を始める

    let samples = [];
    let sinceSwitch = 0;   // 今の速さにしてから届いた回数
    let heardSince = false; // 今の速さにしてから音があったか
    const job = { ctx, video, cancelled: false };
    running = job;

    return new Promise((resolve, reject) => {
      const finish = (result) => {
        if (job.finished) return;
        job.finished = true;
        if (running === job) running = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
        ctx.close();
        resolve(result);
      };
      job.cancel = () => { if (job.cancelled) return; job.cancelled = true; finish(null); };

      ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })))
        .then(() => {
          if (job.cancelled) return;
          const node = new AudioWorkletNode(ctx, 'high-energy');
          node.port.onmessage = (m) => {
            if (job.cancelled) return;
            samples.push({ t: video.currentTime, e: m.data });
            if (m.data > 1e-12) heardSince = true;
            sinceSwitch++;
            // 無音が続いたら、遅い速さに落として最初から（それでもだめなら、あきらめて知らせる）
            if (sinceSwitch === SILENCE_CHECK && !heardSince) {
              rateIndex++;
              if (rateIndex >= rates.length) { finish({ samples: [], rate: null }); return; }
              samples = [];
              sinceSwitch = 0;
              video.playbackRate = rates[rateIndex];
              video.currentTime = 0;
            }
            if (video.duration) onProgress(Math.min(1, video.currentTime / video.duration), rates[rateIndex]);
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
      video.addEventListener('ended', () => {
        if (job.cancelled || running !== job) return;
        finish({ samples, rate: heardSince ? rates[rateIndex] : null });
      });
      video.addEventListener('error', () => { if (!job.cancelled) { running = null; ctx.close(); reject(new Error('動画を読めませんでした')); } });
    });
  }

  function stop() {
    if (running) running.cancel();
  }

  return { scan, stop, isRunning: () => !!running };
})();
