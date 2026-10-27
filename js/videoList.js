// 今の試合に入っている動画の一覧と、削除（×）ボタンの表示だけを持つ。
const VideoList = (() => {
  const box = document.getElementById('videoList');
  const summary = document.getElementById('videoListSummary');
  const list = document.getElementById('videoListItems');
  let onDeleteVideo = null;

  // onDelete(video)：×ボタンが押されたとき（確認は呼び出し側で出す）
  function init(onDelete) {
    onDeleteVideo = onDelete;
  }

  // videos：[{ key, name }]（撮影順）
  // isLoaded(key)：今ページで選ばれているか / currentKey：再生中の動画 / hasMatch：試合を選んでいるか
  function render(videos, { isLoaded, currentKey, hasMatch }) {
    // 足す先の試合がないときは「＋ この試合に動画を追加」を出さない
    document.getElementById('addVideoLabel').hidden = !hasMatch;
    box.hidden = videos.length === 0;
    summary.textContent = 'この試合の動画（' + videos.length + '本）';
    list.innerHTML = '';
    videos.forEach((v, i) => {
      const li = document.createElement('li');
      const status = v.key === currentKey ? '再生中' : isLoaded(v.key) ? '選択中' : '未選択';
      li.innerHTML =
        '<span class="video-no">動画' + (i + 1) + '</span>' +
        '<span class="video-name"></span>' +
        '<span class="video-status"></span>' +
        '<button class="video-del" aria-label="この動画を削除">✕</button>';
      li.querySelector('.video-name').textContent = v.name;
      const st = li.querySelector('.video-status');
      st.textContent = status;
      st.classList.toggle('off', status === '未選択');
      li.querySelector('.video-del').onclick = () => onDeleteVideo(v);
      list.appendChild(li);
    });
  }

  return { init, render };
})();
