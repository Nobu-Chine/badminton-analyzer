// 記録のルール：得点か失点かの判定、どの項目を使うか、入力の必須項目、古い記録の変換。
// ルールを変えるときは、このファイルだけ直せばいい。
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

  // 今の入力内容では使わない項目（入力画面では隠して、値も消す）
  //   ミスの種類：「ミス」のときだけ
  //   きっかけ：「決まった」のときだけ
  //   甘かった球：「前の球が甘かった」を選んだときだけ
  function inactiveKeys(draft) {
    const keys = [];
    if (draft.outcome !== 'ミス') keys.push('missType');
    if (draft.outcome !== '決まった') keys.push('setup');
    if (draft.outcome !== '決まった' || !draft.setup) keys.push('setupShot');
    return keys;
  }

  // まだ選ばれていない必須項目の名前を返す（コースときっかけは選ばなくてもいい）
  function missingItems(draft) {
    const inactive = inactiveKeys(draft);
    const list = [];
    if (!draft.player) list.push('誰のプレー');
    if (!draft.shot) list.push('ショットの種類');
    if (!draft.outcome) list.push('どうなった');
    if (!inactive.includes('missType') && !draft.missType) list.push('ミスの種類');
    if (!inactive.includes('setupShot') && !draft.setupShot) list.push('甘かった球');
    return list;
  }

  // 前の形（result: 得点／ミス）で保存した記録を、今の形に変換する。
  // 前の記録はすべて「自分のショット」として扱う。
  function upgrade(record) {
    if (record.player) return record;
    const old = { ネット: 'ネットにかける' };
    return {
      id: record.id,
      time: record.time,
      x: record.x,
      y: record.y,
      player: '自分',
      shot: record.shot,
      course: null,
      outcome: record.result === '得点' ? '決まった' : 'ミス',
      missType: record.missType ? (old[record.missType] || record.missType) : null,
    };
  }

  return { score, setupBy, inactiveKeys, missingItems, upgrade };
})();
