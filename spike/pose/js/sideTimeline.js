// コートチェンジ：自分が画面の左右どちらにいるかを、動画の時間ごとに持つ（計算だけ）。
// 本体の matches.js（sideAt / setSide）と同じルール。試作なので、ここにもう一度書いている。
//   points：[{ time, side }]（時間順、side は 'left' か 'right'）。「その時間から、自分はこちら側」
export function createSideTimeline(defaultSide = 'right') {
  let points = [];

  // 時間順に並べ、前と同じ向きの点（意味のない点）を除く
  function clean(list) {
    const result = [];
    list.slice().sort((a, b) => a.time - b.time).forEach((p) => {
      if (result.length === 0 || result[result.length - 1].side !== p.side) result.push(p);
    });
    return result;
  }

  return {
    // その時間に、自分は左右どちらにいるか
    sideAt(time) {
      if (points.length === 0) return defaultSide;
      const hit = points.filter((p) => p.time <= time + 0.05).pop();
      return (hit || points[0]).side;
    },

    // その時間から、自分は side 側（コートチェンジ）
    //   1秒以内にある設定は置き換える
    //   初めて押したのが動画の途中なら、それより前は反対側だったとみなす
    set(time, side) {
      let list = points.filter((p) => Math.abs(p.time - time) > 1);
      if (list.length === 0) {
        if (time <= 2) time = 0;
        else list.push({ time: 0, side: side === 'left' ? 'right' : 'left' });
      }
      list.push({ time, side });
      points = clean(list);
    },

    // index 番目のコートチェンジを消す
    remove(index) {
      const list = points.slice();
      list.splice(index, 1);
      points = clean(list);
    },

    reset() { points = []; },
    list: () => points.map((p) => ({ time: p.time, side: p.side })),
  };
}
