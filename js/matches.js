// 試合ごとの記録を管理する。どの試合を見ているかもここで持つ。
// 1つの試合には動画を何本でも入れられる（1本で1試合／ラリーごとの短い動画、どちらでもいい）。
// 保存の仕組みは Store（storage.js）に任せる。
//
// 試合の形：{ id, name, videos: [{ key, name, lastModified }], records: [{ ..., videoKey }] }
//   key は動画の見分け用（ファイル名＋大きさ）。記録は videoKey で「どの動画の何秒目か」を持つ。
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

  // 動画は撮影した順（ファイルの日時）、同じならファイル名順に並べる
  function sortVideos(m) {
    m.videos.sort((a, b) => (a.lastModified - b.lastModified) || a.name.localeCompare(b.name));
  }

  // 記録は 動画の順 → 動画の中の時間 の順に並べる
  function sortRecords(m) {
    const order = new Map(m.videos.map((v, i) => [v.key, i]));
    const pos = (r) => (order.has(r.videoKey) ? order.get(r.videoKey) : -1);
    m.records.sort((a, b) => (pos(a) - pos(b)) || (a.time - b.time));
  }

  // 古い形（試合に動画が1本だけ：videoKey）の試合を、今の形（videos）に直す
  function normalize(m, upgrade) {
    // 記録の形を先に今の形にする（古い記録の変換で、動画の情報が消えないように）
    m.records = m.records.map(upgrade);
    if (!Array.isArray(m.videos)) {
      m.videos = m.videoKey ? [{ key: m.videoKey, name: m.name, lastModified: 0 }] : [];
      m.records.forEach((r) => { if (r.videoKey === undefined) r.videoKey = m.videoKey || null; });
      delete m.videoKey;
    }
    sortVideos(m);
    sortRecords(m);
    return m;
  }

  // その動画が入っている試合（どこにも入っていなければ null）
  function matchOfVideo(key) {
    return data.matches.find((m) => m.videos.some((v) => v.key === key)) || null;
  }

  // まだどの試合にも入っていない動画だけを、試合 m に足す
  function addNewVideos(m, videos) {
    videos.filter((v) => !matchOfVideo(v.key)).forEach((v) => m.videos.push(v));
    sortVideos(m);
    sortRecords(m);
  }

  return {
    // 読み込み。保存できる環境かどうかを返す
    // upgrade：古い形の記録を今の形に変える関数（記録の形のルールはここでは持たない）
    init(upgrade) {
      data = Store.load(KEY, data);
      // 分ける前の記録は「以前の記録」という試合にまとめる
      const old = Store.load(OLD_KEY, null);
      if (old && old.length > 0) {
        data.matches.push({ id: 'legacy', name: '以前の記録', videos: [], records: old });
        if (!data.currentId) data.currentId = 'legacy';
      }
      data.matches.forEach((m) => normalize(m, upgrade));
      const ok = save();
      if (ok) Store.remove(OLD_KEY);
      return ok;
    },

    // 書き出し用：全試合の記録（今見ている試合の情報は含めない）
    exportData() {
      return { app: 'badminton-analyzer', version: 2, matches: data.matches };
    },

    // 読み込んだ記録を、今の記録に足し合わせる（今ある記録は消さない）
    //   同じ試合（同じ id か、同じ動画が入っている）なら記録をまとめ、同じ記録は2つにしない
    //   新しい試合は追加する
    // 戻り値：{ ok: 保存できたか, added: 増えた記録の数 }。ファイルの形が違えば null
    importData(imported, upgrade) {
      if (!imported || !Array.isArray(imported.matches)) return null;
      let added = 0;
      imported.matches.forEach((raw) => {
        if (!raw || !Array.isArray(raw.records)) return;
        const im = normalize(Object.assign({}, raw), upgrade);
        const same = data.matches.find((m) => m.id === im.id) ||
                     im.videos.map((v) => matchOfVideo(v.key)).find(Boolean);
        if (same) {
          addNewVideos(same, im.videos);
          const ids = new Set(same.records.map((r) => r.id));
          im.records.filter((r) => !ids.has(r.id)).forEach((r) => { same.records.push(r); added++; });
          sortRecords(same);
        } else {
          data.matches.push({ id: im.id || String(Date.now()), name: im.name || '読み込んだ試合',
                              videos: im.videos, records: im.records });
          added += im.records.length;
        }
      });
      if (!data.currentId && data.matches.length > 0) data.currentId = data.matches[0].id;
      return { ok: save(), added };
    },

    // 選んだ動画の試合に切り替える
    //   選んだ動画が入っている試合があれば、そこに切り替えて、まだどこにも入っていない動画を足す
    //   どれも初めての動画なら、新しい試合を作る
    // videos：[{ key, name, lastModified }]
    openForVideos(videos) {
      const counts = new Map();
      videos.forEach((v) => {
        const m = matchOfVideo(v.key);
        if (m) counts.set(m, (counts.get(m) || 0) + 1);
      });
      let match = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m)[0];
      if (!match) {
        const name = videos[0].name + (videos.length > 1 ? ' ほか' + (videos.length - 1) + '本' : '');
        match = { id: String(Date.now()), name, videos: [], records: [] };
        data.matches.push(match);
      }
      addNewVideos(match, videos);
      data.currentId = match.id;
      return save();
    },

    // 今の試合に動画を足す（試合がなければ新しく作る）
    addVideos(videos) {
      const m = current();
      if (!m) return this.openForVideos(videos);
      addNewVideos(m, videos);
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

    // 今の試合の動画（撮影順）：[{ key, name }]
    videos() {
      const m = current();
      return m ? m.videos.map((v) => ({ key: v.key, name: v.name })) : [];
    },

    // 今の試合で、その動画に付いている記録の数
    recordCountOfVideo(key) {
      const m = current();
      return m ? m.records.filter((r) => r.videoKey === key).length : 0;
    },

    // 今の試合から動画を外す。その動画に付けた記録も一緒に消す（動画ファイル自体には触らない）
    removeVideo(key) {
      const m = current();
      if (!m) return save();
      m.videos = m.videos.filter((v) => v.key !== key);
      m.records = m.records.filter((r) => r.videoKey !== key);
      return save();
    },

    // 今の試合の動画の見分け用 key（撮影順）
    videoKeys() {
      const m = current();
      return m ? m.videos.map((v) => v.key) : [];
    },

    // 記録の動画が、今の試合の何本目か（1から）。動画が1本以下の試合や不明なら null
    videoNumber(record) {
      const m = current();
      if (!m || m.videos.length < 2) return null;
      const i = m.videos.findIndex((v) => v.key === record.videoKey);
      return i < 0 ? null : i + 1;
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
      sortRecords(m);
      return save();
    },

    removeRecord(id) {
      const m = current();
      if (m) m.records = m.records.filter((r) => r.id !== id);
      return save();
    },
  };
})();
