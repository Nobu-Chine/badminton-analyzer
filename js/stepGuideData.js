// 手順の案内（stepGuide.js）の文と並び。ステップを増やす・文を変えるときは、このファイルだけ直す。
// id は stepGuide.js が「済んだかどうか」を見分けるのに使う（video / ready / rally / orientation / side / record）。
// number は並び順。同じ number は同じステップの続きとして出す（「ステップ 2／3」が2回）。
//   画面に出す番号と全体の数は、出すステップだけで数え直す（ラリーのステップを隠しても 1,2,3 になる）
// rallyTools: true のステップは、settings.js の showRallyTools が true のときだけ出す。
// buttons の action は main.js が受け取って、その操作をする。
const StepGuideData = {
  steps: [
    {
      id: 'video',
      number: 1,
      title: '動画を選ぶ',
      text: '試合の動画を選んでください',
      tip: '1試合を何本かに分けて撮ったときは、まとめて選べます（あとから「＋ 同じ試合の続きの動画を足す」で足すこともできます）',
      buttons: [
        { label: '動画を選ぶ', action: 'chooseVideo', main: true },
        { label: 'サンプルで試す', action: 'sample' },
      ],
    },
    {
      // 前に使った動画を開いたとき（番号なし）。今の準備の中身は summary で出す
      id: 'ready',
      title: 'この動画は準備ができています',
      text: '前に設定した内容で記録を続けられます',
      buttons: [
        { label: 'このまま記録する', action: 'keep', main: true },
        { label: '準備をやり直す', action: 'redo' },
      ],
    },
    {
      id: 'rally',
      number: 2,
      rallyTools: true,
      title: '動画の中のラリーを見つける',
      // 何のためのステップか（質問の前に出す）
      lead: 'ラリー（1点ごとのやりとり）の始まりを見つけておくと、「次のラリー ▶」で1点ずつ飛ばして見られます',
      text: 'この動画は、ラリーの合間（シャトルを拾う時間など）をカットして、ラリーの場面だけをつないだものですか？',
      buttons: [
        { label: 'はい → 自動で見つける', action: 'autoRally', main: true },
        { label: 'いいえ → 見ながら自分で印を付ける', action: 'manualRally' },
        { label: 'あとにする', action: 'skipRally' },
      ],
    },
    {
      id: 'orientation',
      number: 3,
      title: 'コートの向き',
      text: '動画のコートは、縦と横のどちらに映っていますか？',
      buttons: [
        { label: '縦', action: 'orientation', orientation: 'vertical' },
        { label: '横', action: 'orientation', orientation: 'horizontal' },
      ],
    },
    {
      id: 'side',
      number: 3,
      title: '自分の場所',
      text: '自分はどちらのコートにいますか？',
      // 縦か横かで、出すボタンを変える
      buttonsBy: {
        vertical: [
          { label: '上', action: 'side', side: 'left' },
          { label: '下', action: 'side', side: 'right' },
        ],
        horizontal: [
          { label: '左', action: 'side', side: 'left' },
          { label: '右', action: 'side', side: 'right' },
        ],
      },
      tip: 'コートチェンジしたら、その場面でコート図の上の「自分」を押して入れ替えます',
    },
    {
      id: 'record',
      number: 4,
      title: '記録する',
      text: '「▶ 再生」を押して、シャトルが落ちたらコート図のその場所をタップします（自動で止まります）',
      buttons: [{ label: 'はじめる', action: 'finish', main: true }],
    },
  ],
  // 「自分で印を付ける」を選んだとき、あとのステップに一緒に出す一言
  manualRallyTip: 'ラリーの始まりで「＋ ラリー開始」を押すと、ラリーごとに飛べます',
  closeLabel: '案内を閉じる',
  backLabel: '← 前に戻る',
  keepVideoLabel: '今の動画のまま進む →',
  // 前に使った動画の、今の準備の中身
  //   setup：{ rallyCount, orientation: '縦'|'横', side: '上'|'下'|'左'|'右' } / showRally：ラリーのことも書くか
  summary: (setup, showRally) => (showRally
    ? 'ラリー：' + (setup.rallyCount > 0 ? setup.rallyCount + '本見つけ済み' : 'まだ見つけていない') + '　／　' : '') +
    '向き：' + setup.orientation + '・自分が' + setup.side,
};
