// 動画の下に、今流れている場面の記録のメモを出す（画面への表示だけ）。
// 「場面」は、記録した時間の少し前〜少し後（一覧から流すときと同じ幅。settings.js）。
const SceneMemo = (() => {
  const box = document.getElementById('sceneMemo');
  let shown = null; // 今出しているメモの文（同じなら描き直さない）

  // records：今の動画の記録 / time：今の再生位置
  function render(records, time) {
    // 場面に入っているメモ付きの記録のうち、記録した時間がいちばん近いもの
    const hit = records
      .filter((r) => r.memo &&
        time >= r.time - Settings.replayLeadSeconds && time <= r.time + Settings.replayTailSeconds)
      .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
    const text = hit ? 'メモ（' + Player.formatTime(hit.time) + '）：' + hit.memo : null;
    if (text === shown) return;
    shown = text;
    box.hidden = !text;
    box.textContent = text || '';
  }

  return { render };
})();
