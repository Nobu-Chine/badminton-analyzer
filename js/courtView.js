// コート図の見た目の向き：縦／横、横のときに自分コートを左右どちらに置くか。
// 切り替えボタンの表示と、選んだ向きの保存だけを持つ（コートの描き方は court.js に任せる）。
const CourtView = (() => {
  const KEY = 'badminton-court-view';
  let view = { orientation: 'vertical', meSide: 'right' };
  let onChange = null;

  // 押せるボタンの見た目を、今の向きに合わせる
  function render() {
    document.querySelectorAll('[data-orientation]').forEach((b) =>
      b.classList.toggle('selected', b.dataset.orientation === view.orientation));
    document.querySelectorAll('[data-me-side]').forEach((b) =>
      b.classList.toggle('selected', b.dataset.meSide === view.meSide));
    // 「自分：左／右」は横向きのときだけ使う（縦は自分がいつも下）
    document.getElementById('meSideRow').hidden = view.orientation !== 'horizontal';
  }

  function update(change) {
    view = Object.assign({}, view, change);
    Store.save(KEY, view);
    render();
    onChange(view);
  }

  // handler(view)：向きが変わったとき
  function init(handler) {
    onChange = handler;
    view = Object.assign(view, Store.load(KEY, {}));
    document.querySelectorAll('[data-orientation]').forEach((b) => {
      b.onclick = () => update({ orientation: b.dataset.orientation });
    });
    document.querySelectorAll('[data-me-side]').forEach((b) => {
      b.onclick = () => update({ meSide: b.dataset.meSide });
    });
    render();
    return view;
  }

  return { init, get: () => view };
})();
