// 選んだ動画ファイルの管理：どのファイルを読み込んだか、今の試合での並び、今どれを再生しているか。
// 動画の中身はブラウザの中で一時的に読むだけ（どこにも保存しない）。ページを閉じると選び直しになる。
const Clips = (() => {
  const files = new Map(); // key → File（このページを開いている間だけ）
  let order = [];          // 今の試合の動画 key（撮影順）
  let index = -1;          // order の中で、今再生している位置
  let onClipChange = null;

  // 動画ファイルの見分け方：同じ名前の別動画と混ざらないよう、名前と大きさで見分ける
  function keyOf(file) {
    return file.name + '|' + file.size;
  }

  function infoOf(file) {
    return { key: keyOf(file), name: file.name, lastModified: file.lastModified || 0 };
  }

  // 「◀ 前の動画｜動画 3 / 20｜次の動画 ▶」の表示。動画が2本以上のときだけ出す
  function renderNav() {
    const nav = document.getElementById('clipNav');
    nav.hidden = order.length < 2;
    document.getElementById('clipLabel').textContent =
      index < 0 ? '動画 − / ' + order.length : '動画 ' + (index + 1) + ' / ' + order.length;
    // 前後に、読み込み済みの動画があるときだけ押せる
    document.getElementById('prevClipBtn').disabled = findLoaded(index, -1) < 0;
    document.getElementById('nextClipBtn').disabled = findLoaded(index, 1) < 0;
  }

  // from から step 方向に、読み込み済みの動画を探す（なければ -1）
  function findLoaded(from, step) {
    for (let i = from + step; i >= 0 && i < order.length; i += step) {
      if (files.has(order[i])) return i;
    }
    return -1;
  }

  function moveTo(i) {
    index = i;
    renderNav();
    onClipChange(i < 0 ? null : files.get(order[i]));
  }

  // onFilesChosen(videos, mode)：ファイルが選ばれたとき。videos は [{ key, name, lastModified }]（撮影順）
  //   mode は 'open'（動画を選ぶ）か 'add'（この試合に動画を追加）
  // onChange(file)：再生する動画が変わったとき（なくなったら null）
  function init({ onFilesChosen, onChange }) {
    onClipChange = onChange;
    [['fileInput', 'open'], ['addVideoInput', 'add']].forEach(([id, mode]) => {
      const input = document.getElementById(id);
      input.addEventListener('change', () => {
        const chosen = [...input.files];
        input.value = ''; // 同じファイルをもう一度選べるように
        if (chosen.length === 0) return;
        chosen.forEach((f) => files.set(keyOf(f), f));
        const videos = chosen.map(infoOf)
          .sort((a, b) => (a.lastModified - b.lastModified) || a.name.localeCompare(b.name));
        onFilesChosen(videos, mode);
      });
    });
    document.getElementById('prevClipBtn').onclick = () => {
      const i = findLoaded(index, -1);
      if (i >= 0) moveTo(i);
    };
    document.getElementById('nextClipBtn').onclick = () => {
      const i = findLoaded(index, 1);
      if (i >= 0) moveTo(i);
    };
  }

  // 今の試合の動画の並びを受け取る。preferKey があればその動画を、なければ最初の読み込み済み動画を出す
  function setOrder(keys, preferKey) {
    const before = index < 0 ? null : order[index];
    order = keys;
    let i = preferKey && files.has(preferKey) ? order.indexOf(preferKey) : -1;
    if (i < 0) i = findLoaded(-1, 1);
    // 同じ動画のままなら読み込み直さない（再生位置がリセットされないように）
    if (i >= 0 && order[i] === before) {
      index = i;
      renderNav();
      return;
    }
    moveTo(i);
  }

  // その動画に切り替える。読み込まれていなければ false
  function show(key) {
    const i = order.indexOf(key);
    if (i < 0 || !files.has(key)) return false;
    if (i !== index) moveTo(i);
    return true;
  }

  return {
    init,
    setOrder,
    show,
    has: (key) => files.has(key),
    currentKey: () => (index < 0 ? null : order[index]),
    // 今の試合の動画のうち、まだ選ばれていない本数
    missingCount: () => order.filter((k) => !files.has(k)).length,
    total: () => order.length,
  };
})();
