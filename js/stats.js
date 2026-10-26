// 集計の計算だけを持つ（画面には触らない）。
// 集計の項目を増やす・変えるときは、下の SECTIONS を書き換えるだけでいい。
const Stats = (() => {
  // 何で分けて数えるか（記録の項目名 → 見出し）
  const BY_LABELS = {
    missType: 'ミスの種類',
    shot: 'ショット',
    zone: '落ちた場所',
    winType: '決まり方',
    setupShot: '甘かった球',
  };

  // 集計の区切り。kind は '得点' か '失点'（色分けに使う）
  const SECTIONS = [
    { title: '失点：自分のミス', kind: '失点',
      match: (r) => r.player === '自分' && r.outcome === 'ミス', by: ['missType', 'shot'] },
    { title: '失点：相手に決められた', kind: '失点',
      match: (r) => r.player === '相手' && r.outcome === '決まった', by: ['zone', 'shot', 'winType'] },
    { title: '失点：自分の甘い球を決められた', kind: '失点',
      match: (r) => r.player === '相手' && r.outcome === '決まった' && r.setupShot, by: ['setupShot'] },
    { title: '得点：自分が決めた', kind: '得点',
      match: (r) => r.player === '自分' && r.outcome === '決まった', by: ['shot', 'zone'] },
    { title: '得点：相手のミス', kind: '得点',
      match: (r) => r.player === '相手' && r.outcome === 'ミス', by: ['missType', 'shot'] },
    { title: '得点：相手の甘い球を決めた', kind: '得点',
      match: (r) => r.player === '自分' && r.outcome === '決まった' && r.setupShot, by: ['setupShot'] },
  ];

  // 値を数えて、多い順に並べる → [{ label, count }]
  function countBy(records, valueOf) {
    const counts = {};
    records.forEach((r) => {
      const label = valueOf(r) || '（未選択）';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  // records を集計する
  // scoreOf(record)：'得点' か '失点' / zoneOf(record)：落ちた場所（コート外は null）
  function summarize(records, { scoreOf, zoneOf }) {
    const valueOf = {
      zone: (r) => zoneOf(r) || 'コート外',
    };
    return {
      total: records.length,
      points: records.filter((r) => scoreOf(r) === '得点').length,
      losses: records.filter((r) => scoreOf(r) === '失点').length,
      sections: SECTIONS.map((s) => {
        const hit = records.filter(s.match);
        return {
          title: s.title,
          kind: s.kind,
          count: hit.length,
          groups: s.by.map((key) => ({
            label: BY_LABELS[key],
            items: countBy(hit, valueOf[key] || ((r) => r[key])),
          })),
        };
      }),
    };
  }

  return { summarize };
})();
