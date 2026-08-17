export const ROWS = 8;
export const COLS = 6;
export const MAX_CHAIN_LENGTH = 8;

export const LEVELS = Object.freeze([
  { title:'Набери 600 очков', type:'score', goal:600, moves:10, target:10, maxValue:4, crates:2, crateHp:1 },
  { title:'Собери 12 яблок', type:'apples', goal:12, moves:12, target:12, maxValue:5, crates:3, crateHp:1, bombEvery:4, fuse:4 },
  { title:'Набери 1200 очков', type:'score', goal:1200, moves:12, target:14, maxValue:5, crates:3, crateHp:2, bombEvery:3, fuse:3 },
  { title:'Обезвредь 3 бомбы', type:'bombs', goal:3, moves:14, target:16, maxValue:5, crates:4, crateHp:2, bombEvery:3, fuse:3, startBomb:true },
  { title:'Набери 1800 очков', type:'score', goal:1800, moves:14, target:18, maxValue:6, crates:5, crateHp:2, bombEvery:3, fuse:2 }
]);

export function getLevelConfig(levelIndex) {
  if (levelIndex < LEVELS.length) return LEVELS[levelIndex];
  const round = levelIndex - LEVELS.length + 1;
  const goal = 1900 + round * 300;
  return { title:`Набери ${goal} очков`, type:'score', goal, moves:14, target:18, maxValue:6, crates:5, crateHp:2, bombEvery:2, fuse:2, startBomb:true };
}
