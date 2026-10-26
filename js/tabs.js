// タブの切り替え（表示だけ）。中身が何かは知らない。
// ボタンの data-tab と、中身の data-panel が同じ名前のものを見せる。
const Tabs = {
  init() {
    const buttons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        panels.forEach((p) => { p.hidden = p.dataset.panel !== btn.dataset.tab; });
      });
    });
  },
};
