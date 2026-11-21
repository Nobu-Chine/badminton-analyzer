// 各部品をつなぐだけのファイル。具体的な処理はそれぞれの部品に任せる。

function showStorageWarning() {
  document.getElementById('storageWarn').style.display = 'block';
}

// 保存に失敗したら警告を出す
function saved(ok) {
  if (!ok) showStorageWarning();
}

// 記録や試合が変わったら、試合の切り替え・コートの点・一覧・集計を描き直す
// 集計の棒で絞り込んでいるときは、コートの点と一覧はその記録だけにする
function refresh() {
  const shown = RecordFilter.apply(Matches.records());
  const playing = Playlist.current();
  MatchPicker.render(Matches.list(), Matches.currentId());
  refreshVideoList();
  Court.drawDots(shown, Rules.score);
  RecordList.render(shown, playing ? playing.id : null);
  // 集計を「全試合」で見ていても、一覧に出せるのは今の試合の記録だけ
  RecordFilter.render(shown.length, StatsView.scope() === 'all' ? '※この試合の分だけ表示' : '', Playlist.isPlaying());
  refreshStats();
  syncSide();
  syncMemo();
  syncRally();
}

// ラリーの印の表示を、今の動画・今の時間に合わせる
function syncRally() {
  const key = Clips.currentKey();
  RallyNav.render(key ? Matches.rallyStarts(key) : [], Player.currentTime(), Player.hasVideo(), Player.formatTime);
}

// 今流れている場面の記録にメモがあれば、動画の下に出す
function syncMemo() {
  const key = Clips.currentKey();
  // 動画を記録していない古い記録は、今の動画の記録として扱う
  const records = Matches.records().filter((r) => !r.videoKey || r.videoKey === key);
  SceneMemo.render(Player.hasVideo() ? records : [], Player.currentTime());
}

// 今の動画・今の時間で、自分が左右どちらにいるかをコート図に反映する（コートチェンジ）
//   force：向きが変わっていなくても描き直す
function syncSide(force = false) {
  const key = Clips.currentKey();
  const side = key ? Matches.sideAt(key, Player.currentTime(), CourtView.get().meSide) : CourtView.get().meSide;
  if (CourtView.showSide(side) || force) Court.setView(CourtView.get());
  CourtView.renderChanges(key ? Matches.sideChanges(key) : [], Player.formatTime);
}

