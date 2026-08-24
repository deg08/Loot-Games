import { CHAPTERS, COLS, LEVELS, MAX_CHAIN_LENGTH, ROWS, getLevelConfig } from './config/levels.js';
import { BOOSTER_CATALOG, PURCHASE_CATALOG, purchaseById } from './config/products.js';
import { createAnalytics } from './core/analytics.js';
import { areNeighbors as gridAreNeighbors, findSimplePath, neighborIndexes as gridNeighborIndexes, shuffleInPlace } from './core/grid.js';
import { completeProfileLevel, markTutorialSeen, normalizeProfile, profileStarTotal } from './core/profile.js';
import { calculateStars, missionProgress } from './core/progression.js';
import { buyBooster, consumeBooster, fulfillPurchase, recordPendingPurchase, recoverPendingPurchases } from './core/store.js';
import { createBrowserPlatform } from './platforms/browser.js';
import { createMockPurchaseAdapter } from './platforms/mock-store.js';

const platform = createBrowserPlatform();
const purchaseAdapter = createMockPurchaseAdapter();
const analytics = createAnalytics(platform);
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
const earnedStarsEl = document.querySelector('#earnedStars');
const coinsEarnedEl = document.querySelector('#coinsEarned');
const levelMapEl = document.querySelector('#levelMap');
const levelGridEl = document.querySelector('#levelGrid');
const chapterTabsEl = document.querySelector('#chapterTabs');
const totalStarsEl = document.querySelector('#totalStars');
const coinsEl = document.querySelector('#coins');
const mapButton = document.querySelector('#mapButton');
const mapCloseBtn = document.querySelector('#mapClose');
const levelMapButton = document.querySelector('#levelMapButton');
const gameOverMapButton = document.querySelector('#gameOverMap');
const debugPanelEl = document.querySelector('#debugPanel');
const debugLevelEl = document.querySelector('#debugLevel');
const debugWinBtn = document.querySelector('#debugWin');
const debugResetBtn = document.querySelector('#debugReset');
const gameCoinsEl = document.querySelector('#gameCoins');
const boosterTrayEl = document.querySelector('#boosterTray');
const shopEl = document.querySelector('#shop');
const shopButton = document.querySelector('#shopButton');
const shopQuickButton = document.querySelector('#shopQuickButton');
const shopCloseBtn = document.querySelector('#shopClose');
const shopCoinsEl = document.querySelector('#shopCoins');
const boosterShopEl = document.querySelector('#boosterShop');
const purchaseShopEl = document.querySelector('#purchaseShop');
const continueBtn = document.querySelector('#continueButton');
const continueCountEl = document.querySelector('#continueCount');
const tutorialEl = document.querySelector('#tutorial');
const tutorialEmojiEl = document.querySelector('#tutorialEmoji');
const tutorialTitleEl = document.querySelector('#tutorialTitle');
const tutorialTextEl = document.querySelector('#tutorialText');
const tutorialCloseBtn = document.querySelector('#tutorialClose');

let cells = [];
let obstacles = new Map();
let selected = new Set();
let chain = [];
let score = 0;
let levelScore = 0;
let applesCleared = 0;
let bombsDefused = 0;
let cratesBroken = 0;
let iceBroken = 0;
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
let profile = normalizeProfile(null,LEVELS.length);
let best = 0;
let activeChapter = 1;
let activeBooster = null;
let pendingTutorialId = null;

const TUTORIALS = Object.freeze({
  chains:{emoji:'👆',title:'Протяни цепочку',text:'Зажми фрукт и проведи по соседним клеткам. Цепочка соберётся автоматически, когда сумма совпадёт с целью.'},
  crates:{emoji:'📦',title:'Разбивай ящики',text:'Собирай цепочки рядом с ящиками. Каждый соседний успешный ход наносит им один удар.'},
  ice:{emoji:'🧊',title:'Разбей лёд',text:'Замороженный фрукт нужно включить в правильную цепочку. Толстому льду потребуется несколько попаданий.'},
  bombs:{emoji:'💣',title:'Следи за фитилём',text:'Включи фрукт с бомбой в цепочку до того, как закончатся ходы на её таймере.'},
  boosters:{emoji:'🎒',title:'Бустеры садовника',text:'Используй дополнительные ходы, перемешивание, радугу и молоток. Новые бустеры можно покупать за заработанные монеты.'}
});

