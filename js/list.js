// 記録一覧の表示
const RecordList = (() => {
  const list = document.getElementById('records');
  let handlers = null;

  // onSelect(record)：記録を押したとき / onDelete(record)：✕を押したとき
  function init({ onSelect, onDelete }) {
    handlers = { onSelect, onDelete };
  }

  function render(records) {
    list.innerHTML = '';
    if (records.length === 0) {
      list.innerHTML = '<li class="empty">まだ記録はありません</li>';
      return;
    }
    records.forEach((r) => {
      const li = document.createElement('li');
      const isMiss = r.result === 'ミス';
      li.innerHTML =
        '<span class="time">' + Player.formatTime(r.time) + '</span>' +
        '<span class="tag ' + (isMiss ? 'miss' : 'point') + '">' + r.result + '</span>' +
        '<span class="rec-text">' + r.shot + (isMiss ? '（' + r.missType + '）' : '') + '</span>' +
        '<button class="del-btn" title="削除">✕</button>';

      li.onclick = () => handlers.onSelect(r);
      // 削除（一覧の移動処理が動かないように止める）
      li.querySelector('.del-btn').onclick = (e) => {
        e.stopPropagation();
        handlers.onDelete(r);
      };
      list.appendChild(li);
    });
  }

  return { init, render };
})();
