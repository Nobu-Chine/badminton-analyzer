// タブの切り替え（表示だけ）。中身が何かは知らない。
// ボタンの data-tab と、中身の data-panel が同じ名前のものを見せる。
const Tabs = {
  init() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => Tabs.select(btn.dataset.tab));
    });
  },

  // name のタブに切り替える（集計の棒を押したときなど、プログラムからも使う）
  select(name) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  },
};
