// 記録を順に再生する：1件ごとに「記録の少し前」から「少し後」まで流して、次の記録へ進む。
// 実際に動画を切り替えて流す処理は、受け取った関数に任せる。
const Playlist = (() => {
  const CHECK_MS = 200; // 何ミリ秒ごとに「次へ進むか」を確かめるか
  let queue = [];
  let index = -1;
  let endTime = 0;
  let armed = false;   // その記録の場面が流れ始めたのを確かめたか（動画の切り替え直後の誤判定を防ぐ）
  let timer = null;
  let handlers = null;

  // start(record)：その記録の場面を流し始める。流せなければ false（動画が選ばれていないなど）
  // now()：今の再生位置（秒） / ended()：動画の最後まで行ったか / pause()：止める
  // onChange()：再生中の記録が変わったとき・終わったとき（画面の描き直し用）
  function init(h) {
    handlers = h;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    const wasPlaying = index >= 0;
    index = -1;
    queue = [];
    if (wasPlaying) {
      handlers.pause();
      handlers.onChange();
    }
  }

  // 次の記録へ。流せない記録（動画が選ばれていない）は飛ばす
  function next() {
    index++;
    while (index < queue.length && !handlers.start(queue[index])) index++;
    if (index >= queue.length) { stop(); return; }
    endTime = queue[index].time + Settings.replayTailSeconds;
    armed = false;
    handlers.onChange();
  }

  return {
    init,
    stop,
    // records を順に再生する。1件も流せなければ false
    play(records) {
      stop();
      queue = records.slice();
      next();
      if (index < 0) return false;
      timer = setInterval(() => {
        // 動画を切り替えた直後は、前の動画の再生位置が残っていることがあるので、
        // まず「記録より前の場面が流れている」のを確かめてから、終わりを見る
        if (!armed) {
          if (handlers.now() < endTime) armed = true;
          return;
        }
        if (handlers.now() >= endTime || handlers.ended()) next();
      }, CHECK_MS);
      return true;
    },
    isPlaying: () => index >= 0,
    // 今流している記録（なければ null）
    current: () => (index >= 0 ? queue[index] : null),
  };
})();
