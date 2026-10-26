// 試合の切り替え（画面の表示だけ）
const MatchPicker = (() => {
  const select = document.getElementById('matchSelect');

  // onChange(id)：別の試合が選ばれたとき
  function init(onChange) {
    select.addEventListener('change', () => onChange(select.value));
  }

  // matches：[{ id, name, count }] / currentId：今見ている試合
  function render(matches, currentId) {
    select.innerHTML = '';
    if (matches.length === 0) {
      select.appendChild(new Option('動画を選ぶと試合が作られます', ''));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    if (!currentId) select.appendChild(new Option('試合を選んでください', ''));
    matches.forEach((m) => {
      select.appendChild(new Option(m.name + '（' + m.count + '件）', m.id));
    });
    select.value = currentId || '';
  }

  return { init, render };
})();
