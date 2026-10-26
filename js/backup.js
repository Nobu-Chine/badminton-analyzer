// 記録のファイル書き出し・読み込み（ファイルのやり取りだけ）。中身の扱いは Matches に任せる。
const Backup = (() => {
  // getData()：書き出す中身を返す関数 / onLoad(data)：読み込んだ中身を受け取る関数
  function init({ getData, onLoad }) {
    document.getElementById('exportBtn').onclick = () => {
      const today = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'badminton-記録-' + today + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };

    const input = document.getElementById('importInput');
    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.value = ''; // 同じファイルをもう一度選べるように
      if (!file) return;
      let data = null;
      try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
      onLoad(data);
    });
  }

  return { init };
})();
