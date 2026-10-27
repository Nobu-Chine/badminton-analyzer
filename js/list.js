// 記録一覧の表示
const RecordList = (() => {
  const list = document.getElementById('records');
  let handlers = null;

  // onSelect(record)：記録を押したとき / onDelete(record)：✕を押したとき
  // scoreOf(record)：'得点' か '失点' を返す関数
  // setupByOf(record)：甘かった前の球を打った人（'自分' か '相手'）を返す関数
  // zoneOf(record)：落ちた場所（'ネット前' / '中盤' / 'コート奥'、コート外は null）を返す関数
  // videoNumberOf(record)：試合の何本目の動画か（動画が1本の試合では null）
  // isPlayable(record)：その記録の動画が今読み込まれているか
  function init({ onSelect, onDelete, scoreOf, setupByOf, zoneOf, videoNumberOf, isPlayable }) {
    handlers = { onSelect, onDelete, scoreOf, setupByOf, zoneOf, videoNumberOf, isPlayable };
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
      const no = handlers.videoNumberOf(r);
      // 動画が選ばれていない記録は薄く表示する
      li.classList.toggle('no-video', !handlers.isPlayable(r));
      li.innerHTML =
        '<span class="time">' + (no ? '<span class="clip-no">動画' + no + '</span>' : '') +
          Player.formatTime(r.time) + '</span>' +
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
