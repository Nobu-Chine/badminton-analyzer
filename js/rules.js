// 記録のルール。ルールを変えるときは、このファイルだけ直せばいい。
//
// 基本ルール：「誰が」と「ショット」は、いつも最後にシャトルを打った人とその球。
//   決まった：打った球を相手が返せなかった（取れなかった／触ったが返せなかった）
//   ミス　　：打った人の失敗（ネットにかける／アウト など）
const Rules = (() => {
  // 誰が・どうなったか で得点／失点が決まる
  //   自分が決めた → 得点   自分がミス → 失点
  //   相手が決めた → 失点   相手がミス → 得点
  function score(record) {
    const mine = record.player === '自分';
    const won = record.outcome === '決まった';
    return mine === won ? '得点' : '失点';
  }

  // 前の球を打ったのは、決めた人の相手
  function setupBy(record) {
    return record.player === '自分' ? '相手' : '自分';
  }

  // 落ちた場所（タップした位置）から、ネット前／中盤／コート奥を判定する。コートの外なら null
  // 座標はネットが y=0。相手コートでも自分コートでも、ネットからの距離で考える
  function zone(record) {
    const c = Settings.court;
    const depth = Math.abs(record.y);
    if (record.x < 0 || record.x > c.width || depth > c.half) return null;
    if (depth <= c.shortLine) return 'ネット前';
    if (depth >= c.half * (1 - Settings.backZoneRatio)) return 'コート奥';
    return '中盤';
  }

  // 今の入力内容では使わない項目（入力画面では隠して、値も消す）
  //   決まり方・きっかけ：「決まった」のときだけ
  //   ミスの種類：「ミス」のときだけ
  //   甘かった球：「前の球が甘かった」を選んだときだけ
  function inactiveKeys(draft) {
    const keys = [];
    if (draft.outcome !== '決まった') keys.push('winType', 'setup');
    if (draft.outcome !== 'ミス') keys.push('missType');
    if (draft.outcome !== '決まった' || !draft.setup) keys.push('setupShot');
    return keys;
  }

  // まだ選ばれていない必須項目の名前を返す（コース・決まり方・きっかけは選ばなくてもいい）
  function missingItems(draft) {
    const inactive = inactiveKeys(draft);
    const list = [];
    if (!draft.player) list.push('誰が');
    if (!draft.shot) list.push('ショットの種類');
    if (!draft.outcome) list.push('どうなった');
    if (!inactive.includes('missType') && !draft.missType) list.push('ミスの種類');
    if (!inactive.includes('setupShot') && !draft.setupShot) list.push('甘かった球');
    return list;
  }

  // 古い形で保存した記録を、今の形に変換する
  function upgrade(record) {
    let r = record;

    // 1. いちばん最初の形（result: 得点／ミス）→ すべて「自分のショット」として扱う
    if (!r.player) {
      const old = { ネット: 'ネットにかける' };
      r = {
        id: r.id, time: r.time, x: r.x, y: r.y,
        player: '自分',
        shot: r.shot,
        course: null,
        outcome: r.result === '得点' ? '決まった' : 'ミス',
        missType: r.missType ? (old[r.missType] || r.missType) : null,
      };
    }

    // 2. 「拾えなかった」を自分のミスとして付けていた形
    //    → 最後に打ったのは相手で、その球が決まった、に直す（ショットはもともと飛んできた球）
    const notReturned = {
      'ネット前に落ちる': '取れなかった',
      'コート奥に落ちる': '取れなかった',
      'レシーブミス': '触ったが返せなかった',
    };
    if (r.outcome === 'ミス' && notReturned[r.missType]) {
      r = Object.assign({}, r, {
        player: setupBy(r), // 自分 ↔ 相手 を入れ替える
        outcome: '決まった',
        winType: notReturned[r.missType],
        missType: null,
      });
    }
    return r;
  }

  return { score, setupBy, zone, inactiveKeys, missingItems, upgrade };
})();
