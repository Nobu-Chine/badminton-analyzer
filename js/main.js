// 各部品をつなぐだけのファイル。具体的な処理はそれぞれの部品に任せる。

function showStorageWarning() {
  document.getElementById('storageWarn').style.display = 'block';
}

// 記録が変わったら、コートの点と一覧を描き直す
function refresh() {
  const records = RecordStore.all();
  Court.drawDots(records, Rules.score);
  RecordList.render(records);
}

if (!RecordStore.init(Rules.upgrade)) showStorageWarning();

Player.init({ isBlocked: () => RecordDialog.isOpen() });

Court.init((x, y) => {
  if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
  if (!Player.isPaused()) { alert('動画を一時停止してからタップしてください'); return; }
  RecordDialog.open(Player.currentTime(), x, y);
});

RecordDialog.init({
  missingItems: Rules.missingItems,
  needsMissType: Rules.needsMissType,
  onSave(record) {
    if (!RecordStore.add(record)) showStorageWarning();
    refresh();
  },
});

RecordList.init({
  scoreOf: Rules.score,
  onSelect(record) {
    if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
    Player.seekAndPlay(record.time);
  },
  onDelete(record) {
    if (!confirm('この記録を削除しますか？')) return;
    if (!RecordStore.remove(record.id)) showStorageWarning();
    refresh();
  },
});

refresh();
