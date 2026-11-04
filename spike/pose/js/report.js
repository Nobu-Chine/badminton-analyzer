// 検証結果を、GitHub の PR などに貼り付けるための文章に整えるだけ（画面には触らない）。

// 端末の種類（ブラウザの情報から、だいたいで判断する）
function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'その他';
}

function fmt(sec) {
  const s = Math.floor(sec || 0);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// info：{ videoName, duration, from, to, modelLabel, avgCost, tiles, fps, summary }
//   summary は tracker.summary() の結果
export function buildReport(info) {
  const s = info.summary;
  const zones = ['ネット前', '中盤', 'コート奥', 'コート外'];
  const zoneShort = { ネット前: 'ネット前', 中盤: '中盤', コート奥: '奥', コート外: '外' };
  const player = (name) => {
    const p = s[name];
    const found = s.frames ? Math.round(p.seen / s.frames * 100) : 0;
    return name + '：移動 ' + p.distance.toFixed(1) + 'm／見つけた割合 ' + found + '%／' +
      zones.map((z) => zoneShort[z] + (p.share[z] || 0) + '%').join(' ');
  };
  return [
    '【動き解析 検証結果】',
    '動画：' + info.videoName + '（全体 ' + fmt(info.duration) + '、' + fmt(info.from) + '〜' + fmt(info.to) + ' を解析）',
    'AI：' + info.modelLabel + '／端末：' + deviceName(),
    '1コマ ' + Math.round(info.avgCost) + 'ms（タイル' + info.tiles + '枚）・1秒に約' + info.fps.toFixed(1) + 'コマ・解析 ' + s.frames + 'コマ',
    '見つかった人 平均' + s.avgDetected.toFixed(1) + '人、うち対象のコート内 ' + s.avgInCourt.toFixed(1) + '人',
    player('自分'),
    player('相手'),
    'メモ：（ここに条件を書き足す：奥のコート、別の体育館、服の色が似ている など）',
  ].join('\n');
}
