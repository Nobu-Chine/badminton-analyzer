// 手順の案内：「次にやること」を1つだけ、画面の手前（重ねた小さな画面）に出し、済んだら自動で次へ進む。
// 文と並びは stepGuideData.js。ボタンを押したときの操作は受け取った関数に任せる。
// どこまで進んだかは、動画ごとにこの端末へ保存する（同じ動画を開き直しても、済んだ所は飛ばす）。
const StepGuide = (() => {
  const KEY = 'badminton-step-guide';
  const box = document.getElementById('stepGuide');
  // 動画の key → { rally: 'auto'|'manual'|'skip', orientation: 'vertical'|'horizontal', side: true, done: true }
  let progress = Store.load(KEY, {});
  let closedWithoutVideo = false; // 動画を選ぶ前に閉じたら、このページを開いている間は出さない
  let onAction = null;
  let shownKey = ''; // 同じ内容なら描き直さない（再生中は何度も呼ばれるため）
  let current = null; // 今出している状態（閉じるときに使う）
  const seenSteps = {}; // 動画の key → このページで出したステップの番号（飛ばしたステップを伝えるため）

  function progressOf(videoKey) {
    return progress[videoKey] || {};
  }

  // その動画で済んだことを足して保存する
  function mark(videoKey, change) {
    if (!videoKey) return;
    progress[videoKey] = Object.assign({}, progressOf(videoKey), change);
    Store.save(KEY, progress);
  }

  // 今の状態から、出すステップの id を決める（出さないときは null）
  //   s：{ videoKey, hidden, rallyCount, sideCount, recordCount }
  function stepFor(s) {
    if (!s.videoKey) return closedWithoutVideo ? null : 'video';
    const p = progressOf(s.videoKey);
    if (s.hidden || p.done) return null;
    // 1件でも記録があれば、もう使い方は分かっている（前から使っている動画も含む）。この動画ではもう出さない
    if (s.recordCount > 0) { mark(s.videoKey, { done: true }); return null; }
    if (s.rallyCount === 0 && !p.rally) return 'rally';
    if (!p.side && s.sideCount === 0) return p.orientation ? 'side' : 'orientation';
    return 'record';
  }

  function add(parent, tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    parent.appendChild(e);
    return e;
  }

  function draw(step, s) {
    box.innerHTML = '';
    const data = StepGuideData.steps.find((x) => x.id === step);
    const p = progressOf(s.videoKey);

    add(box, 'div', 'step-head', 'ステップ ' + data.number + '／' + StepGuideData.total + '　' + data.title);

    // 前に済ませていて、今回は出さずに飛ばしたステップがあれば伝える（いきなり先のステップが出て驚かないように）
    if (s.videoKey) {
      const seen = seenSteps[s.videoKey] || (seenSteps[s.videoKey] = new Set());
      seen.add(data.number);
      const skipped = [];
      for (let n = 2; n < data.number; n++) if (!seen.has(n)) skipped.push(n);
      if (skipped.length > 0) add(box, 'p', 'step-tip', StepGuideData.skippedNote(skipped));
    }
    add(box, 'p', 'step-text', data.text);

    const buttons = data.buttonsBy ? data.buttonsBy[p.orientation] : data.buttons;
    const row = add(box, 'div', 'step-buttons');
    buttons.forEach((b) => {
      const btn = add(row, 'button', b.main ? 'main' : '', b.label);
      // 自分の場所は、先に選んだ縦／横と一緒に渡す
      btn.onclick = () => press(Object.assign({ orientation: p.orientation }, b), s.videoKey);
    });

    if (data.tip) add(box, 'p', 'step-tip', data.tip);
    // 「自分で区切る」を選んで、まだ印がないときは一言添える
    if (step !== 'rally' && p.rally === 'manual' && s.rallyCount === 0) add(box, 'p', 'step-tip', StepGuideData.manualRallyTip);

    const close = add(box, 'button', 'link-btn step-close', StepGuideData.closeLabel);
    close.onclick = closeGuide;
  }

  function closeGuide() {
    if (current && current.videoKey) mark(current.videoKey, { done: true });
    else closedWithoutVideo = true;
    onAction({ action: 'refresh' });
  }

  // ボタンを押したとき：済んだことを覚えてから、操作を頼む
  function press(button, videoKey) {
    const a = button.action;
    if (a === 'autoRally') mark(videoKey, { rally: 'auto' });
    if (a === 'manualRally') mark(videoKey, { rally: 'manual' });
    if (a === 'skipRally') mark(videoKey, { rally: 'skip' });
    if (a === 'orientation') mark(videoKey, { orientation: button.orientation });
    if (a === 'side') mark(videoKey, { side: true });
    if (a === 'finish') mark(videoKey, { done: true });
    if (a === 'chooseVideo' || a === 'sample') closedWithoutVideo = true; // 選ぶ画面を開くので、いったんしまう
    onAction(button);
    onAction({ action: 'refresh' });
  }

  // handler(button)：ボタンの操作をする。button.action は stepGuideData.js の action（'refresh' は描き直しだけ）
  function init(handler) {
    onAction = handler;
    // Esc キーなどで閉じたときも「案内を閉じる」と同じにする
    box.addEventListener('cancel', (e) => { e.preventDefault(); closeGuide(); });
  }

  function render(s) {
    const step = stepFor(s);
    const key = step === null ? '' : [step, s.videoKey, s.rallyCount === 0, progressOf(s.videoKey).rally].join('|');
    if (key === shownKey) return;
    shownKey = key;
    current = s;
    if (step === null) {
      if (box.open) box.close();
      return;
    }
    draw(step, s);
    if (!box.open) box.showModal();
  }

  return { init, render };
})();
