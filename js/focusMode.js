// 全画面モード：動画と操作ボタン（再生・5秒・1コマ・ここで記録）だけを画面いっぱいに出す。
// iPhone の Safari は、自分で作ったボタンを載せたままの全画面ができない（動画だけの全画面は標準の操作になる）ので、
// ページの中で動画と操作ボタンを画面いっぱいに広げる形にしている。PC・Android などはブラウザの全画面も一緒に使う。
// 表示の出し入れだけを持つ。「記録したら戻る」などのつなぎは main.js。
const FocusMode = (() => {
  let onExitPressed = null;

  // ブラウザの全画面（使えない端末では何もしない）
  function browserFullscreen(on) {
    try {
      const el = document.documentElement;
      if (on && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) { /* 使えなくても、画面いっぱいの表示は続ける */ }
  }

  function enter() {
    document.body.classList.add('focus-mode');
    browserFullscreen(true);
  }

  function exit() {
    document.body.classList.remove('focus-mode');
    browserFullscreen(false);
  }

  // onExit()：「✕ 全画面をやめる」を押したとき（記録のあとに全画面へ戻る予定も取り消すため）
  function init({ onExit }) {
    onExitPressed = onExit;
    document.getElementById('focusExitBtn').onclick = () => { exit(); onExitPressed(); };
    // ブラウザの全画面を Esc などで抜けたときは、画面いっぱいの表示もやめる
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isOn()) { exit(); onExitPressed(); }
    });
  }

  function isOn() {
    return document.body.classList.contains('focus-mode');
  }

  return { init, enter, exit, isOn };
})();
