// 手順の案内：「次にやること」を1つだけ、画面の手前（重ねた小さな画面）に出し、済んだら自動で次へ進む。
// 文と並びは stepGuideData.js。ボタンを押したときの操作は受け取った関数に任せる。
//   初めての動画：ステップ2→3→4と順に聞く
//   前に使った動画：「準備ができています（ラリー24本・縦・自分が下）」を出し、このまま進むか、やり直すかを選ぶ
// どこまで進んだかは、動画ごとにこの端末へ保存する。
const StepGuide = (() => {
  const KEY = 'badminton-step-guide';
  const box = document.getElementById('stepGuide');
  // 動画の key → { active: 案内の途中か, rally: 'auto'|'manual'|'skip', orientation, side: true, done: true }
  let progress = Store.load(KEY, {});
  let closedWithoutVideo = false; // 動画を選ぶ前に閉じたら、このページを開いている間は出さない
  const answered = new Set(); // このページで「準備ができています」に答えた動画
  let onAction = null;
  let shownKey = ''; // 同じ内容なら描き直さない（再生中は何度も呼ばれるため）
  let current = null; // 今出している状態（閉じるときに使う）

  function progressOf(videoKey) {
    return progress[videoKey] || {};
  }

  // その動画の進み具合を変えて保存する（replace が true なら入れ替え）
  function mark(videoKey, change, replace = false) {
    if (!videoKey) return;
    progress[videoKey] = Object.assign({}, replace ? {} : progressOf(videoKey), change);
    Store.save(KEY, progress);
  }

  // 前に使った動画か（案内を通した・印や記録がある）
  function isKnown(s) {
    return !!progress[s.videoKey] || s.rallyCount > 0 || s.sideCount > 0 || s.recordCount > 0;
  }

  // 今の状態から、出すステップの id を決める（出さないときは null）
  //   s：{ videoKey, hidden, rallyCount, sideCount, recordCount, setup }
  function stepFor(s) {
    if (!s.videoKey) return closedWithoutVideo ? null : 'video';
    if (s.hidden) return null;
    const p = progressOf(s.videoKey);
    if (!p.active) {
      if (!isKnown(s)) { mark(s.videoKey, { active: true }, true); return 'rally'; } // 初めての動画
      return answered.has(s.videoKey) ? null : 'ready';
    }
    // 案内の途中で1件記録したら、使い方は分かったので終える
    if (s.recordCount > 0) { finish(s.videoKey); return null; }
    if (!p.rally) return 'rally';
    if (!p.side) return p.orientation ? 'side' : 'orientation';
    return 'record';
  }

  function finish(videoKey) {
    mark(videoKey, { active: false, done: true });
    answered.add(videoKey);
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

    add(box, 'div', 'step-head', data.number
      ? 'ステップ ' + data.number + '／' + StepGuideData.total + '　' + data.title
      : data.title);
    add(box, 'p', 'step-text', data.text);
    // 前に使った動画：今の準備の中身を見せる
    if (step === 'ready') add(box, 'p', 'step-summary', StepGuideData.summary(s.setup));

    const buttons = data.buttonsBy ? data.buttonsBy[p.orientation] : data.buttons;
    const row = add(box, 'div', 'step-buttons');
    buttons.forEach((b) => {
      const btn = add(row, 'button', b.main ? 'main' : '', b.label);
      // 自分の場所は、先に選んだ縦／横と一緒に渡す
      btn.onclick = () => press(Object.assign({ orientation: p.orientation }, b), s.videoKey);
    });

    if (data.tip) add(box, 'p', 'step-tip', data.tip);
    // 「自分で区切る」を選んで、まだ印がないときは一言添える
    if (p.active && step !== 'rally' && p.rally === 'manual' && s.rallyCount === 0) {
      add(box, 'p', 'step-tip', StepGuideData.manualRallyTip);
    }

    const close = add(box, 'button', 'link-btn step-close', StepGuideData.closeLabel);
    close.onclick = closeGuide;
  }

  function closeGuide() {
    if (current && current.videoKey) finish(current.videoKey);
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
    if (a === 'finish' || a === 'keep') finish(videoKey);
    if (a === 'redo') mark(videoKey, { active: true }, true); // ステップ2から聞き直す
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
    const key = step === null ? ''
      : [step, s.videoKey, s.rallyCount === 0, progressOf(s.videoKey).rally, step === 'ready' ? JSON.stringify(s.setup) : ''].join('|');
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
