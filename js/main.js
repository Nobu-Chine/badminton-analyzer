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
  refreshVideoList();
  Court.drawDots(records, Rules.score);
  RecordList.render(records);
  refreshStats();
}

// 集計は「この試合」か「全試合」を選べる
function refreshStats() {
  const records = StatsView.scope() === 'all' ? Matches.allRecords() : Matches.records();
  StatsView.render(Stats.summarize(records, { scoreOf: Rules.score, zoneOf: Rules.zone }));
}

// この試合の動画の一覧（再生中・選択中・未選択の表示があるので、動画が切り替わったときも描き直す）
function refreshVideoList() {
  VideoList.render(Matches.videos(), { isLoaded: Clips.has, currentKey: Clips.currentKey(), hasMatch: !!Matches.currentId() });
}

// 今の試合の動画の並びを Clips に渡す（preferKey があればその動画を出す）
function syncClips(preferKey) {
  Clips.setOrder(Matches.videoKeys(), preferKey);
}

saved(Matches.init(Rules.upgrade));

Player.init({ isBlocked: () => RecordDialog.isOpen() });

Clips.init({
  // 動画が選ばれたら、その動画の試合に切り替える（'add' のときは今の試合に足す）
  onFilesChosen(videos, mode) {
    if (mode === 'open') {
      saved(Matches.openForVideos(videos));
      syncClips(videos[0].key);
      refresh();
      return;
    }
    // 「この試合に動画を追加」：別の試合に入っている動画は足さず、理由を伝える
    const result = Matches.addVideos(videos);
    saved(result.ok);
    syncClips(result.added.length > 0 ? result.added[0].key : Clips.currentKey());
    refresh();
    if (result.skipped.length > 0) {
      alert('次の動画は別の試合に入っているので、追加しませんでした。\n\n' +
        result.skipped.map((s) => '・' + s.name + '（試合：' + s.matchName + '）').join('\n') +
        '\n\nこの試合に移したいときは、先に元の試合の「この試合の動画」から削除してください。');
    }
  },
  onChange(file) {
    refreshVideoList();
    if (file) { Player.load(file); return; }
    // この試合の動画がまだ選ばれていないときは、選び直しを案内する
    const n = Clips.total();
    Player.clear(n > 0 ? 'この試合の動画（' + n + '本）を選ぶと再生できます<br>（まとめて選べます。順番はばらばらで大丈夫）' : '');
  },
});

VideoList.init((video) => {
  // 動画を試合から外す。記録があれば件数も伝える
  const n = Matches.recordCountOfVideo(video.key);
  const msg = 'この動画を削除しますか？\n' + video.name +
    (n > 0 ? '\n\nこの動画の記録（' + n + '件）も削除されます。' : '') +
    '\n\n※ スマホやPCにある動画ファイル自体は消えません。';
  if (!confirm(msg)) return;
  saved(Matches.removeVideo(video.key));
  Clips.forget(video.key);
  syncClips(Clips.currentKey()); // 再生中の動画を消したときは、残りの動画に切り替わる
  refresh();
});

Tabs.init();

Backup.init({
  getData: () => Matches.exportData(),
  onLoad(data) {
    const result = Matches.importData(data, Rules.upgrade);
    if (!result) { alert('このファイルは読み込めません。書き出した記録のファイルを選んでください'); return; }
    saved(result.ok);
    syncClips(Clips.currentKey()); // 動画が増えたかもしれないので並びを取り直す（今の動画はそのまま）
    refresh();
    alert('読み込みました（増えた記録：' + result.added + '件）');
  },
});
StatsView.init(refreshStats);

MatchPicker.init((id) => {
  saved(Matches.select(id));
  syncClips();
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
    record.videoKey = Clips.currentKey(); // どの動画の記録か
    saved(Matches.addRecord(record));
    refresh();
  },
});

RecordList.init({
  scoreOf: Rules.score,
  setupByOf: Rules.setupBy,
  zoneOf: Rules.zone,
  videoNumberOf: (record) => Matches.videoNumber(record),
  isPlayable: (record) => (record.videoKey ? Clips.has(record.videoKey) : Player.hasVideo()),
  onSelect(record) {
    // 別の動画の記録なら、その動画に切り替える
    if (record.videoKey && !Clips.show(record.videoKey)) {
      const no = Matches.videoNumber(record);
      alert((no ? '動画' + no : 'この記録の動画') + 'がまだ選ばれていません。「動画を選ぶ」で選んでください');
      return;
    }
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

syncClips();
refresh();
