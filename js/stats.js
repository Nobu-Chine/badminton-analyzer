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

  const NONE = '（未選択）';

  // 記録から「何で分けるか」の値を取り出す関数（落ちた場所だけは位置から判定する）
  function valueFn(key, zoneOf) {
    if (key === 'zone') return (r) => zoneOf(r) || 'コート外';
    return (r) => r[key];
  }

  // 値を数えて、多い順に並べる → [{ label, count }]
  function countBy(records, valueOf) {
    const counts = {};
    records.forEach((r) => {
      const label = valueOf(r) || NONE;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  // records を集計する
  // scoreOf(record)：'得点' か '失点' / zoneOf(record)：落ちた場所（コート外は null）
  function summarize(records, { scoreOf, zoneOf }) {
    return {
      total: records.length,
      points: records.filter((r) => scoreOf(r) === '得点').length,
      losses: records.filter((r) => scoreOf(r) === '失点').length,
      sections: SECTIONS.map((s, index) => {
        const hit = records.filter(s.match);
        return {
          index,
          title: s.title,
          kind: s.kind,
          count: hit.length,
          groups: s.by.map((key) => ({
            key,
            label: BY_LABELS[key],
            items: countBy(hit, valueFn(key, zoneOf)),
          })),
        };
      }),
    };
  }

  // 集計の棒1本に当てはまる記録かどうかを判定する関数を返す（数え方と同じルール）
  //   choice：{ section: 区切りの番号, key: 何で分けたか, label: 棒の名前 }
  function filterFor({ section, key, label }, { zoneOf }) {
    const s = SECTIONS[section];
    const valueOf = valueFn(key, zoneOf);
    return (r) => !!s.match(r) && (valueOf(r) || NONE) === label;
  }

  return { summarize, filterFor };
})();
