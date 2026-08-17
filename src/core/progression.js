export function calculateStars(movesLeft,totalMoves) {
  const ratio = totalMoves > 0 ? movesLeft / totalMoves : 0;
  if (ratio >= .5) return 3;
  if (ratio >= .25) return 2;
  return 1;
}

export function missionProgress(type,{score=0,apples=0,bombs=0,crates=0}={}) {
  if (type === 'apples') return apples;
  if (type === 'bombs') return bombs;
  if (type === 'crates') return crates;
  return score;
}
