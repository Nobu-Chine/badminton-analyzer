// ラリーの印：「＋ ラリー開始」で始まりに印を付け、「前／次のラリー」で飛ぶ。
// 印の保存は受け取った関数に任せ、ここは画面の表示と「どこへ飛ぶか」の計算だけを持つ。
const RallyNav = (() => {
  const nav = document.getElementById('rallyNav');
  const label = document.getElementById('rallyLabel');
  const marks = document.getElementById('rallyMarks');
  const prevBtn = document.getElementById('prevRallyBtn');
  const nextBtn = document.getElementById('nextRallyBtn');
  let shownKey = ''; // 同じ内容なら描き直さない（再生中は何度も呼ばれるため）
  let removeMark = null; // 印の ✕ を押したとき

  // time より後の、いちばん近いラリーの始まり（なければ null）
  function nextStart(starts, time) {
    const hit = starts.find((t) => t > time + 0.3);
    return hit === undefined ? null : hit;
  }

  // 「前のラリー」で飛ぶ先。今のラリーの途中なら、その始まり。始まった直後なら、1つ前のラリー
  function prevStart(starts, time) {
    const before = starts.filter((t) => t <= time + 0.05);
    if (before.length === 0) return null;
    const cur = before[before.length - 1];
    if (time - cur > Settings.rallyBackSeconds) return cur;
    return before.length >= 2 ? before[before.length - 2] : cur;
  }

  // 今が何番目のラリーか（最初の印より前なら 0）
  function indexAt(starts, time) {
    return starts.filter((t) => t <= time + 0.05).length;
  }

  // onMark()：「＋ ラリー開始」 / onJump(time)：前／次のラリーへ飛ぶ / onRemove(index)：印を消す
  // starts()：今の動画の印 / now()：今の再生位置
  function init({ onMark, onJump, onRemove, starts, now }) {
    document.getElementById('markRallyBtn').onclick = onMark;
    nextBtn.onclick = () => { const t = nextStart(starts(), now()); if (t !== null) onJump(t); };
    prevBtn.onclick = () => { const t = prevStart(starts(), now()); if (t !== null) onJump(t); };
    removeMark = onRemove;
  }

  // starts：今の動画の印 / time：今の再生位置 / hasVideo：動画が選ばれているか / fmt：秒→「分:秒」
  function render(starts, time, hasVideo, fmt) {
    const index = indexAt(starts, time);
    const key = [hasVideo, index, starts.join(','), nextStart(starts, time) !== null, prevStart(starts, time) !== null].join('|');
    if (key === shownKey) return;
    shownKey = key;

    nav.hidden = !hasVideo;
    nextBtn.disabled = nextStart(starts, time) === null;
    prevBtn.disabled = prevStart(starts, time) === null;
    label.textContent = starts.length === 0
      ? 'ラリーが始まる場面で「＋ ラリー開始」を押すと、ラリーごとに飛べます'
      : 'ラリー ' + (index > 0 ? index : '-') + ' / ' + starts.length;

    // 印の一覧（多くなるので、たたんでおく）。✕ で消せる
    marks.hidden = starts.length === 0;
    document.getElementById('rallyMarksSummary').textContent = '印の一覧（' + starts.length + '）';
    const chips = document.getElementById('rallyChips');
    chips.innerHTML = '';
    starts.forEach((t, i) => {
      const item = document.createElement('span');
      item.className = 'side-change';
      item.textContent = (i + 1) + '. ' + fmt(t);
      const del = document.createElement('button');
      del.textContent = '✕';
      del.setAttribute('aria-label', 'この印を消す');
      del.onclick = () => removeMark(i);
      item.appendChild(del);
      chips.appendChild(item);
    });
  }

  return { init, render, nextStart };
})();
