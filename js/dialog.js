// 記録の入力画面。選択肢は Options（options.js）から作る。
// どの項目を使うか・どれが必須かのルールは、init で受け取る関数に任せる。
const RecordDialog = (() => {
  const dialog = document.getElementById('dialog');
  const saveBtn = document.getElementById('saveBtn');
  const dlgError = document.getElementById('dlgError');
  // 見直し中に画面の下に出す「記録の続きに戻る」バー
  const resumeBar = document.getElementById('resumeBar');
  const resumeBtn = document.getElementById('resumeBtn');
  const memoInput = document.getElementById('memoInput');
  let draft = null; // 入力中の記録（見直し中も残す）
  let rules = null;

  // 今の入力内容で使わない項目は、値を消す
  function clearInactive() {
    rules.inactiveKeys(draft).forEach((key) => { draft[key] = null; });
  }

  // 選択肢ボタンを描画
  function renderChoices() {
    const inactive = rules.inactiveKeys(draft);
    document.querySelectorAll('.choices').forEach((box) => {
      const key = box.dataset.key;
      // 使わない項目はまとめて隠す
      box.closest('.group').style.display = inactive.includes(key) ? 'none' : 'block';
      box.innerHTML = '';
      Options[key].forEach((label) => {
        if (label === null) { box.appendChild(Object.assign(document.createElement('div'), { className: 'break' })); return; }
        const btn = document.createElement('button');
        btn.textContent = label;
        if (draft[key] === label) btn.className = 'selected';
        btn.onclick = () => {
          // 選択中のものをもう一度押すと解除（コースのように選ばなくていい項目のため）
          draft[key] = draft[key] === label ? null : label;
          clearInactive();
          renderChoices();
          // 新しく出てきた項目が画面の外なら、見えるところまで動かす
          const appeared = inactive.find((k) => !rules.inactiveKeys(draft).includes(k));
          if (appeared) {
            document.querySelector('.choices[data-key=' + appeared + ']').closest('.group')
              .scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        };
        box.appendChild(btn);
      });
    });
    // 項目がそろうまで保存ボタンを灰色に（押すと足りない項目を案内する）
    const missing = rules.missingItems(draft);
    saveBtn.classList.toggle('incomplete', missing.length > 0);
    if (missing.length === 0) dlgError.textContent = '';
  }

  // 入力途中の記録を捨てる（やめる・保存のあと、別の動画に切り替えたときなど）
  function discard() {
    draft = null;
    resumeBar.hidden = true;
  }

  // 入力途中の内容で、記録画面を開き直す
  function show() {
    resumeBar.hidden = true;
    document.getElementById('dlgTime').textContent = '動画の時間：' + Player.formatTime(draft.time);
    memoInput.value = draft.memo || '';
    renderChoices();
    dialog.showModal();
    // 開いた瞬間に最初のボタンへ枠が付き、選択済みに見えるのを防ぐ
    document.activeElement.blur();
  }

  // onSave(record)：保存ボタンで、入力済みの記録を受け取る
  // onReview()：「動画を見直す」で記録画面を閉じたとき（動画を見える所に出すため）
  // missingItems(draft)：足りない項目名の配列を返す / inactiveKeys(draft)：今は使わない項目の配列を返す
  function init({ onSave, onReview, missingItems, inactiveKeys }) {
    rules = { missingItems, inactiveKeys };
    document.getElementById('cancelBtn').onclick = () => { dialog.close(); discard(); };
    // 入力を残したまま閉じて、動画を見直せるようにする
    document.getElementById('reviewBtn').onclick = () => {
      dialog.close();
      resumeBtn.textContent = '記録の続きに戻る（' + Player.formatTime(draft.time) + '）';
      resumeBar.hidden = false;
      onReview();
    };
    resumeBtn.onclick = show;
    // メモは書くたびに入力中の記録へ入れる（見直しで閉じても残る）
    memoInput.addEventListener('input', () => { if (draft) draft.memo = memoInput.value; });
    document.getElementById('resumeDiscardBtn').onclick = () => {
      if (confirm('入力中の記録をやめますか？')) discard();
    };
    saveBtn.onclick = () => {
      const missing = rules.missingItems(draft);
      if (missing.length > 0) {
        dlgError.textContent = missing.join('・') + ' を選んでください';
        return;
      }
      const record = draft;
      // メモは前後の空白を消し、空なら持たない
      record.memo = (record.memo || '').trim() || null;
      dialog.close();
      discard();
      onSave(record);
    };
  }

  // extra：記録に一緒に入れておく値（どの動画の記録か など）
  function open(time, x, y, extra) {
    // 見直し中にコートをタップしたら、入力はそのままで位置だけ置き直す
    if (draft) {
      Object.assign(draft, { x, y });
      show();
      return;
    }
    draft = Object.assign({ time, x, y, player: null, shot: null, course: null, outcome: null,
              winType: null, missType: null, cause: null, setupShot: null, memo: null }, extra);
    dlgError.textContent = '';
    show();
    dialog.scrollTop = 0;
  }

  return {
    init, open, discard,
    isOpen: () => dialog.open,
    draftVideoKey: () => (draft ? draft.videoKey : null), // 見直し中の記録の動画（なければ null）
  };
})();
