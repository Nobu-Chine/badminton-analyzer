// コート図の見た目の向き：縦／横と、自分コートをどちら側に置くか。
// 切り替えボタンと、この動画のコートチェンジの一覧を表示するだけ。
//   縦／横は、この端末の好みとして保存する
//   自分がどちら側かは、動画の時間ごとに変わる（コートチェンジ）。何時にどちらかは Matches が持つ
//   保存の値は 'left' / 'right' のまま。縦のときは left＝上、right＝下 として見せる
const CourtView = (() => {
  const KEY = 'badminton-court-view';
  const SIDE_NAMES = {
    vertical: { left: '上', right: '下' },
    horizontal: { left: '左', right: '右' },
  };
  const sideName = (side) => SIDE_NAMES[view.orientation][side];
  let view = { orientation: 'vertical', meSide: 'right' };
  let handlers = null;
  let shownChanges = ''; // 一覧の描き直しを減らすため、前回の中身を覚えておく

  // 押せるボタンの見た目を、今の向きに合わせる
  function render() {
    document.querySelectorAll('[data-orientation]').forEach((b) =>
      b.classList.toggle('selected', b.dataset.orientation === view.orientation));
    document.querySelectorAll('[data-me-side]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.meSide === view.meSide);
      b.textContent = sideName(b.dataset.meSide);
    });
    document.getElementById('sideChanges').hidden = shownChanges === '';
    drawChanges();
  }

  // コートチェンジの一覧を描く（向きで「左／上」などの文字が変わるので、render のたびに描く）
  let changes = [];
  let fmt = null;
  function drawChanges() {
    const box = document.getElementById('sideChanges');
    box.innerHTML = '';
    if (changes.length === 0) return;
    box.appendChild(Object.assign(document.createElement('span'), { textContent: 'この動画のコートチェンジ：' }));
    changes.forEach((c, i) => {
      const item = document.createElement('span');
      item.className = 'side-change';
      item.textContent = fmt(c.time) + ' 自分が' + sideName(c.side);
      // 最初の点（動画のはじめの向き）は消せないようにする
      if (i > 0) {
        const del = document.createElement('button');
        del.className = 'del-btn small';
        del.textContent = '削除';
        del.setAttribute('aria-label', 'このコートチェンジを削除');
        del.onclick = () => handlers.onRemoveChange(i);
        item.appendChild(del);
      }
      box.appendChild(item);
    });
  }

  function save() {
    Store.save(KEY, view);
  }

  // onOrientation(view)：縦／横が切り替わったとき
  // onSidePressed(side)：「自分：左／右」が押されたとき（コートチェンジとして記録するのは呼び出し側）
  // onRemoveChange(index)：コートチェンジの「削除」が押されたとき
  function init(h) {
    handlers = h;
    view = Object.assign(view, Store.load(KEY, {}));
    document.querySelectorAll('[data-orientation]').forEach((b) => {
      b.onclick = () => setOrientation(b.dataset.orientation);
    });
    document.querySelectorAll('[data-me-side]').forEach((b) => {
      b.onclick = () => handlers.onSidePressed(b.dataset.meSide);
    });
    render();
    return view;
  }

  // 縦／横を切り替える（ボタンのほか、手順の案内からも使う）
  function setOrientation(orientation) {
    view = Object.assign({}, view, { orientation });
    save();
    render();
    handlers.onOrientation(view);
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
  function renderChanges(list, format) {
    const key = JSON.stringify(list);
    if (key === shownChanges) return;
    shownChanges = list.length > 0 ? key : '';
    changes = list;
    fmt = format;
    render();
  }

  return { init, get: () => view, setOrientation, showSide, renderChanges };
})();
