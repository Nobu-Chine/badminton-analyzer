// 記録の入力画面。選択肢は Options（options.js）から作る。
// どの項目を使うか・どれが必須かのルールは、init で受け取る関数に任せる。
const RecordDialog = (() => {
  const dialog = document.getElementById('dialog');
  const saveBtn = document.getElementById('saveBtn');
  const dlgError = document.getElementById('dlgError');
  let draft = null; // 入力中の記録
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

  // onSave(record)：保存ボタンで、入力済みの記録を受け取る
  // missingItems(draft)：足りない項目名の配列を返す / inactiveKeys(draft)：今は使わない項目の配列を返す
  function init({ onSave, missingItems, inactiveKeys }) {
    rules = { missingItems, inactiveKeys };
    document.getElementById('cancelBtn').onclick = () => dialog.close();
    saveBtn.onclick = () => {
      const missing = rules.missingItems(draft);
      if (missing.length > 0) {
        dlgError.textContent = missing.join('・') + ' を選んでください';
        return;
      }
      dialog.close();
      onSave(draft);
    };
  }

  function open(time, x, y) {
    draft = { time, x, y, player: null, shot: null, course: null, outcome: null,
              missType: null, setup: null, setupShot: null };
    document.getElementById('dlgTime').textContent = '動画の時間：' + Player.formatTime(time);
    dlgError.textContent = '';
    renderChoices();
    dialog.showModal();
    dialog.scrollTop = 0;
    // 開いた瞬間に最初のボタンへ枠が付き、選択済みに見えるのを防ぐ
    document.activeElement.blur();
  }

  return { init, open, isOpen: () => dialog.open };
})();
