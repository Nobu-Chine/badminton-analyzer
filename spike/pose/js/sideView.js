// 「自分：左／右」ボタンと、コートチェンジの一覧の表示だけ。
export function createSideView({ onPress, onRemove }) {
  const buttons = document.querySelectorAll('[data-me-side]');
  const box = document.getElementById('sideChanges');
  buttons.forEach((b) => { b.onclick = () => onPress(b.dataset.meSide); });

  // side：今の時間の自分の向き / changes：[{ time, side }] / fmt(秒)：時間を文字にする
  function render(side, changes, fmt) {
    buttons.forEach((b) => b.classList.toggle('selected', b.dataset.meSide === side));
    box.innerHTML = '';
    box.hidden = changes.length === 0;
    if (changes.length === 0) return;
    box.appendChild(Object.assign(document.createElement('span'), { textContent: 'コートチェンジ：' }));
    changes.forEach((c, i) => {
      const item = document.createElement('span');
      item.className = 'side-change';
      item.textContent = fmt(c.time) + ' 自分が' + (c.side === 'left' ? '左' : '右');
      // 最初の点（動画のはじめの向き）は消せないようにする
      if (i > 0) {
        const del = document.createElement('button');
        del.textContent = '✕';
        del.setAttribute('aria-label', 'このコートチェンジを消す');
        del.onclick = () => onRemove(i);
        item.appendChild(del);
      }
      box.appendChild(item);
    });
  }

  return { render };
}
