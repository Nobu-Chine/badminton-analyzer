// 手順の案内（stepGuide.js）の文と並び。ステップを増やす・文を変えるときは、このファイルだけ直す。
// id は stepGuide.js が「済んだかどうか」を見分けるのに使う（video / rally / side / record）。
// buttons の action は main.js が受け取って、その操作をする。
const StepGuideData = {
  steps: [
    {
      id: 'video',
      title: '動画を選ぶ',
      text: '試合の動画を選んでください',
      buttons: [{ label: '動画を選ぶ', action: 'chooseVideo', main: true }],
    },
    {
      id: 'rally',
      title: 'ラリーを区切る',
      text: 'この動画は RallyShot などで、ラリーだけを切り取ってつないだものですか？',
      buttons: [
        { label: 'はい → 自動で区切る', action: 'autoRally', main: true },
        { label: 'いいえ → 自分で区切る', action: 'manualRally' },
        { label: '区切らない', action: 'skipRally' },
      ],
    },
    {
      id: 'side',
      title: 'コートの向きを合わせる',
      text: '動画の中で、自分はどこにいますか？（あとからコートが入れ替わったら、その場面でコート図の上の「自分」を押し直します）',
      buttons: [
        { label: '上', action: 'side', orientation: 'vertical', side: 'left' },
        { label: '下', action: 'side', orientation: 'vertical', side: 'right' },
        { label: '左', action: 'side', orientation: 'horizontal', side: 'left' },
        { label: '右', action: 'side', orientation: 'horizontal', side: 'right' },
      ],
    },
    {
      id: 'record',
      title: '記録する',
      text: '「▶ 再生」を押して、シャトルが落ちたらコート図のその場所をタップしてください（自動で止まります）',
      buttons: [],
    },
  ],
  // 「自分で区切る」を選んだとき、あとのステップに一緒に出す一言
  manualRallyTip: 'ラリーが始まる場面で「＋ ラリー開始」を押すと、ラリーごとに飛べるようになります',
  closeLabel: 'この動画では案内を閉じる',
};
