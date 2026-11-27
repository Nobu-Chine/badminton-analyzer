// 弱点のひとこと：集計の結果（Stats.summarize）から、いちばん目立つ失点の傾向を短い文にする。
// 計算だけを持つ（画面には触らない）。何点たまったら出すかは settings.js の weakness。
// どの区切り・内訳を使うかは下の RULES。増やす・変えるときはここだけ書き換える。
const Weakness = (() => {
  const NONE = '（未選択）';

  // section：Stats の区切りの番号 / key：内訳 / text(名前, 回数, 失点の合計)：文
  const RULES = [
    { section: 0, key: 'cause', text: (name, n, losses) => '失点' + losses + '点のうち、いちばん多い原因は「' + name + '」（' + n + '点）' },
    { section: 1, key: 'shot', text: (name, n) => '自分のミスは「' + name + '」がいちばん多い（' + n + '回）' },
    { section: 2, key: 'zone', text: (name, n) => '相手に決められたのは「' + name + '」がいちばん多い（' + n + '回）' },
  ];

  // 内訳の中でいちばん多いもの（同じ数なら「A」「B」と並べる）。少なすぎるときは null
  function topOf(group, minCount) {
    const items = group.items.filter((i) => i.label !== NONE);
    if (items.length === 0 || items[0].count < minCount) return null;
    const best = items.filter((i) => i.count === items[0].count);
    return { names: best.map((i) => i.label), first: best[0].label, count: best[0].count };
  }

  // 戻り値：{ ready: 出せるか, need: あと何点で出せるか, lines: [{ text, choice }] }
  //   choice は集計の棒と同じ形（押すとその場面を順に再生するため）
  function find(summary, opt = Settings.weakness) {
    if (summary.losses < opt.minLosses) return { ready: false, need: opt.minLosses - summary.losses, lines: [] };
    const lines = [];
    RULES.forEach((rule) => {
      const sec = summary.sections[rule.section];
      const group = sec && sec.groups.find((g) => g.key === rule.key);
      const top = group && topOf(group, opt.minCount);
      if (!top) return;
      lines.push({
        text: rule.text(top.names.join('」「'), top.count, summary.losses),
        choice: { section: sec.index, key: group.key, label: top.first,
          description: sec.title + '／' + group.label + '：' + top.first },
      });
    });
    return { ready: true, need: 0, lines };
  }

  return { find };
})();
