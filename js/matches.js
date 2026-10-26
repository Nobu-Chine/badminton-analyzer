// 試合ごとの記録を管理する。どの試合を見ているかもここで持つ。
// 保存の仕組みは Store（storage.js）に任せる。
const Matches = (() => {
  const KEY = 'badminton-matches';
  const OLD_KEY = 'badminton-records'; // 試合ごとに分ける前の保存場所
  let data = { currentId: null, matches: [] };

  function save() {
    return Store.save(KEY, data);
  }

  function current() {
    return data.matches.find((m) => m.id === data.currentId) || null;
  }

  // 動画ファイルの見分け方：同じ名前の別動画と混ざらないよう、名前と大きさで見分ける
  function videoKey(file) {
    return file.name + '|' + file.size;
  }

  return {
    // 読み込み。保存できる環境かどうかを返す
    // upgrade：古い形の記録を今の形に変える関数（形のルールはここでは持たない）
    init(upgrade) {
      data = Store.load(KEY, data);
      // 分ける前の記録は「以前の記録」という試合にまとめる
      const old = Store.load(OLD_KEY, null);
      if (old && old.length > 0) {
        data.matches.push({ id: 'legacy', name: '以前の記録', videoKey: null, records: old });
        if (!data.currentId) data.currentId = 'legacy';
      }
      data.matches.forEach((m) => { m.records = m.records.map(upgrade); });
      const ok = save();
      if (ok) Store.remove(OLD_KEY);
      return ok;
    },

    // 書き出し用：全試合の記録（今見ている試合の情報は含めない）
    exportData() {
      return { app: 'badminton-analyzer', version: 1, matches: data.matches };
    },

    // 読み込んだ記録を、今の記録に足し合わせる（今ある記録は消さない）
    //   同じ試合（同じ動画）なら記録をまとめ、同じ記録は2つにしない
    //   新しい試合は追加する
    // 戻り値：{ ok: 保存できたか, added: 増えた記録の数 }。ファイルの形が違えば null
    importData(imported, upgrade) {
      if (!imported || !Array.isArray(imported.matches)) return null;
      let added = 0;
      imported.matches.forEach((im) => {
        if (!im || !Array.isArray(im.records)) return;
        const records = im.records.map(upgrade);
        const same = data.matches.find((m) => m.id === im.id || (im.videoKey && m.videoKey === im.videoKey));
        if (same) {
          const ids = new Set(same.records.map((r) => r.id));
          records.filter((r) => !ids.has(r.id)).forEach((r) => { same.records.push(r); added++; });
          same.records.sort((a, b) => a.time - b.time);
        } else {
          data.matches.push({ id: im.id || String(Date.now()), name: im.name || '読み込んだ試合',
                              videoKey: im.videoKey || null, records });
          added += records.length;
        }
      });
      if (!data.currentId && data.matches.length > 0) data.currentId = data.matches[0].id;
      return { ok: save(), added };
    },

    // 選んだ動画の試合に切り替える。初めての動画なら新しい試合を作る
    openForVideo(file) {
      const key = videoKey(file);
      let match = data.matches.find((m) => m.videoKey === key);
      if (!match) {
        match = { id: String(Date.now()), name: file.name, videoKey: key, records: [] };
        data.matches.push(match);
      }
      data.currentId = match.id;
      return save();
    },

    select(id) {
      data.currentId = id;
      return save();
    },

    list() {
      return data.matches.map((m) => ({ id: m.id, name: m.name, count: m.records.length }));
    },

    currentId() {
      return data.currentId;
    },

    // 今見ている試合の記録（試合がなければ空）
    records() {
      const m = current();
      return m ? m.records : [];
    },

    // 全試合の記録をまとめたもの（集計用）
    allRecords() {
      return data.matches.flatMap((m) => m.records);
    },

    addRecord(record) {
      const m = current();
      if (!m) return save();
      record.id = Date.now();
      m.records.push(record);
      m.records.sort((a, b) => a.time - b.time);
      return save();
    },

    removeRecord(id) {
      const m = current();
      if (m) m.records = m.records.filter((r) => r.id !== id);
      return save();
    },
  };
})();