const randomValue = () => Math.max(1,Math.ceil(Math.pow(Math.random(),1.35) * currentLevel().maxValue));
const fruit = () => ({
  value: randomValue(),
  type: Math.random() < .34 ? 'apple' : 'orange',
  id: crypto.randomUUID()
});

function currentLevel() {
  return getLevelConfig(levelIndex);
}

function start(levelNumber=profile.unlockedLevel) {
  score = 0;
  levelIndex = Math.max(0,Math.min(LEVELS.length - 1,levelNumber - 1));
  scoreEl.textContent = '0';
  analytics.track('run_started',{levelId:currentLevel().id});
  beginLevel();
}

function beginLevel() {
  clearTimeout(autoCollectTimer);
  const level = currentLevel();
  target = level.target;
  cells = Array.from({length:ROWS * COLS}, fruit);
  placeObstacles(level.crates || 0,level.crateHp || 1);
  placeIce(level.ice || 0,level.iceHp || 1);
  selected = new Set();
  chain = [];
  levelScore = 0;
  applesCleared = 0;
  bombsDefused = 0;
  cratesBroken = 0;
  iceBroken = 0;
  successfulMoves = 0;
  movesLeft = level.moves;
  bombId = null;
  activeBooster = null;
  boardEl.classList.remove('booster-aim');
  fuse = level.fuse || 4;
  locked = false;
  gameOverEl.hidden = true;
  levelCompleteEl.hidden = true;
  ensurePlayable();
  if (level.startBomb) plantBomb();
  render(true);
  platform.gameplayStart();
  analytics.track('level_started',{levelId:level.id,chapter:level.chapter,target:level.target,moves:level.moves});
  if (level.tutorial) setTimeout(() => {
    if (levelMapEl.hidden) showTutorial(level.tutorial);
  },520);
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
      obstacle.addEventListener('click',() => hitObstacleWithHammer(index));
      if (initial) obstacle.style.animationDelay = `${(index % COLS) * 35 + Math.floor(index/COLS) * 22}ms`;
      boardEl.append(obstacle);
      delete item.fallRows;
      delete item.fallDelay;
      return;
    }
    const button = document.createElement('button');
    const isBomb = item.id === bombId;
    const order = chain.indexOf(item.id);
    button.className = `fruit ${item.type}${selected.has(item.id) ? ' selected' : ''}${isBomb ? ' bomb' : ''}${item.ice ? ' iced' : ''}${item.rainbow ? ' rainbow' : ''}${initial ? ' intro' : ''}${item.fallRows ? ' falling' : ''}`;
    button.innerHTML = `<span class="fruit-number">${item.rainbow ? '★' : item.value}</span>${order >= 0 ? `<span class="chain-order">${order + 1}</span>` : ''}${isBomb ? `<span class="fuse-label">${fuse}</span>` : ''}${item.ice ? `<span class="ice-label">${item.ice > 1 ? item.ice : '❄'}</span>` : ''}`;
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${isBomb ? `Фрукт с бомбой, осталось ходов ${fuse},` : ''}${item.ice ? ` заморожен, прочность льда ${item.ice},` : ''}${item.rainbow ? ' радужный фрукт' : ` ${item.type === 'apple' ? 'Яблоко' : 'Апельсин'}, число ${item.value}`}${order >= 0 ? `, номер ${order + 1} в цепочке` : ''}`);
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

function placeIce(count,hp) {
  const candidates = cells.map((item,index) => ({item,index})).filter(({index}) => !obstacles.has(index));
  shuffle(candidates);
  candidates.slice(0,count).forEach(({item}) => { item.ice = hp; });
}

function total() {
  const items = cells.filter(item => selected.has(item.id));
  const regularTotal = items.reduce((sum,item) => sum + (item.rainbow ? 0 : item.value),0);
  return items.some(item => item.rainbow) && chain.length >= 2 ? target : regularTotal;
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
  if (total() !== target || chain.length < 3) return;
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
  updateEconomyUI();

  if (activeBooster === 'hammer') hintEl.textContent = 'Выбери ящик, который нужно ударить молотком';
  else if (sum === target && chain.length < 3) hintEl.textContent = 'Для цепочки нужно минимум три фрукта';
  else if (sum > target) hintEl.textContent = 'Перебор — вернись на шаг назад';
  else if (!chain.length) hintEl.textContent = bombId ? 'Начни цепочку и доберись до бомбы' : obstacles.size ? `Протяни цепочку на ${target}. Рядом с ящиком — удар!` : `Соединяй соседние фрукты в сумму ${target}`;
  else if (sum < target) hintEl.textContent = `Цепочка: ${sum} из ${target}. Продолжай по соседним клеткам`;
}

function progressValue() {
  return missionProgress(currentLevel().type,{
    score:levelScore,
    apples:applesCleared,
    bombs:bombsDefused,
    crates:cratesBroken,
    ice:iceBroken
  });
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
  if (total() !== target || chain.length < 3) { locked = false; return; }
  const level = currentLevel();
  const defused = Boolean(bombId && selected.has(bombId));
  const selectedItems = cells.filter(item => selected.has(item.id));
  const count = selectedItems.length;
  const removedIds = new Set();
  let shatteredIce = 0;
  selectedItems.forEach(item => {
    if (item.ice) {
      item.ice--;
      shatteredIce++;
      if (item.ice <= 0) delete item.ice;
      else return;
    }
    removedIds.add(item.id);
  });
  const apples = selectedItems.filter(item => removedIds.has(item.id) && item.type === 'apple').length;
  const crateResult = damageAdjacentObstacles();
  const gained = count * 15 + Math.max(0,count - 2) * 20 + (defused ? 100 : 0) + crateResult.broken * 60;

  successfulMoves++;
  movesLeft--;
  score += gained;
  levelScore += gained;
  applesCleared += apples;
  cratesBroken += crateResult.broken;
  iceBroken += shatteredIce;
  if (defused) bombsDefused++;
  updateBest();

  comboEl.textContent = defused ? `БОМБА СНЯТА! +${gained}` : crateResult.broken ? `ЯЩИК РАЗБИТ! +${gained}` : count >= 4 ? `СУПЕРЦЕПЬ ×${count}  +${gained}` : `ЦЕПОЧКА ×${count}  +${gained}`;
  comboEl.classList.remove('show');
  void comboEl.offsetWidth;
  comboEl.classList.add('show');
  removedIds.forEach(id => boardEl.querySelector(`[data-id="${id}"]`)?.classList.add('removing'));
  await wait(360);

  if (defused) { bombId = null; fuse = level.fuse || 4; }
  else if (bombId) fuse--;

  collapseAndRefill(removedIds);
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
  profile.bestScore = best;
  bestEl.textContent = best;
  platform.saveBest(best);
  platform.saveProfile(profile);
}

function completeLevel() {
  locked = true;
  platform.gameplayStop();
  const level = currentLevel();
  const bonus = movesLeft * 25;
  score += bonus;
  const stars = calculateStars(movesLeft,level.moves);
  const result = completeProfileLevel(profile,{
    levelId:level.id,
    stars,
    score,
    maxLevel:LEVELS.length
  });
  profile = result.profile;
  best = Math.max(best,profile.bestScore);
  platform.saveBest(best);
  platform.saveProfile(profile);
  movesBonusEl.textContent = `${movesLeft} (+${bonus} очков)`;
  earnedStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  coinsEarnedEl.textContent = result.coinsEarned ? `+${result.coinsEarned} монет` : 'Рекорд уровня сохранён';
  scoreEl.textContent = score;
  bestEl.textContent = best;
  updateBest();
  renderLevelMap();
  analytics.track('level_completed',{
    levelId:level.id,
    score,
    stars,
    movesLeft,
    coinsEarned:result.coinsEarned
  });
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

function collapseAndRefill(removedIds=selected) {
  const next = Array(ROWS * COLS);
  for (let col=0; col<COLS; col++) {
    const survivors = [];
    for (let row=ROWS-1; row>=0; row--) {
      const item = cells[row*COLS+col];
      if (!removedIds.has(item.id)) survivors.push({item,oldRow:row});
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

function persistProfile() {
  platform.saveProfile(profile);
  updateEconomyUI();
}

function updateEconomyUI() {
  gameCoinsEl.textContent = profile.coins;
  coinsEl.textContent = profile.coins;
  shopCoinsEl.textContent = profile.coins;
  continueCountEl.textContent = profile.inventory.extra_moves || 0;
  continueBtn.disabled = (profile.inventory.extra_moves || 0) < 1;
  BOOSTER_CATALOG.forEach(booster => {
    const count = profile.inventory[booster.id] || 0;
    const countEl = document.querySelector(`#booster-${booster.id}`);
    if (countEl) countEl.textContent = count;
    const button = boosterTrayEl.querySelector(`[data-booster="${booster.id}"]`);
    if (button) button.disabled = count < 1 || (locked && booster.id !== 'extra_moves');
  });
}

