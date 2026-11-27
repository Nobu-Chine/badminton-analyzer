// 短いお知らせ：画面の下の方に少しの間だけ出して、自動で消える（「◯件の再生が終わりました」など）。
const Toast = (() => {
  const box = document.getElementById('toast');
  let timer = null;

  // text：出す文 / ms：出しておく時間（ミリ秒）
  function show(text, ms = 2500) {
    box.textContent = text;
    box.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { box.hidden = true; }, ms);
  }

  return { show };
})();
