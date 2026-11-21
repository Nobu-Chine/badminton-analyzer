// 「サンプルで試す」の中身。差し替えるときは、このファイルと sample/ の動画だけ直せばいい。
// 今は真っ暗・無音の動画（人が写らないもの）。記録とラリーの印は、操作を試すための作り物。
// 位置はメートル（x：コートの幅 0〜5.18、y：ネットが 0、自分のコートがプラス・相手のコートがマイナス）
const SampleData = {
  url: 'sample/sample.mp4',
  fileName: 'サンプル動画.mp4', // 真っ暗・無音
  lastModified: 1763683200000, // 2025-11-21。いつ開いても同じ動画として扱うため固定

  // ラリーの始まり（秒）
  rallies: [3, 18, 33, 48, 65, 80, 95, 112, 128, 146, 162],

  // 記録（11件：得点3・失点8）
  records: [
    { time: 12, x: 2.5, y: -7.0, player: '自分', shot: 'クリア', outcome: 'ミス', missType: 'バックアウト',
      cause: 'ショット自体', memo: 'クリアが長すぎた' },
    { time: 27, x: 1.0, y: 4.5, player: '相手', shot: 'スマッシュ', outcome: '決まった', winType: '取れなかった',
      cause: '甘い球を上げた', setupShot: 'ロブ' },
    { time: 41, x: 4.2, y: -1.2, player: '自分', shot: 'プッシュ', outcome: '決まった' },
    { time: 58, x: 0.8, y: 1.2, player: '相手', shot: 'ドロップ', outcome: '決まった', winType: '取れなかった',
      cause: '動きが遅れた', memo: '後ろから前への戻りが遅い' },
    { time: 74, x: 5.6, y: -5.0, player: '相手', shot: 'クリア', outcome: 'ミス', missType: 'サイドアウト' },
    { time: 89, x: 2.6, y: 0.3, player: '自分', shot: 'ドロップ', outcome: 'ミス', missType: 'ネットにかける',
      cause: 'ショット自体' },
    { time: 103, x: 3.8, y: 5.8, player: '相手', shot: 'スマッシュ', outcome: '決まった', winType: '触ったが返せなかった',
      cause: '相手が上手い' },
    { time: 121, x: 1.5, y: -4.0, player: '自分', shot: 'スマッシュ', outcome: '決まった' },
    { time: 138, x: 4.5, y: 1.5, player: '相手', shot: 'プッシュ', outcome: '決まった', winType: '取れなかった',
      cause: '甘い球を上げた', setupShot: 'ピン', memo: 'ピンが浮いた' },
    { time: 156, x: 2.0, y: -7.1, player: '自分', shot: 'ロブ', outcome: 'ミス', missType: 'バックアウト',
      cause: '動きが遅れた' },
    { time: 171, x: 0.6, y: 1.0, player: '相手', shot: 'カット', outcome: '決まった', winType: '取れなかった',
      cause: '動きが遅れた' },
  ],
};
