// 記録の絞り込み：今の条件を持ち、記録一覧の上に「絞り込み中」の帯を出す。
// どの記録が当てはまるかの判定は、受け取った関数（Stats.filterFor で作ったもの）に任せる。
const RecordFilter = (() => {
  const bar = document.getElementById('filterBar');
  const text = document.getElementById('filterText');
  const playBtn = document.getElementById('playAllBtn');
  let current = null; // { matches(record), description }

  // onClear()：「✕ 解除」が押されたとき / onPlay()：「▶ 順に再生」が押されたとき
  function init({ onClear, onPlay }) {
    document.getElementById('clearFilterBtn').onclick = onClear;
    playBtn.onclick = onPlay;
  }

  return {
    init,
    // matches(record)：当てはまるか / description：帯に出す説明
    set(matches, description) { current = { matches, description }; },
    clear() { current = null; },
    isActive: () => !!current,
    // 絞り込み中なら当てはまる記録だけ、そうでなければ全部を返す
    apply(records) { return current ? records.filter(current.matches) : records; },

    // 帯の表示。count：当てはまる件数 / note：補足（なければ空）/ playing：順に再生中か
    render(count, note, playing) {
      bar.hidden = !current;
      if (!current) return;
      text.textContent = '絞り込み中：' + current.description + '（' + count + '件）' + (note ? ' ' + note : '');
      playBtn.textContent = playing ? '⏹ 止める' : '▶ 順に再生';
      playBtn.disabled = count === 0;
    },
  };
})();
