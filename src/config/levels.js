export const LEVEL_SCHEMA_VERSION = 2;
export const ROWS = 8;
export const COLS = 6;
export const MAX_CHAIN_LENGTH = 9;
export const LEVELS_PER_CHAPTER = 10;
export const CAMPAIGN_LEVEL_COUNT = 100;

export const CHAPTERS = Object.freeze([
  {id:1,title:'Сочный старт',emoji:'🍊',unlock:'Цепочки и яблоки'},
  {id:2,title:'Ящичный порт',emoji:'📦',unlock:'Крепкие ящики'},
  {id:3,title:'Морозная роща',emoji:'🧊',unlock:'Замороженные фрукты'},
  {id:4,title:'Фитильный сад',emoji:'💣',unlock:'Бомбы'},
  {id:5,title:'Радужная долина',emoji:'🌈',unlock:'Длинные цепочки'},
  {id:6,title:'Ледяной склад',emoji:'❄️',unlock:'Двойной лёд'},
  {id:7,title:'Шторм урожая',emoji:'⛈️',unlock:'Смешанные задачи'},
  {id:8,title:'Ночной рынок',emoji:'🌙',unlock:'Мало ходов'},
  {id:9,title:'Королевский сад',emoji:'👑',unlock:'Крепкие преграды'},
  {id:10,title:'Фруктовый космос',emoji:'🚀',unlock:'Финальные испытания'}
]);

const plural = (value,one,few,many) => {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

const TYPE_TITLES = Object.freeze({
  score:goal => `Набери ${goal} ${plural(goal,'очко','очка','очков')}`,
  apples:goal => `Собери ${goal} ${plural(goal,'яблоко','яблока','яблок')}`,
  crates:goal => `Разбей ${goal} ${plural(goal,'ящик','ящика','ящиков')}`,
  bombs:goal => `Обезвредь ${goal} ${plural(goal,'бомбу','бомбы','бомб')}`,
  ice:goal => `Разбей ${goal} ${plural(goal,'льдинку','льдинки','льдинок')}`
});

const TYPE_SEQUENCE = ['score','apples','crates','score','bombs','ice','apples','crates','score','bombs'];

function buildLevel(id) {
  const chapter = Math.ceil(id / LEVELS_PER_CHAPTER);
  const slot = (id - 1) % LEVELS_PER_CHAPTER;
  const type = chapter < 3 && TYPE_SEQUENCE[slot] === 'ice' ? 'score' : TYPE_SEQUENCE[slot];
  const difficulty = chapter + slot / LEVELS_PER_CHAPTER;
  const maxValue = Math.min(8,4 + Math.floor((chapter - 1) / 2));
  const target = Math.max(maxValue * 2 + 1,9 + chapter + Math.floor(slot / 2));
  const baseMoves = Math.max(11,13 + chapter + (slot % 3) - Math.floor(chapter / 4));
  const crates = type === 'crates'
    ? Math.min(9,3 + Math.floor(chapter / 2) + (slot % 2))
    : Math.min(8,Math.max(0,chapter - 1) + (slot % 3 === 0 ? 1 : 0));
  const crateHp = chapter < 3 ? 1 : chapter < 7 ? 2 : 3;
  const ice = chapter < 3 ? 0 : Math.min(12,3 + chapter + (slot % 3));
  const iceHp = chapter < 6 ? 1 : 2;
  const bombEvery = chapter < 4 ? 0 : Math.max(2,5 - Math.floor(chapter / 3));
  const fuse = chapter < 6 ? 4 : chapter < 9 ? 3 : 2;
  const moves = type === 'crates'
    ? Math.max(baseMoves,crates * crateHp + 3)
    : type === 'ice'
      ? Math.max(baseMoves,ice * iceHp + 3)
      : baseMoves;
  let goal;

  if (type === 'score') goal = Math.round((300 + difficulty * 140 + moves * 10) / 50) * 50;
  else if (type === 'apples') goal = Math.round(8 + difficulty * 2.2);
  else if (type === 'crates') goal = crates;
  else if (type === 'bombs') goal = Math.min(6,2 + Math.floor(chapter / 3) + (slot === 9 ? 1 : 0));
  else goal = ice * iceHp;

  const estimatedMinutes = Number((2.35 + difficulty * .11 + moves * .045 + (slot === 9 ? .65 : 0)).toFixed(2));
  const tutorial = id === 1 ? 'chains'
    : id === 3 ? 'crates'
      : id === 5 ? 'bombs'
      : id === 21 ? 'ice'
        : null;

  return Object.freeze({
    schemaVersion:LEVEL_SCHEMA_VERSION,
    id,
    chapter,
    slot:slot + 1,
    title:TYPE_TITLES[type](goal),
    type,
    goal,
    moves,
    target,
    maxValue,
    crates,
    crateHp,
    ice,
    iceHp,
    bombEvery,
    fuse,
    startBomb:type === 'bombs',
    estimatedMinutes,
    tutorial
  });
}

export const LEVELS = Object.freeze(Array.from({length:CAMPAIGN_LEVEL_COUNT},(_,index) => buildLevel(index + 1)));

export function getLevelConfig(levelIndex) {
  return LEVELS[Math.max(0,Math.min(levelIndex,LEVELS.length - 1))];
}

export function campaignEstimatedMinutes(levels=LEVELS) {
  return Number(levels.reduce((sum,level) => sum + level.estimatedMinutes,0).toFixed(2));
}

export function validateLevel(levelConfig) {
  const errors = [];
  if (levelConfig.schemaVersion !== LEVEL_SCHEMA_VERSION) errors.push('unsupported schemaVersion');
  if (!Number.isInteger(levelConfig.id) || levelConfig.id < 1) errors.push('invalid id');
  if (!['score','apples','bombs','crates','ice'].includes(levelConfig.type)) errors.push('invalid type');
  if (!(levelConfig.target > levelConfig.maxValue * 2)) errors.push('target must require at least three fruits');
  if (levelConfig.target > levelConfig.maxValue * MAX_CHAIN_LENGTH) errors.push('target exceeds maximum chain capacity');
  if (!(levelConfig.goal > 0)) errors.push('goal must be positive');
  if (!(levelConfig.moves > 0)) errors.push('moves must be positive');
  if ((levelConfig.crates || 0) >= ROWS * COLS - 8) errors.push('too many crates');
  if ((levelConfig.ice || 0) > ROWS * COLS - (levelConfig.crates || 0)) errors.push('too much ice');
  if (!(levelConfig.estimatedMinutes >= 2)) errors.push('estimated duration is too short');
  return errors;
}
