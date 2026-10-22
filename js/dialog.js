// 記録の入力画面。選択肢は Options（options.js）から作る。
// どの項目が必須かなどのルールは、init で受け取る関数に任せる。
const RecordDialog = (() => {
  const dialog = document.getElementById('dialog');
  const saveBtn = document.getElementById('saveBtn');
  const dlgError = document.getElementById('dlgError');
  const missGroup = document.getElementById('missGroup');
  let draft = null; // 入力中の記録
  let rules = null;

  // 選択肢ボタンを描画
  function renderChoices() {
    document.querySelectorAll('.choices').forEach((box) => {
      const key = box.dataset.key;
      box.innerHTML = '';
      Options[key].forEach((label) => {
        if (label === null) { box.appendChild(Object.assign(document.createElement('div'), { className: 'break' })); return; }
        const btn = document.createElement('button');
        btn.textContent = label;
        if (draft[key] === label) btn.className = 'selected';
        btn.onclick = () => {
          // 選択中のものをもう一度押すと解除（コースのように選ばなくていい項目のため）
          draft[key] = draft[key] === label ? null : label;
          if (!rules.needsMissType(draft)) draft.missType = null;
          renderChoices();
        };
        box.appendChild(btn);
      });
    });
    // ミスの種類は「ミス」のときだけ表示
    missGroup.style.display = rules.needsMissType(draft) ? 'block' : 'none';
    // 項目がそろうまで保存ボタンを灰色に（押すと足りない項目を案内する）
    const missing = rules.missingItems(draft);
    saveBtn.classList.toggle('incomplete', missing.length > 0);
    if (missing.length === 0) dlgError.textContent = '';
  }

  // onSave(record)：保存ボタンで、入力済みの記録を受け取る
  // missingItems(draft)：足りない項目名の配列を返す / needsMissType(draft)：ミスの種類が必要か
  function init({ onSave, missingItems, needsMissType }) {
    rules = { missingItems, needsMissType };
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
    draft = { time, x, y, player: null, shot: null, course: null, outcome: null, missType: null };
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