function spendBooster(boosterId) {
  const result = consumeBooster(profile,boosterId,LEVELS.length);
  if (!result.ok) {
    showToast('Бустер закончился — загляни в магазин');
    openShop();
    return false;
  }
  profile = result.profile;
  persistProfile();
  analytics.track('booster_used',{boosterId,levelId:currentLevel().id});
  return true;
}

function useBooster(boosterId) {
  if (locked) return;
  if (boosterId === 'extra_moves') {
    if (!spendBooster(boosterId)) return;
    movesLeft += 5;
    updateUI();
    showToast('+5 ходов');
    return;
  }
  if (boosterId === 'shuffle') {
    if (!spendBooster(boosterId)) return;
    shuffleVisibleCells();
    ensurePlayable();
    render();
    showToast('Фрукты перемешаны');
    return;
  }
  if (boosterId === 'rainbow') {
    const candidates = cells.filter((item,index) => !obstacles.has(index) && !item.rainbow);
    if (!candidates.length) return;
    if (!spendBooster(boosterId)) return;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    chosen.rainbow = true;
    render();
    showToast('Радужный фрукт появился на поле');
    return;
  }
  if (boosterId === 'hammer') {
    if (!obstacles.size) {
      showToast('На поле нет ящиков');
      return;
    }
    activeBooster = activeBooster === 'hammer' ? null : 'hammer';
    boardEl.classList.toggle('booster-aim',activeBooster === 'hammer');
    boosterTrayEl.querySelector('[data-booster="hammer"]')?.classList.toggle('active',activeBooster === 'hammer');
    updateUI();
  }
}

