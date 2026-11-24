// 手順の案内（stepGuide.js）の文と並び。ステップを増やす・文を変えるときは、このファイルだけ直す。
// id は stepGuide.js が「済んだかどうか」を見分けるのに使う（video / rally / orientation / side / record）。
// number が同じものは、同じステップの続きとして出す（「ステップ 3／4」が2回）。
// buttons の action は main.js が受け取って、その操作をする。
const StepGuideData = {
  total: 4,
  steps: [
    {
      id: 'video',
      number: 1,
      title: '動画を選ぶ',
      text: '試合の動画を選んでください',
      buttons: [
        { label: '動画を選ぶ', action: 'chooseVideo', main: true },
        { label: 'サンプルで試す', action: 'sample' },
      ],
    },
    {
      id: 'rally',
      number: 2,
      title: 'ラリーを区切る',
      text: 'この動画は RallyShot などで、ラリーだけを切り取ってつないだものですか？',
      buttons: [
        { label: 'はい → 自動で区切る', action: 'autoRally', main: true },
        { label: 'いいえ → 自分で区切る', action: 'manualRally' },
        { label: '区切らない', action: 'skipRally' },
      ],
    },
    {
      id: 'orientation',
      number: 3,
      title: 'コートの向き',
      text: '動画のコートは、縦と横のどちらに映っていますか？',
      buttons: [
        { label: '縦（後ろから撮影）', action: 'orientation', orientation: 'vertical' },
        { label: '横（横から撮影）', action: 'orientation', orientation: 'horizontal' },
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
  // 「自分で区切る」を選んだとき、あとのステップに一緒に出す一言
  manualRallyTip: 'ラリーの始まりで「＋ ラリー開始」を押すと、ラリーごとに飛べます',
  closeLabel: '案内を閉じる',
  // 前に済ませたステップを飛ばしたときの一言（numbers：飛ばしたステップの番号）
  skippedNote: (numbers) => 'この動画は、前にステップ' + numbers.join('・') + 'を済ませているので飛ばしました',
};
