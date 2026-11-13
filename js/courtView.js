// コート図の見た目の向き：縦／横、横のときに自分コートを左右どちらに置くか。
// 切り替えボタンと、この動画のコートチェンジの一覧を表示するだけ。
//   縦／横は、この端末の好みとして保存する
//   自分の左右は、動画の時間ごとに変わる（コートチェンジ）。何時にどちらかは Matches が持つ
const CourtView = (() => {
  const KEY = 'badminton-court-view';
  let view = { orientation: 'vertical', meSide: 'right' };
  let handlers = null;
  let shownChanges = ''; // 一覧の描き直しを減らすため、前回の中身を覚えておく

  // 押せるボタンの見た目を、今の向きに合わせる
  function render() {
    document.querySelectorAll('[data-orientation]').forEach((b) =>
      b.classList.toggle('selected', b.dataset.orientation === view.orientation));
    document.querySelectorAll('[data-me-side]').forEach((b) =>
      b.classList.toggle('selected', b.dataset.meSide === view.meSide));
    // 「自分：左／右」とコートチェンジの一覧は、横向きのときだけ使う（縦は自分がいつも下）
    const horizontal = view.orientation === 'horizontal';
    document.getElementById('meSideRow').hidden = !horizontal;
    document.getElementById('sideChanges').hidden = !horizontal || shownChanges === '';
  }

  function save() {
    Store.save(KEY, view);
  }

  // onOrientation(view)：縦／横が切り替わったとき
  // onSidePressed(side)：「自分：左／右」が押されたとき（コートチェンジとして記録するのは呼び出し側）
  // onRemoveChange(index)：コートチェンジの ✕ が押されたとき
  function init(h) {
    handlers = h;
    view = Object.assign(view, Store.load(KEY, {}));
    document.querySelectorAll('[data-orientation]').forEach((b) => {
      b.onclick = () => {
        view = Object.assign({}, view, { orientation: b.dataset.orientation });
        save();
        render();
        handlers.onOrientation(view);
      };
    });
    document.querySelectorAll('[data-me-side]').forEach((b) => {
      b.onclick = () => handlers.onSidePressed(b.dataset.meSide);
    });
    render();
    return view;
  }

  // 今の時間の、自分の左右を表示に反映する。変わったら true
  //   最後に表示した向きは、設定のない動画で使う「いつもの向き」として保存する
  function showSide(side) {
    if (view.meSide === side) return false;
    view = Object.assign({}, view, { meSide: side });
    save();
    render();
    return true;
  }

  // この動画のコートチェンジの一覧：changes は [{ time, side }]、fmt(秒) で時間を文字にする
  function renderChanges(changes, fmt) {
    const key = JSON.stringify(changes);
    if (key === shownChanges) return;
    shownChanges = changes.length > 0 ? key : '';
    const box = document.getElementById('sideChanges');
    box.innerHTML = '';
    if (changes.length > 0) {
      box.appendChild(Object.assign(document.createElement('span'), { textContent: 'この動画のコートチェンジ：' }));
      changes.forEach((c, i) => {
        const item = document.createElement('span');
        item.className = 'side-change';
        item.textContent = fmt(c.time) + ' 自分が' + (c.side === 'left' ? '左' : '右');
        // 最初の点（動画のはじめの向き）は消せないようにする
        if (i > 0) {
          const del = document.createElement('button');
          del.textContent = '✕';
          del.setAttribute('aria-label', 'このコートチェンジを消す');
          del.onclick = () => handlers.onRemoveChange(i);
          item.appendChild(del);
        }
        box.appendChild(item);
      });
    }
    render();
  }

  return { init, get: () => view, showSide, renderChanges };
})();
