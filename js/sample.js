// 「サンプルで試す」：サンプル動画を読み込んで、「動画を選ぶ」と同じ流れに渡すだけ。
// サンプルの中身（動画の場所・記録など）は sampleData.js。記録の入れ方は受け取った関数に任せる。
const Sample = (() => {
  const btn = document.getElementById('sampleBtn');

  // サンプルの使い方を出して開く（文は sampleData.js）
  function showGuide() {
    const g = SampleData.guide;
    document.getElementById('guideTitle').textContent = g.title;
    document.getElementById('guideNote').textContent = g.note;
    document.getElementById('guideMission').textContent = g.mission;
    const list = document.getElementById('guideSteps');
    list.innerHTML = '';
    g.steps.forEach((text) => list.appendChild(Object.assign(document.createElement('li'), { textContent: text })));
    const box = document.getElementById('guide');
    box.hidden = false;
    box.open = true;
  }

  // onLoaded()：サンプル動画を「動画を選ぶ」に渡したあと（記録やラリーの印を入れる）
  function init({ onLoaded }) {
    btn.onclick = async () => {
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = '読み込み中…';
      try {
        const res = await fetch(SampleData.url);
        if (!res.ok) throw new Error(res.status);
        const blob = await res.blob();
        const file = new File([blob], SampleData.fileName, { type: 'video/mp4', lastModified: SampleData.lastModified });
        // 自分で動画を選んだときと同じ処理を通す
        const input = document.getElementById('fileInput');
        const list = new DataTransfer();
        list.items.add(file);
        input.files = list.files;
        input.dispatchEvent(new Event('change'));
        onLoaded();
        showGuide(); // 何をすればいいか分かるように
      } catch (err) {
        alert('サンプル動画を読み込めませんでした。通信の状態を確かめて、もう一度押してください');
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    };
  }

  return { init };
})();
