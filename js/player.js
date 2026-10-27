// 動画の再生と再生操作（どの動画を流すかは Clips から受け取る）
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
    return video.hasAttribute('src');
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

  const placeholder = document.getElementById('placeholder');
  const defaultMessage = placeholder.innerHTML;

  // 動画をブラウザ内だけで再生（URL.createObjectURL はファイルをアップロードせずに参照する仕組み）
  function load(file) {
    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(file);
    video.style.display = 'block';
    placeholder.style.display = 'none';
    document.getElementById('fileName').textContent = file.name;
  }

  // 動画を外して、案内を出す（message がなければ最初の案内）
  function clear(message) {
    if (video.src) URL.revokeObjectURL(video.src);
    video.removeAttribute('src');
    video.load();
    video.style.display = 'none';
    placeholder.innerHTML = message || defaultMessage;
    placeholder.style.display = 'block';
    document.getElementById('fileName').textContent = '';
    showTime();
  }

  // isBlocked：true を返す間はスペースキーを無効にする（入力画面を開いているときなど）
  function init({ isBlocked }) {
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
    load,
    clear,
    formatTime,
    hasVideo,
    isPaused: () => video.paused,
    currentTime: () => video.currentTime,
    seekAndPlay(time) {
      const go = () => {
        video.currentTime = Math.max(0, time);
        video.play();
      };
      // 動画を切り替えた直後は、長さなどの情報が読めてから移動する
      if (video.readyState >= 1) go();
      else video.addEventListener('loadedmetadata', go, { once: true });
    },
  };
})();
