import { COLS, MAX_CHAIN_LENGTH, ROWS, getLevelConfig } from './config/levels.js';
import { areNeighbors as gridAreNeighbors, findSimplePath, neighborIndexes as gridNeighborIndexes, shuffleInPlace } from './core/grid.js';
import { createBrowserPlatform } from './platforms/browser.js';

const platform = createBrowserPlatform();
const areNeighbors = (a,b) => gridAreNeighbors(a,b,COLS);
const neighborIndexes = index => gridNeighborIndexes(index,ROWS,COLS);
const shuffle = items => shuffleInPlace(items);

const boardEl = document.querySelector('#board');
const boardWrapEl = document.querySelector('.board-wrap');
const snakeLayerEl = document.querySelector('#snakeLayer');
const snakeGlowEl = document.querySelector('#snakeGlow');
const snakePathEl = document.querySelector('#snakePath');
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
const targetEl = document.querySelector('#target');
const sumTargetEl = document.querySelector('#sumTarget');
const gameOverEl = document.querySelector('#gameOver');
const gameOverIconEl = document.querySelector('#gameOverIcon');
const gameOverTitleEl = document.querySelector('#gameOverTitle');
const finalScoreEl = document.querySelector('#finalScore');
const restartBtn = document.querySelector('#restart');
const levelCompleteEl = document.querySelector('#levelComplete');
const movesBonusEl = document.querySelector('#movesBonus');
const nextLevelBtn = document.querySelector('#nextLevel');

let cells = [];
let obstacles = new Map();
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
let target = 10;
let activePointerId = null;
let dragStartId = null;
let dragging = false;
let ignoreClickUntil = 0;
let best = platform.loadBest();
bestEl.textContent = best;

const randomValue = () => Math.max(1,Math.ceil(Math.pow(Math.random(),1.35) * currentLevel().maxValue));
const fruit = () => ({
  value: randomValue(),
  type: Math.random() < .34 ? 'apple' : 'orange',
  id: crypto.randomUUID()
});

function currentLevel() {
  return getLevelConfig(levelIndex);
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
  target = level.target;
  cells = Array.from({length:ROWS * COLS}, fruit);
  placeObstacles(level.crates || 0,level.crateHp || 1);
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
    if (obstacles.has(index)) {
      const obstacle = document.createElement('div');
      const hp = obstacles.get(index);
      obstacle.className = `obstacle${initial ? ' intro' : ''}`;
      obstacle.dataset.obstacleIndex = index;
      obstacle.setAttribute('role','img');
      obstacle.setAttribute('aria-label',`Ящик, прочность ${hp}`);
      obstacle.innerHTML = `<span class="crate-icon">📦</span>${hp > 1 ? `<span class="crate-hp">${hp}</span>` : ''}`;
      if (initial) obstacle.style.animationDelay = `${(index % COLS) * 35 + Math.floor(index/COLS) * 22}ms`;
      boardEl.append(obstacle);
      delete item.fallRows;
      delete item.fallDelay;
      return;
    }
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
    button.addEventListener('click', () => {
      if (performance.now() < ignoreClickUntil) return;
      toggle(item.id);
    });
    boardEl.append(button);
    delete item.fallRows;
    delete item.fallDelay;
  });
  updateSnakePath();
  updateUI();
}

function placeObstacles(count,hp) {
  obstacles = new Map();
  const candidates = Array.from({length:ROWS * COLS},(_,index) => index)
    .filter(index => {
      const row = Math.floor(index / COLS);
      return row > 0 && row < ROWS - 1;
    });
  shuffle(candidates);

  for (const index of candidates) {
    if (obstacles.size >= count) break;
    if ([...obstacles.keys()].some(other => areNeighbors(index,other))) continue;
    obstacles.set(index,hp);
  }
  for (const index of candidates) {
    if (obstacles.size >= count) break;
    if (!obstacles.has(index)) obstacles.set(index,hp);
  }
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
      chain = [id];
      selected = new Set(chain);
      syncSelectionUI();
      updateUI();
      return;
    }
  }

  chain.push(id);
  selected.add(id);
  syncSelectionUI();
  updateUI();
  scheduleCollectionIfReady();
}

