// 手順の案内：「次にやること」を1つだけ出し、済んだら自動で次へ進む。
// 文と並びは stepGuideData.js。ボタンを押したときの操作は受け取った関数に任せる。
// どこまで進んだかは、動画ごとにこの端末へ保存する（同じ動画を開き直しても、済んだ所は飛ばす）。
const StepGuide = (() => {
  const KEY = 'badminton-step-guide';
  const box = document.getElementById('stepGuide');
  let progress = Store.load(KEY, {}); // 動画の key → { rally: 'auto'|'manual'|'skip', side: true, done: true }
  let onAction = null;
  let shownKey = ''; // 同じ内容なら描き直さない（再生中は何度も呼ばれるため）

  function progressOf(videoKey) {
    return progress[videoKey] || {};
  }

  // その動画で済んだことを足して保存する
  function mark(videoKey, change) {
    if (!videoKey) return;
    progress[videoKey] = Object.assign({}, progressOf(videoKey), change);
    Store.save(KEY, progress);
  }

  // 今の状態から、出すステップを決める（出さないときは null）
  //   s：{ videoKey, hidden, rallyCount, sideCount, recordCount }
  function stepFor(s) {
    if (!s.videoKey) return 'video';
    const p = progressOf(s.videoKey);
    if (s.hidden || p.done) return null;
    // 1件でも記録があれば、もう使い方は分かっている（前から使っている動画も含む）。この動画ではもう出さない
    if (s.recordCount > 0) { mark(s.videoKey, { done: true }); return null; }
    if (s.rallyCount === 0 && !p.rally) return 'rally';
    if (!p.side && s.sideCount === 0) return 'side';
    return 'record';
  }

  function draw(step, s) {
    box.innerHTML = '';
    const steps = StepGuideData.steps;
    const index = steps.findIndex((x) => x.id === step);
    const data = steps[index];

    const head = document.createElement('div');
    head.className = 'step-head';
    head.textContent = 'ステップ ' + (index + 1) + '／' + steps.length + '　' + data.title;
    box.appendChild(head);
    box.appendChild(Object.assign(document.createElement('p'), { className: 'step-text', textContent: data.text }));

    if (data.buttons.length > 0) {
      const row = document.createElement('div');
      row.className = 'step-buttons';
      data.buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.textContent = b.label;
        if (b.main) btn.className = 'main';
        btn.onclick = () => press(b, s.videoKey);
        row.appendChild(btn);
      });
      box.appendChild(row);
    }

    // 「自分で区切る」を選んで、まだ印がないときは一言添える
    if (step !== 'rally' && progressOf(s.videoKey).rally === 'manual' && s.rallyCount === 0) {
      box.appendChild(Object.assign(document.createElement('p'), { className: 'step-tip', textContent: StepGuideData.manualRallyTip }));
    }

    if (step !== 'video') {
      const close = document.createElement('button');
      close.className = 'link-btn step-close';
      close.textContent = StepGuideData.closeLabel;
      close.onclick = () => { mark(s.videoKey, { done: true }); onAction({ action: 'refresh' }); };
      box.appendChild(close);
    }
  }

  // ボタンを押したとき：済んだことを覚えてから、操作を頼む
  function press(button, videoKey) {
    if (button.action === 'autoRally') mark(videoKey, { rally: 'auto' });
    if (button.action === 'manualRally') mark(videoKey, { rally: 'manual' });
    if (button.action === 'skipRally') mark(videoKey, { rally: 'skip' });
    if (button.action === 'side') mark(videoKey, { side: true });
    onAction(button);
    onAction({ action: 'refresh' });
  }

  // handler(button)：ボタンの操作をする。button.action は stepGuideData.js の action（'refresh' は描き直しだけ）
  function init(handler) {
    onAction = handler;
  }

  function render(s) {
    const step = stepFor(s);
    const key = step === null ? '' : [step, s.videoKey, s.rallyCount === 0, progressOf(s.videoKey).rally].join('|');
    if (key === shownKey) return;
    shownKey = key;
    box.hidden = step === null;
    if (step !== null) draw(step, s);
  }

  return { init, render };
})();
