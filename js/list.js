// 記録一覧の表示
const RecordList = (() => {
  const list = document.getElementById('records');
  let handlers = null;

  // onSelect(record)：記録を押したとき / onDelete(record)：✕を押したとき
  // scoreOf(record)：'得点' か '失点' を返す関数
  // setupByOf(record)：甘かった前の球を打った人（'自分' か '相手'）を返す関数
  // zoneOf(record)：落ちた場所（'ネット前' / '中盤' / 'コート奥'、コート外は null）を返す関数
  function init({ onSelect, onDelete, scoreOf, setupByOf, zoneOf }) {
    handlers = { onSelect, onDelete, scoreOf, setupByOf, zoneOf };
  }

  // 例：「自分 クリア（ストレート） バックアウト」
  //     「相手 ドロップ 決まった（ネット前・取れなかった）」
  //     「相手 プッシュ 決まった（ネット前） ← 自分のピンが甘い」
  function describe(r) {
    let text = r.player + ' ' + r.shot;
    if (r.course) text += '（' + r.course + '）';
    if (r.outcome === 'ミス') {
      text += ' ' + r.missType;
    } else {
      const detail = [handlers.zoneOf(r), r.winType].filter(Boolean);
      text += ' 決まった' + (detail.length ? '（' + detail.join('・') + '）' : '');
    }
    if (r.setupShot) text += ' ← ' + handlers.setupByOf(r) + 'の' + r.setupShot + 'が甘い';
    return text;
  }

  function render(records) {
    list.innerHTML = '';
    if (records.length === 0) {
      list.innerHTML = '<li class="empty">まだ記録はありません</li>';
      return;
    }
    records.forEach((r) => {
      const li = document.createElement('li');
      const score = handlers.scoreOf(r);
      li.innerHTML =
        '<span class="time">' + Player.formatTime(r.time) + '</span>' +
        '<span class="tag ' + (score === '得点' ? 'point' : 'miss') + '">' + score + '</span>' +
        '<span class="rec-text"></span>' +
        '<button class="del-btn" title="削除">✕</button>';
      li.querySelector('.rec-text').textContent = describe(r);

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
