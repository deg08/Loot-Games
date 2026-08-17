export const LEVEL_SCHEMA_VERSION = 1;
export const ROWS = 8;
export const COLS = 6;
export const MAX_CHAIN_LENGTH = 8;

const level = (id,title,type,goal,moves,target,maxValue,extras={}) => Object.freeze({
  schemaVersion:LEVEL_SCHEMA_VERSION,
  id,
  chapter:Math.ceil(id / 5),
  title,
  type,
  goal,
  moves,
  target,
  maxValue,
  ...extras
});

export const LEVELS = Object.freeze([
  level(1,'Набери 450 очков','score',450,10,10,4,{crates:1,crateHp:1}),
  level(2,'Собери 10 яблок','apples',10,11,11,4,{crates:2,crateHp:1}),
  level(3,'Разбей 3 ящика','crates',3,12,12,5,{crates:3,crateHp:1}),
  level(4,'Набери 900 очков','score',900,12,14,5,{crates:3,crateHp:1,bombEvery:4,fuse:4}),
  level(5,'Обезвредь 2 бомбы','bombs',2,13,15,5,{crates:3,crateHp:1,bombEvery:3,fuse:4,startBomb:true}),

  level(6,'Собери 16 яблок','apples',16,12,14,5,{crates:4,crateHp:1,bombEvery:4,fuse:4}),
  level(7,'Разбей 4 крепких ящика','crates',4,13,15,5,{crates:4,crateHp:2}),
  level(8,'Набери 1400 очков','score',1400,13,16,6,{crates:4,crateHp:2,bombEvery:4,fuse:3}),
  level(9,'Обезвредь 3 бомбы','bombs',3,14,16,6,{crates:4,crateHp:2,bombEvery:3,fuse:3,startBomb:true}),
  level(10,'Собери 22 яблока','apples',22,14,17,6,{crates:5,crateHp:2,bombEvery:3,fuse:3}),

  level(11,'Разбей 5 крепких ящиков','crates',5,14,17,6,{crates:5,crateHp:2,bombEvery:4,fuse:3}),
  level(12,'Набери 1900 очков','score',1900,14,18,6,{crates:5,crateHp:2,bombEvery:3,fuse:3}),
  level(13,'Обезвредь 4 бомбы','bombs',4,15,18,6,{crates:5,crateHp:2,bombEvery:3,fuse:3,startBomb:true}),
  level(14,'Собери 28 яблок','apples',28,15,19,7,{crates:6,crateHp:2,bombEvery:3,fuse:2}),
  level(15,'Финал: набери 2600 очков','score',2600,16,20,7,{crates:6,crateHp:3,bombEvery:2,fuse:2,startBomb:true})
]);

export function getLevelConfig(levelIndex) {
  return LEVELS[Math.max(0,Math.min(levelIndex,LEVELS.length - 1))];
}

export function validateLevel(levelConfig) {
  const errors = [];
  if (levelConfig.schemaVersion !== LEVEL_SCHEMA_VERSION) errors.push('unsupported schemaVersion');
  if (!Number.isInteger(levelConfig.id) || levelConfig.id < 1) errors.push('invalid id');
  if (!['score','apples','bombs','crates'].includes(levelConfig.type)) errors.push('invalid type');
  if (!(levelConfig.target > levelConfig.maxValue * 2)) errors.push('target must require at least three fruits');
  if (!(levelConfig.goal > 0)) errors.push('goal must be positive');
  if (!(levelConfig.moves > 0)) errors.push('moves must be positive');
  if ((levelConfig.crates || 0) >= ROWS * COLS) errors.push('too many crates');
  return errors;
}