function hitObstacleWithHammer(index) {
  if (activeBooster !== 'hammer' || !obstacles.has(index) || locked) return;
  if (!spendBooster('hammer')) return;
  const hp = obstacles.get(index) - 1;
  if (hp <= 0) {
    obstacles.delete(index);
    cratesBroken++;
    showToast('Ящик разбит молотком');
  } else {
    obstacles.set(index,hp);
    showToast('Ящик повреждён');
  }
  activeBooster = null;
  boardEl.classList.remove('booster-aim');
  boosterTrayEl.querySelector('[data-booster="hammer"]')?.classList.remove('active');
  ensurePlayable();
  render();
  if (progressValue() >= currentLevel().goal) completeLevel();
}

function continueWithExtraMoves() {
  if (!spendBooster('extra_moves')) return;
  movesLeft = Math.max(0,movesLeft) + 5;
  locked = false;
  gameOverEl.hidden = true;
  render();
  platform.gameplayStart();
  analytics.track('level_continued',{levelId:currentLevel().id,movesAdded:5});
  showToast('Ещё пять ходов — вперёд!');
}

function openShop() {
  renderShop();
  shopEl.hidden = false;
  platform.gameplayStop();
  analytics.track('shop_opened',{levelId:currentLevel().id});
  if (!profile.seenTutorials.boosters) showTutorial('boosters');
}

function closeShop() {
  shopEl.hidden = true;
  if (!locked && levelMapEl.hidden) platform.gameplayStart();
}

function renderShop() {
  updateEconomyUI();
  boosterShopEl.innerHTML = '';
  for (const booster of BOOSTER_CATALOG) {
    const item = document.createElement('article');
    item.className = 'shop-item';
    item.innerHTML = `<span>${booster.emoji}</span><div><strong>${booster.title}</strong><small>${booster.description}</small></div><button type="button">🪙 ${booster.coinPrice} · В рюкзаке: ${profile.inventory[booster.id] || 0}</button>`;
    item.querySelector('button').addEventListener('click',() => {
      const result = buyBooster(profile,booster.id,LEVELS.length);
      if (!result.ok) {
        showToast('Не хватает монет');
        return;
      }
      profile = result.profile;
      persistProfile();
      analytics.track('booster_bought',{boosterId:booster.id,coinPrice:booster.coinPrice});
      renderShop();
    });
    boosterShopEl.append(item);
  }

  purchaseShopEl.innerHTML = '';
  for (const product of PURCHASE_CATALOG) {
    const owned = product.kind === 'non_consumable' && profile.entitlements[product.id];
    const item = document.createElement('article');
    item.className = 'shop-item';
    item.innerHTML = `<span>${product.emoji}</span><div><strong>${product.title}</strong><small class="test-badge">ТЕСТ · ${product.testPrice}</small></div><button type="button" ${owned ? 'disabled' : ''}>${owned ? 'Уже получено' : 'Тестовая покупка'}</button>`;
    const button = item.querySelector('button');
    if (!owned) button.addEventListener('click',() => performTestPurchase(product.id,button));
    purchaseShopEl.append(item);
  }
}

