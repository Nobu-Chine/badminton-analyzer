// ブラウザ内への保存と読み込みの仕組みだけを持つ（localStorage＝ブラウザ内の保存場所。閉じても残る）
// 何を保存するかは知らない。保存できたかどうかを true / false で返すだけ。
const Store = {
  load(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  },

  // 保存できない開き方（data: など）でも、画面上の記録は続けられるように例外を握りつぶす
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* 保存できない環境では何もしない */ }
  },
};
