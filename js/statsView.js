// 集計の表示だけを持つ。数字の計算は Stats（stats.js）に任せる。
const StatsView = (() => {
  const box = document.getElementById('stats');
  const scope = document.getElementById('statsScope');

  let onPick = null;

  // onScopeChange('match' | 'all')：「この試合／全試合」が切り替わったとき
  // onSelect(choice)：棒が押されたとき。choice は { section, key, label, description }
  function init({ onScopeChange, onSelect }) {
    onPick = onSelect;
    scope.addEventListener('change', () => onScopeChange(scope.value));
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // 1つの内訳（例：ショット別）を、横棒と数で表示する。棒を押すと、その場面に絞り込む
  function renderGroup(section, group, max) {
    const kind = section.kind;
    const wrap = el('div', 'stats-group');
    wrap.appendChild(el('div', 'stats-group-label', group.label));
    group.items.forEach((item) => {
      const row = el('button', 'stats-row');
      row.type = 'button';
      row.title = item.label + '：' + item.count + '回（押すと、この場面だけを一覧に出します）';
      row.onclick = () => onPick({
        section: section.index,
        key: group.key,
        label: item.label,
        description: section.title + '／' + group.label + '：' + item.label,
      });
      row.appendChild(el('span', 'stats-name', item.label));
      const track = el('span', 'stats-track');
      const bar = el('span', 'stats-bar ' + (kind === '得点' ? 'point' : 'miss'));
      bar.style.width = (item.count / max * 100) + '%';
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('span', 'stats-count', item.count));
      wrap.appendChild(row);
    });
    return wrap;
  }

  // 弱点のひとこと（weakness：Weakness.find の結果）。文を押すと、棒と同じくその場面を順に再生する
  function renderWeakness(weakness) {
    const wrap = el('div', 'weakness');
    wrap.appendChild(el('div', 'weakness-title', '弱点のひとこと'));
    if (!weakness.ready) {
      wrap.appendChild(el('p', 'weakness-wait', 'あと' + weakness.need + '点、失点を記録すると、ここにいちばん多い失点の傾向が出ます'));
      return wrap;
    }
    if (weakness.lines.length === 0) {
      wrap.appendChild(el('p', 'weakness-wait', 'まだ目立つ傾向はありません（同じ失点が2回以上あると出ます）'));
      return wrap;
    }
    weakness.lines.forEach((line) => {
      const b = el('button', 'weakness-line', line.text);
      b.type = 'button';
      b.title = '押すと、この場面だけを順に再生します';
      b.onclick = () => onPick(line.choice);
      wrap.appendChild(b);
    });
    return wrap;
  }

  // summary：Stats.summarize の結果 / weakness：Weakness.find の結果
  function render(summary, weakness) {
    box.innerHTML = '';
    if (summary.total === 0) {
      box.appendChild(el('p', 'empty', 'まだ記録はありません'));
      return;
    }
    box.appendChild(renderWeakness(weakness));

    // 合計（得点・失点）
    const tiles = el('div', 'stats-tiles');
    [['得点', summary.points, 'point'], ['失点', summary.losses, 'miss']].forEach(([label, n, cls]) => {
      const tile = el('div', 'stats-tile');
      tile.appendChild(el('div', 'stats-tile-label ' + cls, label));
      tile.appendChild(el('div', 'stats-tile-value', n));
      tiles.appendChild(tile);
    });
    box.appendChild(tiles);

    // 区切りごとの内訳（記録がない区切りは出さない）
    summary.sections.filter((s) => s.count > 0).forEach((s) => {
      const sec = el('section', 'stats-section');
      sec.appendChild(el('h3', '', s.title + '（' + s.count + '回）'));
      // 同じ区切りの中は、同じものさしで棒の長さを比べる
      const max = Math.max(...s.groups.flatMap((g) => g.items.map((i) => i.count)));
      s.groups.forEach((g) => sec.appendChild(renderGroup(s, g, max)));
      box.appendChild(sec);
    });
  }

  return { init, render, scope: () => scope.value };
})();
