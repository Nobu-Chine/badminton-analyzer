// 動画の読み込みと再生操作
const Player = (() => {
  const video = document.getElementById('video');
  const playBtn = document.getElementById('playBtn');
  const nowTime = document.getElementById('nowTime');

  // 秒数を「分:秒」に変換
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function hasVideo() {
    return !!video.src;
  }

  function togglePlay() {
    if (!hasVideo()) return;
    video.paused ? video.play() : video.pause();
  }

  function skip(sec) {
    if (!hasVideo()) return;
    video.currentTime = Math.max(0, video.currentTime + sec);
  }

  function showTime() {
    nowTime.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration || 0);
  }

  // isBlocked：true を返す間はスペースキーを無効にする（入力画面を開いているときなど）
  // onVideoChosen(file)：動画ファイルが選ばれたとき
  function init({ isBlocked, onVideoChosen }) {
    // 選んだ動画をブラウザ内だけで再生（URL.createObjectURL はファイルをアップロードせずに参照する仕組み）
    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (video.src) URL.revokeObjectURL(video.src);
      video.src = URL.createObjectURL(file);
      video.style.display = 'block';
      document.getElementById('placeholder').style.display = 'none';
      document.getElementById('fileName').textContent = file.name;
      onVideoChosen(file);
    });

    playBtn.onclick = togglePlay;
    document.getElementById('backBtn').onclick = () => skip(-5);
    document.getElementById('fwdBtn').onclick = () => skip(5);

    // ボタンの表示と時間表示を動画の状態に合わせる
    video.addEventListener('play', () => { playBtn.textContent = '⏸ 停止'; });
    video.addEventListener('pause', () => { playBtn.textContent = '▶ 再生'; });
    video.addEventListener('timeupdate', showTime);
    video.addEventListener('loadedmetadata', showTime);

    // PC：スペースキーで再生・停止
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || isBlocked()) return;
      e.preventDefault();
      togglePlay();
    });
  }

  return {
    init,
    formatTime,
    hasVideo,
    isPaused: () => video.paused,
    currentTime: () => video.currentTime,
    seekAndPlay(time) {
      video.currentTime = time;
      video.play();
    },
  };
})();