async function performTestPurchase(productId,button) {
  button.disabled = true;
  button.textContent = 'Обрабатываем…';
  const transaction = await purchaseAdapter.purchase(productId);
  const pending = recordPendingPurchase(profile,transaction,LEVELS.length);
  if (!pending.ok) {
    showToast(pending.reason === 'already_owned' ? 'Покупка уже получена' : 'Не удалось создать транзакцию');
    renderShop();
    return;
  }
  profile = pending.profile;
  persistProfile();
  const fulfilled = fulfillPurchase(profile,transaction.transactionId,LEVELS.length);
  profile = fulfilled.profile;
  persistProfile();
  const product = purchaseById(productId);
  analytics.track('test_purchase_fulfilled',{productId,transactionId:transaction.transactionId});
  showToast(`${product.emoji} ${product.title} получено в демо-режиме`);
  renderShop();
}

function showTutorial(tutorialId) {
  const tutorial = TUTORIALS[tutorialId];
  if (!tutorial || profile.seenTutorials[tutorialId]) return;
  pendingTutorialId = tutorialId;
  tutorialEmojiEl.textContent = tutorial.emoji;
  tutorialTitleEl.textContent = tutorial.title;
  tutorialTextEl.textContent = tutorial.text;
  tutorialEl.hidden = false;
  platform.gameplayStop();
}

function closeTutorial() {
  if (pendingTutorialId) {
    profile = markTutorialSeen(profile,pendingTutorialId);
    persistProfile();
    analytics.track('tutorial_completed',{tutorialId:pendingTutorialId});
  }
  pendingTutorialId = null;
  tutorialEl.hidden = true;
  if (!locked && shopEl.hidden && levelMapEl.hidden) platform.gameplayStart();
}

function openLevelMap(chapter=currentLevel().chapter) {
  activeChapter = chapter;
  renderLevelMap();
  levelMapEl.hidden = false;
  platform.gameplayStop();
  analytics.track('level_map_opened',{levelId:currentLevel().id,chapter:activeChapter});
}

function closeLevelMap() {
  levelMapEl.hidden = true;
  if (!locked) platform.gameplayStart();
  if (currentLevel().tutorial) setTimeout(() => showTutorial(currentLevel().tutorial),120);
}

function renderLevelMap() {
  totalStarsEl.textContent = profileStarTotal(profile);
  coinsEl.textContent = profile.coins;
  chapterTabsEl.innerHTML = '';
  for (const chapterConfig of CHAPTERS) {
    const chapter = chapterConfig.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = chapter === activeChapter ? 'active' : '';
    button.textContent = `${chapterConfig.emoji} ${chapter}`;
    button.title = `${chapterConfig.title}: ${chapterConfig.unlock}`;
    button.addEventListener('click',() => {
      activeChapter = chapter;
      renderLevelMap();
    });
    chapterTabsEl.append(button);
  }

  levelGridEl.innerHTML = '';
  LEVELS.filter(level => level.chapter === activeChapter).forEach(level => {
    const state = profile.levels[level.id];
    const unlocked = level.id <= profile.unlockedLevel;
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = !unlocked;
    button.className = `level-node${!unlocked ? ' locked' : ''}${state ? ' completed' : ''}${level.id === currentLevel().id ? ' current' : ''}`;
    button.setAttribute('aria-label',unlocked ? `Уровень ${level.id}. ${level.title}. ${state?.stars || 0} звёзд` : `Уровень ${level.id} закрыт`);
    button.innerHTML = `${unlocked ? level.id : '🔒'}<span class="node-stars">${state ? '★'.repeat(state.stars) + '☆'.repeat(3-state.stars) : '☆☆☆'}</span>`;
    if (unlocked) button.addEventListener('click',() => {
      levelCompleteEl.hidden = true;
      gameOverEl.hidden = true;
      closeLevelMap();
      start(level.id);
    });
    levelGridEl.append(button);
  });

  mapCloseBtn.hidden = !cells.length || locked;
}