function startPointerChain(event) {
  if (locked || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const fruitButton = event.target.closest('.fruit');
  if (!fruitButton) return;
  activePointerId = event.pointerId;
  dragStartId = fruitButton.dataset.id;
  dragging = false;
  boardEl.setPointerCapture?.(event.pointerId);
}

function movePointerChain(event) {
  if (event.pointerId !== activePointerId || locked || !dragStartId) return;
  const fruitButton = document.elementFromPoint(event.clientX,event.clientY)?.closest('.fruit');
  const id = fruitButton?.dataset.id;

  if (!dragging) {
    if (!id || id === dragStartId) return;
    const startIndex = cells.findIndex(item => item.id === dragStartId);
    const nextIndex = cells.findIndex(item => item.id === id);
    if (!areNeighbors(startIndex,nextIndex)) return;
    clearTimeout(autoCollectTimer);
    chain = [dragStartId];
    selected = new Set(chain);
    dragging = true;
    boardEl.classList.add('dragging');
    syncSelectionUI();
    updateUI();
  }

  if (id) extendPointerChain(id);
  updateSnakePath({clientX:event.clientX,clientY:event.clientY});
  event.preventDefault();
}

function extendPointerChain(id) {
  const lastId = chain[chain.length - 1];
  if (!lastId || id === lastId) return;

  if (selected.has(id)) {
    if (chain.length > 1 && id === chain[chain.length - 2]) {
      selected.delete(chain.pop());
      syncSelectionUI();
      updateUI();
    }
    return;
  }

  const lastIndex = cells.findIndex(item => item.id === lastId);
  const nextIndex = cells.findIndex(item => item.id === id);
  if (!areNeighbors(lastIndex,nextIndex)) return;

  chain.push(id);
  selected.add(id);
  syncSelectionUI();
  updateUI();
  scheduleCollectionIfReady();
}

function finishPointerChain(event) {
  if (event.pointerId !== activePointerId) return;
  const resetMiss = dragging && !locked && total() !== target;
  if (dragging) ignoreClickUntil = performance.now() + 450;
  boardEl.classList.remove('dragging');
  if (boardEl.hasPointerCapture?.(event.pointerId)) boardEl.releasePointerCapture(event.pointerId);
  activePointerId = null;
  dragStartId = null;
  dragging = false;
  if (resetMiss) clearSelection();
}

function scheduleCollectionIfReady() {
  if (total() !== target) return;
  locked = true;
  hintEl.textContent = `Есть ${target}! Собираем…`;
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
  updateSnakePath();
}

function updateSnakePath(pointer=null) {
  const wrapRect = boardWrapEl.getBoundingClientRect();
  const points = chain.map(id => {
    const fruitButton = boardEl.querySelector(`[data-id="${id}"]`);
    if (!fruitButton) return null;
    const rect = fruitButton.getBoundingClientRect();
    return { x:rect.left + rect.width / 2 - wrapRect.left, y:rect.top + rect.height / 2 - wrapRect.top };
  }).filter(Boolean);

  if (pointer && points.length) {
    points.push({x:pointer.clientX - wrapRect.left,y:pointer.clientY - wrapRect.top});
  }

  const path = points.length > 1
    ? points.map((point,index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
    : '';
  snakeGlowEl.setAttribute('d',path);
  snakePathEl.setAttribute('d',path);
  snakeLayerEl.classList.toggle('visible',Boolean(path));
}

function updateUI() {
  const level = currentLevel();
  const sum = total();
  sumEl.textContent = sum;
  sumEl.style.color = sum === target ? '#69d15b' : sum > target ? '#ff6689' : '';
  scoreEl.textContent = score;
  levelEl.textContent = levelIndex + 1;
  movesEl.textContent = movesLeft;
  movesEl.parentElement.classList.toggle('urgent',movesLeft <= 3);
  missionEl.textContent = level.title;
  progressEl.textContent = progressLabel();
  targetEl.textContent = target;
  sumTargetEl.textContent = target;
  dangerMeterEl.hidden = !bombId;
  fuseEl.textContent = fuse;
  dangerMeterEl.classList.toggle('urgent',fuse <= 2);

  if (sum > target) hintEl.textContent = 'Перебор — вернись на шаг назад';
  else if (!chain.length) hintEl.textContent = bombId ? 'Начни цепочку и доберись до бомбы' : obstacles.size ? `Протяни цепочку на ${target}. Рядом с ящиком — удар!` : `Соединяй соседние фрукты в сумму ${target}`;
  else if (sum < target) hintEl.textContent = `Цепочка: ${sum} из ${target}. Продолжай по соседним клеткам`;
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
  if (total() !== target) { locked = false; return; }
  const level = currentLevel();
  const defused = Boolean(bombId && selected.has(bombId));
  const selectedItems = cells.filter(item => selected.has(item.id));
  const count = selectedItems.length;
  const apples = selectedItems.filter(item => item.type === 'apple').length;
  const crateResult = damageAdjacentObstacles();
  const gained = count * 15 + Math.max(0,count - 2) * 20 + (defused ? 100 : 0) + crateResult.broken * 60;

  successfulMoves++;
  movesLeft--;
  score += gained;
  levelScore += gained;
  applesCleared += apples;
  if (defused) bombsDefused++;
  updateBest();

  comboEl.textContent = defused ? `БОМБА СНЯТА! +${gained}` : crateResult.broken ? `ЯЩИК РАЗБИТ! +${gained}` : count >= 4 ? `СУПЕРЦЕПЬ ×${count}  +${gained}` : `ЦЕПОЧКА ×${count}  +${gained}`;
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

function damageAdjacentObstacles() {
  const selectedIndexes = new Set(chain.map(id => cells.findIndex(item => item.id === id)));
  let broken = 0;
  let hit = 0;

  for (const [index,hp] of [...obstacles.entries()]) {
    if (!neighborIndexes(index).some(neighbor => selectedIndexes.has(neighbor))) continue;
    hit++;
    const nextHp = hp - 1;
    const obstacleEl = boardEl.querySelector(`[data-obstacle-index="${index}"]`);
    if (nextHp <= 0) {
      obstacles.delete(index);
      broken++;
      obstacleEl?.classList.add('breaking');
    } else {
      obstacles.set(index,nextHp);
      obstacleEl?.classList.add('hit');
      obstacleEl?.setAttribute('aria-label',`Ящик, прочность ${nextHp}`);
      obstacleEl?.querySelector('.crate-hp')?.remove();
    }
  }

  return {broken,hit};
}

function updateBest() {
  if (score <= best) return;
  best = score;
  bestEl.textContent = best;
  platform.saveBest(best);
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
  const hiddenBombIndex = bombId ? cells.findIndex(item => item.id === bombId) : -1;
  if (hiddenBombIndex >= 0 && obstacles.has(hiddenBombIndex)) {
    const visibleIndex = cells.findIndex((_,index) => !obstacles.has(index));
    [cells[hiddenBombIndex],cells[visibleIndex]] = [cells[visibleIndex],cells[hiddenBombIndex]];
  }
}

function hasChainFrom(startIndex) {
  if (obstacles.has(startIndex)) return false;
  const visited = new Set([startIndex]);
  function search(index,sum,depth) {
    if (sum === target && depth >= 3) return true;
    if (sum >= target || depth >= MAX_CHAIN_LENGTH) return false;
    for (const next of neighborIndexes(index)) {
      if (visited.has(next) || obstacles.has(next)) continue;
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
    shuffleVisibleCells();
    if (hasValidChain()) {
      showToast('Поле перемешано — ищем новую цепочку');
      return;
    }
  }
  forcePlayableChain();
}

function shuffleVisibleCells() {
  const indexes = cells.map((_,index) => index).filter(index => !obstacles.has(index));
  const visibleCells = indexes.map(index => cells[index]);
  shuffle(visibleCells);
  indexes.forEach((index,position) => { cells[index] = visibleCells[position]; });
}

function ensureBombPlayable() {
  const bombIndex = cells.findIndex(item => item.id === bombId);
  if (bombIndex < 0 || hasChainFrom(bombIndex)) return;
  forcePlayableChain(bombIndex);
}

function forcePlayableChain(startIndex=0) {
  const maxValue = currentLevel().maxValue;
  const count = Math.ceil(target / maxValue);
  const starts = [startIndex,...cells.map((_,index) => index)]
    .filter((index,position,list) => !obstacles.has(index) && list.indexOf(index) === position);
  let path = [];
  for (const candidate of starts) {
    path = buildPathFrom(candidate,count);
    if (path.length === count) break;
  }
  if (path.length !== count) return;
  let remaining = target;
  path.forEach((index,position) => {
    const slotsLeft = path.length - position - 1;
    const value = Math.min(maxValue,remaining - slotsLeft);
    cells[index].value = value;
    remaining -= value;
  });
}

function buildPathFrom(startIndex,length) {
  return findSimplePath(startIndex,length,{rows:ROWS,cols:COLS,blocked:obstacles});
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
boardEl.addEventListener('pointerdown',startPointerChain);
boardEl.addEventListener('pointermove',movePointerChain);
boardEl.addEventListener('pointerup',finishPointerChain);
boardEl.addEventListener('pointercancel',finishPointerChain);
window.addEventListener('resize',() => updateSnakePath());

export async function startGame() {
  start();
  await platform.ready();
  platform.gameplayStart();
}
