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
  syncGuide();
}

// 手順の案内を、今の動画で済んだことに合わせる（サンプルには専用の使い方があるので出さない）
function syncGuide() {
  const key = Player.hasVideo() ? Clips.currentKey() : null;
  const isSample = !!key && key.startsWith(SampleData.fileName + '|');
  // サンプルから自分の動画に切り替えたら、サンプルの使い方はしまう（案内が2つ並ばないように）
  if (key && !isSample) Sample.hideGuide();
  StepGuide.render({
    videoKey: key,
    // 検出中の画面を出している間は、案内を重ねない（閉じたら続きを出す）
    hidden: isSample || FrameScan.isRunning() || ScanView.isOpen(),
    rallyCount: key ? Matches.rallyStarts(key).length : 0,
    sideCount: key ? Matches.sideChanges(key).length : 0,
    recordCount: key ? Matches.records().filter((r) => r.videoKey === key).length : 0,
    setup: Object.assign({ rallyCount: key ? Matches.rallyStarts(key).length : 0 }, CourtView.describe()),
  });
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

// 今の動画・今の時間で、自分がどちら側にいるかをコート図に反映する（コートチェンジ）
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
    if (file) { Player.load(file); syncGuide(); return; }
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

// コート図の向き（縦／横、自分をどちら側に置くか）
const courtView = CourtView.init({
  onOrientation: (view) => Court.setView(view),
  onSidePressed: setMeSide,
  onRemoveChange(index) {
    saved(Matches.removeSideChange(Clips.currentKey(), index));
    syncSide(true);
    syncGuide();
  },
});

// 「自分：上／下（横なら左／右）」を押したら、今の動画の今の時間をコートチェンジとして覚える
function setMeSide(side) {
  const key = Clips.currentKey();
  if (key) saved(Matches.setSide(key, Player.currentTime(), side));
  else CourtView.showSide(side); // 動画がないときは、向きを変えるだけ
  syncSide(true);
  syncGuide();
}
// ラリーの印：今の時間に印を付ける／前・次のラリーの始まりへ飛ぶ／印を消す
RallyNav.init({
  onMark() {
    const key = Clips.currentKey();
    if (!key) return;
    saved(Matches.addRallyStart(key, Player.currentTime()));
    syncRally();
    syncGuide();
  },
  onJump(time) {
    Playlist.stop();
    Player.seekAndPlay(time);
  },
  onRemove(index) {
    if (!confirm('このラリーの印を消しますか？')) return;
    saved(Matches.removeRallyStart(Clips.currentKey(), index));
    syncRally();
    syncGuide();
  },
  onCutScan: cutScan,
  onCutScanStop: stopScan,
  starts: () => (Clips.currentKey() ? Matches.rallyStarts(Clips.currentKey()) : []),
  now: Player.currentTime,
});

// 検出をやめる（手前の画面の［やめる］と、ラリーの印の所の「やめる」）
function stopScan() {
  FrameScan.stop();
}

// 検出中の画面：［やめる］で止める。結果を見て閉じたら、手順の案内の続きを出す
ScanView.init({ onStop: stopScan, closed: syncGuide });

// つなぎ目で区切る：切り取ってつないだ動画のつなぎ目を探し、各ラリーの始まりに印を付ける
//   「つなぎ目で区切る」のほか、手順の案内の「はい → 自動で区切る」からも使う
function cutScan() {
  const key = Clips.currentKey();
  const url = Player.sourceUrl();
  if (!key || !url) return;
  const opt = Settings.cutDetect;
  // 検出中は手前の画面に出す（ほかのアプリに切り替えないよう伝える）
  const minutes = Math.max(1, Math.round(Player.duration() / opt.scanRate / 60));
  const progress = (p) => ScanView.progress(p, 'ほかのアプリに切り替えず、この画面のまま待ってください（' + minutes + '分ほど）');
  // 結果は手前の画面と、ラリーの印の所の両方に出す（あとから見返せるように）
  const finish = (heading, text) => { ScanView.done(heading, text); RallyNav.showScan(text, false); };
  RallyNav.showScan('', true);
  progress(0);
  FrameScan.scan(url, opt.scanRate, progress).then((changes) => {
    if (!changes) { RallyNav.showScan('', false); ScanView.hide(); return; } // やめた
    const cuts = CutDetect.findCuts(changes, opt);
    if (cuts.length === 0) {
      finish('ラリーが見つかりませんでした', 'ラリーの場面だけをつないだ動画ではないかもしれません。ラリーの始まりで「＋ ラリー開始」を押すと、自分で印を付けられます');
      return;
    }
    // 最初のラリーは動画の始まりから。あとはつなぎ目ごとに1本
    const starts = [0].concat(cuts);
    let ok = true;
    // すでに印があれば、置き換えるか聞く（何度も押したとき、印が二重にならないように）
    const existing = Matches.rallyStarts(key).length;
    if (existing > 0 && confirm('今ある印（' + existing + '個）を消して、つなぎ目の印（' + starts.length +
      '個）に置き換えますか？\n\nキャンセルすると、今の印は残して、足りない所にだけ足します。')) {
      ok = Matches.clearRallyStarts(key);
    }
    const before = Matches.rallyStarts(key).length;
    starts.forEach((t) => { ok = Matches.addRallyStart(key, t); });
    saved(ok);
    const added = Matches.rallyStarts(key).length - before;
    finish(starts.length + '本のラリーが見つかりました', added +
      '個の印を付けました。違う所があれば「印の一覧」の「削除」で消せます');
    syncRally();
  }).catch((err) => {
    finish('ラリーを探せませんでした', err.message);
  });
}

// 再生位置が変わったら、その時間の向きに合わせる（巻き戻したときも自動で戻る）
Player.onTimeChange(() => { syncSide(); syncMemo(); syncRally(); });

Court.init((x, y) => {
  if (!Player.hasVideo()) { alert('先に動画を選んでください'); return; }
  // 再生中にタップしたら、その場で止めて記録する（「止めてから」と覚えておかなくていいように）
  if (!Player.isPaused()) Player.pause();
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
    //   ラリーの印を隠しているときは、見えない印へ飛ばない（続きを再生する）
    Player.reveal();
    const next = Settings.showRallyTools ? RallyNav.nextStart(Matches.rallyStarts(record.videoKey), record.time) : null;
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

// 手順の案内のボタン（文と並びは stepGuideData.js）
StepGuide.init((button) => {
  if (button.action === 'chooseVideo') document.getElementById('fileInput').click();
  if (button.action === 'sample') document.getElementById('sampleBtn').click();
  if (button.action === 'autoRally') cutScan();
  if (button.action === 'orientation') CourtView.setOrientation(button.orientation);
  if (button.action === 'side') {
    CourtView.setOrientation(button.orientation);
    setMeSide(button.side);
  }
  if (button.action === 'refresh') syncGuide();
});

// 「サンプルで試す」：サンプルの試合に記録とラリーの印がまだなければ入れる（中身は sampleData.js）
Sample.init({
  onLoaded() {
    const key = Clips.currentKey();
    if (!key) return;
    let ok = true;
    // 前に試した記録や印が残っていれば、消して最初から始めるか聞く（サンプルの動画の分だけ消す）
    const tried = Matches.records().some((r) => r.videoKey === key) || Matches.rallyStarts(key).length > 0;
    if (tried && confirm('前に試した記録が残っています。消して最初から始めますか？')) {
      ok = Matches.clearVideoData(key);
    }
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