function setupDebugTools() {
  if (!new URLSearchParams(location.search).has('debug')) return;
  debugPanelEl.hidden = false;
  debugLevelEl.innerHTML = LEVELS.map(level => `<option value="${level.id}">${level.id}: ${level.title}</option>`).join('');
  debugLevelEl.value = String(currentLevel().id);
  debugLevelEl.addEventListener('change',() => start(Number(debugLevelEl.value)));
  debugWinBtn.addEventListener('click',() => {
    if (locked) return;
    levelScore = currentLevel().type === 'score' ? currentLevel().goal : levelScore;
    applesCleared = currentLevel().type === 'apples' ? currentLevel().goal : applesCleared;
    bombsDefused = currentLevel().type === 'bombs' ? currentLevel().goal : bombsDefused;
    cratesBroken = currentLevel().type === 'crates' ? currentLevel().goal : cratesBroken;
    completeLevel();
  });
  debugResetBtn.addEventListener('click',() => {
    profile = normalizeProfile(null,LEVELS.length);
    best = 0;
    platform.saveProfile(profile);
    platform.saveBest(0);
    start(1);
    openLevelMap(1);
  });
}

function endGame(reason) {
  locked = true;
  platform.gameplayStop();
  bombId = null;
  boardEl.classList.remove('shake');
  void boardEl.offsetWidth;
  boardEl.classList.add('shake');
  gameOverIconEl.textContent = reason === 'moves' ? '⌛' : '💥';
  gameOverTitleEl.textContent = reason === 'moves' ? 'Ходы закончились' : 'Фитиль догорел!';
  finalScoreEl.textContent = score;
  updateEconomyUI();
  analytics.track('level_failed',{levelId:currentLevel().id,reason,score,progress:progressValue(),movesLeft});
  setTimeout(() => { gameOverEl.hidden = false; },350);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'),1800);
}

const wait = ms => new Promise(resolve => setTimeout(resolve,ms));

clearBtn.addEventListener('click',clearSelection);
restartBtn.addEventListener('click',() => start(currentLevel().id));
nextLevelBtn.addEventListener('click',() => {
  levelCompleteEl.hidden = true;
  if (levelIndex >= LEVELS.length - 1) {
    openLevelMap(CHAPTERS.length);
    return;
  }
  start(levelIndex + 2);
});
mapButton.addEventListener('click',() => openLevelMap());
mapCloseBtn.addEventListener('click',closeLevelMap);
levelMapButton.addEventListener('click',() => {
  levelCompleteEl.hidden = true;
  openLevelMap();
});
gameOverMapButton.addEventListener('click',() => {
  gameOverEl.hidden = true;
  openLevelMap();
});
shopButton.addEventListener('click',openShop);
shopQuickButton.addEventListener('click',openShop);
shopCloseBtn.addEventListener('click',closeShop);
continueBtn.addEventListener('click',continueWithExtraMoves);
tutorialCloseBtn.addEventListener('click',closeTutorial);
boosterTrayEl.addEventListener('click',event => {
  const button = event.target.closest('[data-booster]');
  if (button) useBooster(button.dataset.booster);
});
boardEl.addEventListener('pointerdown',startPointerChain);
boardEl.addEventListener('pointermove',movePointerChain);
boardEl.addEventListener('pointerup',finishPointerChain);
boardEl.addEventListener('pointercancel',finishPointerChain);
window.addEventListener('resize',() => updateSnakePath());

export async function startGame() {
  await platform.ready();
  profile = normalizeProfile(platform.loadProfile(),LEVELS.length);
  const recovery = recoverPendingPurchases(profile,LEVELS.length);
  profile = recovery.profile;
  best = Math.max(profile.bestScore,platform.loadBest());
  profile.bestScore = best;
  bestEl.textContent = best;
  platform.saveProfile(profile);
  start(profile.unlockedLevel);
  setupDebugTools();
  openLevelMap(currentLevel().chapter);
  analytics.track('game_ready',{platform:platform.id,unlockedLevel:profile.unlockedLevel});
  if (recovery.recovered.length) showToast(`Восстановлено покупок: ${recovery.recovered.length}`);
}
