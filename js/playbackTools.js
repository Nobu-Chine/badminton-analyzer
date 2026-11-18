// 細かく確認するための再生操作：速さの切り替え、今の位置の前後だけを動かすバー、1コマ送り。
// 数字（速さの選択肢・バーの幅・1コマの秒数）は settings.js、動画への命令は Player に任せる。
const PlaybackTools = (() => {
  const rateRow = document.getElementById('rateRow');
  const fine = document.getElementById('fineSeek');
  const note = document.getElementById('fineNote');
  const range = Settings.fineSeekSeconds;
  let center = 0;        // 細かいバーの真ん中にあたる動画の時間
  let dragging = false;  // 細かいバーを動かしている間

  // 秒を「分:秒.1桁」で（コマ単位の確認なので、小数まで出す）
  function preciseTime(sec) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4, '0');
    return m + ':' + s;
  }

  function showNote() {
    const offset = Number(fine.value);
    note.textContent = dragging
      ? preciseTime(center + offset) + '（' + (offset >= 0 ? '+' : '') + offset.toFixed(1) + '秒）'
      : '真ん中が今の位置・左右に動かすと前後' + range + '秒だけ細かく動きます';
  }

  function renderRates(current) {
    rateRow.querySelectorAll('button').forEach((b) => b.remove());
    Settings.playbackRates.forEach((rate) => {
      const btn = document.createElement('button');
      btn.textContent = rate + '倍';
      if (rate === current) btn.className = 'selected';
      btn.onclick = () => { Player.setRate(rate); renderRates(rate); };
      rateRow.appendChild(btn);
    });
  }

  // 1コマ進む・戻る（止めてから動かす）
  function step(direction) {
    if (!Player.hasVideo()) return;
    Player.pause();
    Player.seekTo(Player.currentTime() + direction * Settings.frameSeconds);
  }

  function init() {
    renderRates(Settings.playbackRates[0]);

    fine.min = -range;
    fine.max = range;
    fine.step = Settings.frameSeconds;
    fine.value = 0;
    // 動かしている間：真ん中の時間を基準に、前後だけを動かす
    fine.addEventListener('input', () => {
      if (!Player.hasVideo()) { fine.value = 0; return; }
      if (!dragging) { dragging = true; Player.pause(); }
      Player.seekTo(center + Number(fine.value));
      showNote();
    });
    // 指を離したら、そこを新しい真ん中にしてバーを中央に戻す（続けて細かく動かせる）
    fine.addEventListener('change', () => {
      dragging = false;
      center = Player.currentTime();
      fine.value = 0;
      showNote();
    });
    // 再生や他の操作で位置が変わったら、真ん中をそこに合わせる
    Player.onTimeChange(() => { if (!dragging) center = Player.currentTime(); });

    document.getElementById('framePrevBtn').onclick = () => step(-1);
    document.getElementById('frameNextBtn').onclick = () => step(1);
    showNote();
  }

  return { init };
})();
