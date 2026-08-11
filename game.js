const ROWS = 7;
const COLS = 6;
const TARGET = 10;
const MAX_CHAIN_LENGTH = 6;

const LEVELS = [
  { title:'Набери 360 очков', type:'score', goal:360, moves:12 },
  { title:'Собери 10 яблок', type:'apples', goal:10, moves:14, bombEvery:4, fuse:4 },
  { title:'Набери 800 очков', type:'score', goal:800, moves:14, bombEvery:3, fuse:3 },
  { title:'Обезвредь 2 бомбы', type:'bombs', goal:2, moves:14, bombEvery:3, fuse:3, startBomb:true },
  { title:'Набери 1200 очков', type:'score', goal:1200, moves:15, bombEvery:3, fuse:2 }
];

const boardEl = document.querySelector('#board');
const sumEl = document.querySelector('#sum');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const clearBtn = document.querySelector('#clear');
const hintEl = document.querySelector('#hint');
const comboEl = document.querySelector('#combo');
const toastEl = document.querySelector('#toast');
const dangerMeterEl = document.querySelector('#dangerMeter');
const fuseEl = document.querySelector('#fuse');
const levelEl = document.querySelector('#level');
const movesEl = document.querySelector('#moves');
const missionEl = document.querySelector('#mission');
const progressEl = document.querySelector('#progress');
const gameOverEl = document.querySelector('#gameOver');
const gameOverIconEl = document.querySelector('#gameOverIcon');
const gameOverTitleEl = document.querySelector('#gameOverTitle');
const finalScoreEl = document.querySelector('#finalScore');
const restartBtn = document.querySelector('#restart');
const levelCompleteEl = document.querySelector('#levelComplete');
const movesBonusEl = document.querySelector('#movesBonus');
const nextLevelBtn = document.querySelector('#nextLevel');

let cells = [];
let selected = new Set();
let chain = [];
let score = 0;
let levelScore = 0;
let applesCleared = 0;
let bombsDefused = 0;
let levelIndex = 0;
let movesLeft = 0;
let successfulMoves = 0;
let locked = false;
let autoCollectTimer = null;
let bombId = null;
let fuse = 4;
let best = Number(localStorage.getItem('fruit10-best') || 0);
bestEl.textContent = best;

const randomValue = () => Math.floor(Math.random() * 9) + 1;
const fruit = () => ({
  value: randomValue(),
  type: Math.random() < .34 ? 'apple' : 'orange',
  id: crypto.randomUUID()
});

function currentLevel() {
  if (levelIndex < LEVELS.length) return LEVELS[levelIndex];
  const round = levelIndex - LEVELS.length + 1;
  const goal = 1300 + round * 250;
  return { title:`Набери ${goal} очков`, type:'score', goal, moves:15, bombEvery:2, fuse:2, startBomb:true };
}

function start() {
  score = 0;
  levelIndex = 0;
  scoreEl.textContent = '0';
  beginLevel();
}

function beginLevel() {
  clearTimeout(autoCollectTimer);
  const level = currentLevel();
  cells = Array.from({length:ROWS * COLS}, fruit);
  selected = new Set();
  chain = [];
  levelScore = 0;
  applesCleared = 0;
  bombsDefused = 0;
  successfulMoves = 0;
  movesLeft = level.moves;
  bombId = null;
  fuse = level.fuse || 4;
  locked = false;
  gameOverEl.hidden = true;
  levelCompleteEl.hidden = true;
  ensurePlayable();
  if (level.startBomb) plantBomb();
  render(true);
}

