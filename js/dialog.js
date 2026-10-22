// 記録の入力画面。選択肢は Options（options.js）から作る。
const RecordDialog = (() => {
  const dialog = document.getElementById('dialog');
  const saveBtn = document.getElementById('saveBtn');
  const dlgError = document.getElementById('dlgError');
  const missGroup = document.getElementById('missGroup');
  let draft = null; // 入力中の記録

  // まだ選ばれていない項目の名前を返す
  function missingItems() {
    const list = [];
    if (!draft.shot) list.push('ショットの種類');
    if (!draft.result) list.push('結果');
    if (draft.result === 'ミス' && !draft.missType) list.push('ミスの種類');
    return list;
  }

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
          draft[key] = label;
          if (key === 'result' && label === '得点') draft.missType = null;
          renderChoices();
        };
        box.appendChild(btn);
      });
    });
    // ミスの種類は「ミス」のときだけ表示
    missGroup.style.display = draft.result === 'ミス' ? 'block' : 'none';
    // 項目がそろうまで保存ボタンを灰色に（押すと足りない項目を案内する）
    const missing = missingItems();
    saveBtn.classList.toggle('incomplete', missing.length > 0);
    if (missing.length === 0) dlgError.textContent = '';
  }

  // onSave(record)：保存ボタンで、入力済みの記録を受け取る
  function init(onSave) {
    document.getElementById('cancelBtn').onclick = () => dialog.close();
    saveBtn.onclick = () => {
      const missing = missingItems();
      if (missing.length > 0) {
        dlgError.textContent = missing.join('・') + ' を選んでください';
        return;
      }
      dialog.close();
      onSave(draft);
    };
  }

  function open(time, x, y) {
    draft = { time, x, y, shot: null, result: null, missType: null };
    document.getElementById('dlgTime').textContent = '動画の時間：' + Player.formatTime(time);
    dlgError.textContent = '';
    renderChoices();
    dialog.showModal();
    // 開いた瞬間に最初のボタン（クリア）へ枠が付き、選択済みに見えるのを防ぐ
    document.activeElement.blur();
  }

  return { init, open, isOpen: () => dialog.open };
})();
