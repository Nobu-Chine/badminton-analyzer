// ラリーの検出中の画面：画面の手前に出して、終わるまでほかを触らせない（ほかのアプリに切り替えないよう伝える）。
// 表示だけを持つ。検出そのもの（frameScan.js / cutDetect.js）や結果の保存は呼び出し側に任せる。
const ScanView = (() => {
  const box = document.getElementById('scanDialog');
  const bar = document.getElementById('scanBar');
  const title = document.getElementById('scanTitle');
  const message = document.getElementById('scanMessage');
  const stopBtn = document.getElementById('scanStopBtn');
  const okBtn = document.getElementById('scanOkBtn');
  let onClosed = null;

  // onStop()：［やめる］を押したとき / closed()：結果を見て［OK］で閉じたとき
  function init({ onStop, closed }) {
    onClosed = closed;
    stopBtn.onclick = onStop;
    okBtn.onclick = () => { box.close(); onClosed(); };
    // Esc キーでは閉じない（検出中にうっかり閉じないように）
    box.addEventListener('cancel', (e) => e.preventDefault());
  }

  // 検出中（p：0〜1、note：添える一言）
  function progress(p, note) {
    title.textContent = 'ラリーを探しています… ' + Math.round(p * 100) + '%';
    bar.hidden = false;
    bar.value = p;
    message.textContent = note;
    stopBtn.hidden = false;
    okBtn.hidden = true;
    if (!box.open) box.showModal();
  }

  // 終わった（text：結果の文）
  function done(heading, text) {
    title.textContent = heading;
    bar.hidden = true;
    message.textContent = text;
    stopBtn.hidden = true;
    okBtn.hidden = false;
    if (!box.open) box.showModal();
  }

  // やめたとき：何も出さずに閉じる
  function hide() {
    if (box.open) box.close();
    onClosed();
  }

  return { init, progress, done, hide, isOpen: () => box.open };
})();