// 記録の場面を流す（その動画に切り替えて、少し前から）。流せなければ false
function playRecord(record) {
  if (record.videoKey && !Clips.show(record.videoKey)) return false;
  if (!Player.hasVideo()) return false;
  // 落ちた瞬間ではなく、その少し前から流す（記録した時間そのものは変えない）
  Player.seekAndPlay(record.time - Settings.replayLeadSeconds);
  return true;
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
PlaybackTools.init(); // 速さ・細かいバー・1コマ送り

Clips.init({
  // 動画が選ばれたら、その動画の試合に切り替える（'add' のときは今の試合に足す）
  onFilesChosen(videos, mode) {
    Playlist.stop();
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
    // 記録の途中で別の動画に切り替えたら、途中の記録は捨てる（違う動画に保存しないため）
    const draftKey = RecordDialog.draftVideoKey();
    if (draftKey && draftKey !== Clips.currentKey()) RecordDialog.discard();
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
StatsView.init({
  onScopeChange: refresh,
  // 集計の棒を押したら、その場面だけに絞り込んで、記録一覧を見せる
  onSelect(choice) {
    Playlist.stop();
    RecordFilter.set(Stats.filterFor(choice, { zoneOf: Rules.zone }), choice.description);
    Tabs.select('list');
    refresh();
    RecordFilter.reveal();
  },
});

RecordFilter.init({
  onClear() {
    Playlist.stop();
    RecordFilter.clear();
    refresh();
  },
  // 絞り込んだ場面を順に再生（再生中にもう一度押すと止める）
  onPlay() {
    if (Playlist.isPlaying()) { Playlist.stop(); return; }
    if (!Playlist.play(RecordFilter.apply(Matches.records()))) {
      alert('この場面の動画がまだ選ばれていません。「動画を選ぶ」で選んでください');
    } else {
      Player.reveal(); // 始めたときだけ動画まで移動（途中で一覧を見ても引き戻さない）
    }
    refresh();
  },
});

Playlist.init({
  start: playRecord,
  now: Player.currentTime,
  ended: Player.isEnded,
  pause: Player.pause,
  onChange: refresh,
});

MatchPicker.init((id) => {
  Playlist.stop();
  saved(Matches.select(id));
  syncClips();
  refresh();
});

// コート図の向き（縦／横、横のときに自分を左右どちらに置くか）
const courtView = CourtView.init({
  onOrientation: (view) => Court.setView(view),
  // 「自分：左／右」を押したら、今の動画の今の時間をコートチェンジとして覚える
  onSidePressed(side) {
    const key = Clips.currentKey();
    if (key) saved(Matches.setSide(key, Player.currentTime(), side));
    else CourtView.showSide(side); // 動画がないときは、向きを変えるだけ
    syncSide(true);
  },
  onRemoveChange(index) {
    saved(Matches.removeSideChange(Clips.currentKey(), index));
    syncSide(true);
  },
});
// ラリーの印：今の時間に印を付ける／前・次のラリーの始まりへ飛ぶ／印を消す
RallyNav.init({
  onMark() {
    const key = Clips.currentKey();
    if (!key) return;
    saved(Matches.addRallyStart(key, Player.currentTime()));
    syncRally();
  },
  onJump(time) {
    Playlist.stop();
    Player.seekAndPlay(time);
  },
  onRemove(index) {
    if (!confirm('このラリーの印を消しますか？')) return;
    saved(Matches.removeRallyStart(Clips.currentKey(), index));
    syncRally();
  },
  starts: () => (Clips.currentKey() ? Matches.rallyStarts(Clips.currentKey()) : []),
  now: Player.currentTime,
});

// 再生位置が変わったら、その時間の向きに合わせる（巻き戻したときも自動で戻る）
Player.onTimeChange(() => { syncSide(); syncMemo(); syncRally(); });

Court.init((x, y) => {
  if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
  if (!Player.isPaused()) { alert('動画を一時停止してからタップしてください'); return; }
  RecordDialog.open(Player.currentTime(), x, y, { videoKey: Clips.currentKey() });
}, courtView);

RecordDialog.init({
  missingItems: Rules.missingItems,
  inactiveKeys: Rules.inactiveKeys,
  onSave(record) {
    // 直した記録（id がある）は上書きするだけ。再生はしない
    if (record.id) {
      saved(Matches.updateRecord(record));
      refresh();
      return;
    }
    // どの動画の記録か（コートをタップしたときの動画。open で入れてある）
    record.videoKey = record.videoKey || Clips.currentKey();
    saved(Matches.addRecord(record));
    refresh();
    // 記録したら、動画に戻って次を見る。次のラリーの印があればそこへ飛び、なければ続きを再生する
    Player.reveal();
    const next = RallyNav.nextStart(Matches.rallyStarts(record.videoKey), record.time);
    if (next !== null && record.videoKey === Clips.currentKey()) Player.seekAndPlay(next);
    else Player.play();
  },
  // 「動画を見直す」：入力は残したまま、動画が見える所まで動かす
  //   直している記録なら、その場面を流して確認できるようにする
  onReview(draft) {
    if (draft.id) { Playlist.stop(); playRecord(draft); }
    Player.reveal();
  },
});

RecordList.init({
  scoreOf: Rules.score,
  setupByOf: Rules.setupBy,
  zoneOf: Rules.zone,
  videoNumberOf: (record) => Matches.videoNumber(record),
  isPlayable: (record) => (record.videoKey ? Clips.has(record.videoKey) : Player.hasVideo()),
  onSelect(record) {
    Playlist.stop(); // 1件を選んだら、順に再生はやめる
    if (playRecord(record)) { Player.reveal(); return; }
    // 流せなかった理由を伝える（その動画が選ばれていない／動画がない）
    const no = Matches.videoNumber(record);
    if (record.videoKey) alert((no ? '動画' + no : 'この記録の動画') + 'がまだ選ばれていません。「動画を選ぶ」で選んでください');
    else alert('先に動画を選んでください');
  },
  onEdit(record) {
    // 見直し中の記録があるときは、黙って消さずに確かめる
    if (RecordDialog.hasDraft() && !confirm('入力途中の記録をやめて、この記録を直しますか？')) return;
    Playlist.stop();
    Player.pause();
    RecordDialog.edit(record);
  },
  onDelete(record) {
    if (!confirm('この記録を削除しますか？')) return;
    saved(Matches.removeRecord(record.id));
    refresh();
  },
});

// 「サンプルで試す」：サンプルの試合に記録とラリーの印がまだなければ入れる（中身は sampleData.js）
Sample.init({
  onLoaded() {
    const key = Clips.currentKey();
    if (!key) return;
    let ok = true;
    if (Matches.records().length === 0) {
      SampleData.records.forEach((r) => {
        ok = Matches.addRecord(Object.assign({ course: null, winType: null, missType: null, cause: null,
          setupShot: null, memo: null }, r, { videoKey: key }));
      });
    }
    SampleData.rallies.forEach((t) => { ok = Matches.addRallyStart(key, t); });
    saved(ok);
    refresh();
  },
});

syncClips();
refresh();
