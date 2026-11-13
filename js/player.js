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
  const bar = document.getElementById('videoBar');
  const seek = document.getElementById('videoSeek');
  let seeking = false; // バーを指で動かしている間は、再生位置でバーを動かさない

  // 再生位置のバーを、今の位置に合わせる
  function showSeek() {
    seek.max = video.duration || 0;
    if (!seeking) seek.value = video.currentTime;
  }

  // 全画面にする。iPhone は動画専用の全画面（標準の操作つき）、ほかはブラウザの全画面
  function fullscreen() {
    if (!hasVideo()) return;
    if (video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    if (video.requestFullscreen) video.requestFullscreen();
  }

  // 動画をブラウザ内だけで再生（URL.createObjectURL はファイルをアップロードせずに参照する仕組み）
  function load(file) {
    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(file);
    video.style.display = 'block';
    bar.hidden = false;
    placeholder.style.display = 'none';
    document.getElementById('fileName').textContent = file.name;
  }

  // 動画を外して、案内を出す（message がなければ最初の案内）
  function clear(message) {
    if (video.src) URL.revokeObjectURL(video.src);
    video.removeAttribute('src');
    video.load();
    video.style.display = 'none';
    bar.hidden = true;
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

    // 標準の操作の代わり：動画をタップで再生・停止、再生位置のバー、全画面
    video.addEventListener('click', togglePlay);
    video.addEventListener('timeupdate', showSeek);
    video.addEventListener('loadedmetadata', showSeek);
    seek.addEventListener('input', () => { seeking = true; video.currentTime = Number(seek.value); });
    seek.addEventListener('change', () => { seeking = false; });
    document.getElementById('fullscreenBtn').onclick = fullscreen;
    // ブラウザの全画面では、操作が何もないと困るので、全画面の間だけ標準の操作を出す
    document.addEventListener('fullscreenchange', () => { video.controls = document.fullscreenElement === video; });

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
    isEnded: () => video.ended,
    pause: () => video.pause(),
    play: () => video.play(),
    // 再生位置が変わったとき（再生中・移動したとき・動画を切り替えたとき）に呼ぶ関数を登録する
    onTimeChange(callback) {
      ['timeupdate', 'seeked', 'loadedmetadata'].forEach((type) => video.addEventListener(type, callback));
    },
    // 動画が画面の上に来るまでスクロールする（スマホで一覧や集計から再生したとき、動画が見えるように）
    //   なめらかに動かす指定は、環境によって動かないことがあったので、すぐ移動する
    reveal: () => video.scrollIntoView({ block: 'start' }),
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