function render(initial=false) {
  boardEl.innerHTML = '';
  cells.forEach((item,index) => {
    const button = document.createElement('button');
    const isBomb = item.id === bombId;
    const order = chain.indexOf(item.id);
    button.className = `fruit ${item.type}${selected.has(item.id) ? ' selected' : ''}${isBomb ? ' bomb' : ''}${initial ? ' intro' : ''}${item.fallRows ? ' falling' : ''}`;
    button.innerHTML = `<span class="fruit-number">${item.value}</span>${order >= 0 ? `<span class="chain-order">${order + 1}</span>` : ''}${isBomb ? `<span class="fuse-label">${fuse}</span>` : ''}`;
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${isBomb ? `Фрукт с бомбой, осталось ходов ${fuse},` : ''} ${item.type === 'apple' ? 'Яблоко' : 'Апельсин'}, число ${item.value}${order >= 0 ? `, номер ${order + 1} в цепочке` : ''}`);
    if (initial) button.style.animationDelay = `${(index % COLS) * 35 + Math.floor(index/COLS) * 22}ms`;
    if (item.fallRows) {
      button.style.setProperty('--fall-pct', `${item.fallRows * -100}%`);
      button.style.setProperty('--fall-gap', `${item.fallRows * 7}px`);
      button.style.animationDelay = `${item.fallDelay || 0}ms`;
    }
    button.addEventListener('click', () => toggle(item.id));
    boardEl.append(button);
    delete item.fallRows;
    delete item.fallDelay;
  });
  updateUI();
}

function total() {
  return cells.filter(item => selected.has(item.id)).reduce((sum,item) => sum + item.value,0);
}

function toggle(id) {
  if (locked) return;
  clearTimeout(autoCollectTimer);

  if (selected.has(id)) {
    const index = chain.indexOf(id);
    chain = index === chain.length - 1 ? chain.slice(0,-1) : chain.slice(0,index + 1);
    selected = new Set(chain);
    syncSelectionUI();
    updateUI();
    scheduleCollectionIfReady();
    return;
  }

  if (chain.length) {
    const lastIndex = cells.findIndex(item => item.id === chain[chain.length - 1]);
    const nextIndex = cells.findIndex(item => item.id === id);
    if (!areNeighbors(lastIndex,nextIndex)) {
      const button = boardEl.querySelector(`[data-id="${id}"]`);
      button?.classList.add('invalid');
      setTimeout(() => button?.classList.remove('invalid'),280);
      hintEl.textContent = 'Этот фрукт не рядом с концом цепочки';
      return;
    }
  }

  chain.push(id);
  selected.add(id);
  syncSelectionUI();
  updateUI();
  scheduleCollectionIfReady();
}

function scheduleCollectionIfReady() {
  if (total() !== TARGET) return;
  locked = true;
  hintEl.textContent = 'Десятка! Собираем…';
  autoCollectTimer = setTimeout(collect,280);
}

function syncSelectionUI() {
  boardEl.querySelectorAll('.fruit').forEach(button => {
    const id = button.dataset.id;
    const order = chain.indexOf(id);
    button.classList.toggle('selected',order >= 0);
    button.querySelector('.chain-order')?.remove();
    if (order >= 0) {
      const badge = document.createElement('span');
      badge.className = 'chain-order';
      badge.textContent = order + 1;
      button.append(badge);
    }
  });
}

function updateUI() {
  const level = currentLevel();
  const sum = total();
  sumEl.textContent = sum;
  sumEl.style.color = sum === TARGET ? '#69d15b' : sum > TARGET ? '#ff6689' : '';
  scoreEl.textContent = score;
  levelEl.textContent = levelIndex + 1;
  movesEl.textContent = movesLeft;
  movesEl.parentElement.classList.toggle('urgent',movesLeft <= 3);
  missionEl.textContent = level.title;
  progressEl.textContent = progressLabel();
  dangerMeterEl.hidden = !bombId;
  fuseEl.textContent = fuse;
  dangerMeterEl.classList.toggle('urgent',fuse <= 2);

  if (sum > TARGET) hintEl.textContent = 'Перебор — вернись на шаг назад';
  else if (!chain.length) hintEl.textContent = bombId ? 'Начни цепочку и доберись до бомбы' : 'Соединяй соседние фрукты в сумму 10';
  else if (sum < TARGET) hintEl.textContent = `Цепочка: ${sum}. Продолжай по соседним клеткам`;
}

function progressValue() {
  const type = currentLevel().type;
  if (type === 'apples') return applesCleared;
  if (type === 'bombs') return bombsDefused;
  return levelScore;
}

function progressLabel() {
  const level = currentLevel();
  return `${Math.min(progressValue(),level.goal)} / ${level.goal}`;
}

function clearSelection() {
  if (locked) return;
  clearTimeout(autoCollectTimer);
  selected = new Set();
  chain = [];
  syncSelectionUI();
  updateUI();
}

async function collect() {
  if (total() !== TARGET) { locked = false; return; }
  const level = currentLevel();
  const defused = Boolean(bombId && selected.has(bombId));
  const selectedItems = cells.filter(item => selected.has(item.id));
  const count = selectedItems.length;
  const apples = selectedItems.filter(item => item.type === 'apple').length;
  const gained = count * 15 + Math.max(0,count - 2) * 20 + (defused ? 100 : 0);

  successfulMoves++;
  movesLeft--;
  score += gained;
  levelScore += gained;
  applesCleared += apples;
  if (defused) bombsDefused++;
  updateBest();

  comboEl.textContent = defused ? `БОМБА СНЯТА! +${gained}` : count >= 4 ? `СУПЕРЦЕПЬ ×${count}  +${gained}` : `ЦЕПОЧКА ×${count}  +${gained}`;
  comboEl.classList.remove('show');
  void comboEl.offsetWidth;
  comboEl.classList.add('show');
  selected.forEach(id => boardEl.querySelector(`[data-id="${id}"]`)?.classList.add('removing'));
  await wait(360);

  if (defused) { bombId = null; fuse = level.fuse || 4; }
  else if (bombId) fuse--;

  collapseAndRefill();
  selected = new Set();
  chain = [];

  if (bombId && fuse <= 0) { endGame('bomb'); return; }

  ensurePlayable();
  if (bombId) ensureBombPlayable();
  if (level.type === 'bombs' && defused && bombsDefused < level.goal) plantBomb();
  else if (!bombId && level.bombEvery && successfulMoves % level.bombEvery === 0) plantBomb();

  render();
  locked = false;

  if (progressValue() >= level.goal) { completeLevel(); return; }
  if (movesLeft <= 0) { endGame('moves'); return; }
}

function updateBest() {
  if (score <= best) return;
  best = score;
  bestEl.textContent = best;
  localStorage.setItem('fruit10-best',best);
}

function completeLevel() {
  locked = true;
  const bonus = movesLeft * 25;
  score += bonus;
  movesBonusEl.textContent = `${movesLeft} (+${bonus} очков)`;
  scoreEl.textContent = score;
  updateBest();
  setTimeout(() => { levelCompleteEl.hidden = false; },350);
}

function plantBomb() {
  const candidates = cells
    .map((item,index) => ({item,index}))
    .filter(({index}) => hasChainFrom(index));
  if (!candidates.length) return;
  const target = candidates[Math.floor(Math.random() * candidates.length)].item;
  bombId = target.id;
  fuse = currentLevel().fuse || 4;
  showToast(`💣 Бомба! Включи её в цепочку за ${fuse} хода`);
}

function collapseAndRefill() {
  const next = Array(ROWS * COLS);
  for (let col=0; col<COLS; col++) {
    const survivors = [];
    for (let row=ROWS-1; row>=0; row--) {
      const item = cells[row*COLS+col];
      if (!selected.has(item.id)) survivors.push({item,oldRow:row});
    }
    const missing = ROWS - survivors.length;
    for (let row=ROWS-1,i=0; row>=0; row--,i++) {
      if (survivors[i]) {
        const survivor = survivors[i];
        survivor.item.fallRows = row - survivor.oldRow;
        next[row*COLS+col] = survivor.item;
      } else {
        const newcomer = fruit();
        newcomer.fallRows = missing;
        newcomer.fallDelay = (missing - row - 1) * 28;
        next[row*COLS+col] = newcomer;
      }
    }
  }
  cells = next;
}

function areNeighbors(a,b) {
  if (a < 0 || b < 0) return false;
  const rowA = Math.floor(a / COLS);
  const colA = a % COLS;
  const rowB = Math.floor(b / COLS);
  const colB = b % COLS;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
}

function neighborIndexes(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const result = [];
  if (row > 0) result.push(index - COLS);
  if (row < ROWS - 1) result.push(index + COLS);
  if (col > 0) result.push(index - 1);
  if (col < COLS - 1) result.push(index + 1);
  return result;
}

function hasChainFrom(startIndex) {
  const visited = new Set([startIndex]);
  function search(index,sum,depth) {
    if (sum === TARGET && depth >= 2) return true;
    if (sum >= TARGET || depth >= MAX_CHAIN_LENGTH) return false;
    for (const next of neighborIndexes(index)) {
      if (visited.has(next)) continue;
      visited.add(next);
      if (search(next,sum + cells[next].value,depth + 1)) return true;
      visited.delete(next);
    }
    return false;
  }
  return search(startIndex,cells[startIndex].value,1);
}

function hasValidChain() {
  return cells.some((_,index) => hasChainFrom(index));
}

function ensurePlayable() {
  if (hasValidChain()) return;
  for (let attempt=0; attempt<18; attempt++) {
    shuffle(cells);
    if (hasValidChain()) {
      showToast('Поле перемешано — ищем новую цепочку');
      return;
    }
  }
  cells[0].value = 4;
  cells[1].value = 6;
}

function ensureBombPlayable() {
  const bombIndex = cells.findIndex(item => item.id === bombId);
  if (bombIndex < 0 || hasChainFrom(bombIndex)) return;
  const neighbors = neighborIndexes(bombIndex);
  const rescue = neighbors[Math.floor(Math.random() * neighbors.length)];
  cells[rescue].value = TARGET - cells[bombIndex].value;
}

function shuffle(items) {
  for (let i=items.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i],items[j]] = [items[j],items[i]];
  }
}

function endGame(reason) {
  locked = true;
  bombId = null;
  boardEl.classList.remove('shake');
  void boardEl.offsetWidth;
  boardEl.classList.add('shake');
  gameOverIconEl.textContent = reason === 'moves' ? '⌛' : '💥';
  gameOverTitleEl.textContent = reason === 'moves' ? 'Ходы закончились' : 'Фитиль догорел!';
  finalScoreEl.textContent = score;
  setTimeout(() => { gameOverEl.hidden = false; },350);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'),1800);
}

const wait = ms => new Promise(resolve => setTimeout(resolve,ms));

clearBtn.addEventListener('click',clearSelection);
restartBtn.addEventListener('click',start);
nextLevelBtn.addEventListener('click',() => { levelIndex++; beginLevel(); });
start();
