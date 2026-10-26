// 各部品をつなぐだけのファイル。具体的な処理はそれぞれの部品に任せる。

function showStorageWarning() {
  document.getElementById('storageWarn').style.display = 'block';
}

// 保存に失敗したら警告を出す
function saved(ok) {
  if (!ok) showStorageWarning();
}

// 記録や試合が変わったら、試合の切り替え・コートの点・一覧・集計を描き直す
function refresh() {
  const records = Matches.records();
  MatchPicker.render(Matches.list(), Matches.currentId());
  Court.drawDots(records, Rules.score);
  RecordList.render(records);
  refreshStats();
}

// 集計は「この試合」か「全試合」を選べる
function refreshStats() {
  const records = StatsView.scope() === 'all' ? Matches.allRecords() : Matches.records();
  StatsView.render(Stats.summarize(records, { scoreOf: Rules.score, zoneOf: Rules.zone }));
}

saved(Matches.init(Rules.upgrade));

Player.init({
  isBlocked: () => RecordDialog.isOpen(),
  onVideoChosen(file) {
    saved(Matches.openForVideo(file));
    refresh();
  },
});

Tabs.init();

Backup.init({
  getData: () => Matches.exportData(),
  onLoad(data) {
    const result = Matches.importData(data, Rules.upgrade);
    if (!result) { alert('このファイルは読み込めません。書き出した記録のファイルを選んでください'); return; }
    saved(result.ok);
    refresh();
    alert('読み込みました（増えた記録：' + result.added + '件）');
  },
});
StatsView.init(refreshStats);

MatchPicker.init((id) => {
  saved(Matches.select(id));
  refresh();
});

Court.init((x, y) => {
  if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
  if (!Player.isPaused()) { alert('動画を一時停止してからタップしてください'); return; }
  RecordDialog.open(Player.currentTime(), x, y);
});

RecordDialog.init({
  missingItems: Rules.missingItems,
  inactiveKeys: Rules.inactiveKeys,
  onSave(record) {
    saved(Matches.addRecord(record));
    refresh();
  },
});

RecordList.init({
  scoreOf: Rules.score,
  setupByOf: Rules.setupBy,
  zoneOf: Rules.zone,
  onSelect(record) {
    if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
    // 落ちた瞬間ではなく、その少し前から流す（記録した時間そのものは変えない）
    Player.seekAndPlay(record.time - Settings.replayLeadSeconds);
  },
  onDelete(record) {
    if (!confirm('この記録を削除しますか？')) return;
    saved(Matches.removeRecord(record.id));
    refresh();
  },
});

refresh();
