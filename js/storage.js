// 記録の保存と読み込み（localStorage＝ブラウザ内の保存場所。閉じても残る）
// 画面には触らない。保存できたかどうかを true / false で返すだけ。
const RecordStore = (() => {
  const KEY = 'badminton-records';
  let records = [];

  // 保存できない開き方（data: など）でも、画面上の記録は続けられるように例外を握りつぶす
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    // 読み込み。保存できる環境かどうかを返す
    // upgrade：古い形の記録を今の形に変える関数（形のルールは storage では持たない）
    init(upgrade) {
      try { records = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { records = []; }
      records = records.map(upgrade);
      return persist();
    },
    all() {
      return records;
    },
    add(record) {
      record.id = Date.now();
      records.push(record);
      records.sort((a, b) => a.time - b.time);
      return persist();
    },
    remove(id) {
      records = records.filter((r) => r.id !== id);
      return persist();
    },
  };
})();
