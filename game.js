const ROWS = 7, COLS = 6, TARGET = 10;
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
const gameOverEl = document.querySelector('#gameOver');
const finalScoreEl = document.querySelector('#finalScore');
const restartBtn = document.querySelector('#restart');

let cells = [], selected = new Set(), score = 0, streak = 0;
let locked = false, successfulMoves = 0, autoCollectTimer = null, bombId = null, fuse = 4;
let best = Number(localStorage.getItem('fruit10-best') || 0);
bestEl.textContent = best;

const value = () => Math.floor(Math.random() * 9) + 1;
const fruit = () => ({ value:value(), type:Math.random() < .3 ? 'apple' : 'orange', id:crypto.randomUUID() });

function start() {
  cells = Array.from({length:ROWS * COLS}, fruit);
  selected.clear(); score = 0; streak = 0; successfulMoves = 0;
  bombId = null; fuse = 4; locked = false;
  scoreEl.textContent = '0'; gameOverEl.hidden = true;
  render(true);
}

function render(initial=false) {
  boardEl.innerHTML = '';
  cells.forEach((item,index) => {
    const button = document.createElement('button');
    const isBomb = item.id === bombId;
    button.className = `fruit ${item.type}${selected.has(item.id) ? ' selected' : ''}${isBomb ? ' bomb' : ''}${initial ? ' intro' : ''}${item.fallRows ? ' falling' : ''}`;
    button.innerHTML = `<span class="fruit-number">${item.value}</span>${isBomb ? `<span class="fuse-label">${fuse}</span>` : ''}`;
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${isBomb ? `Фрукт с бомбой, осталось ходов ${fuse},` : ''} ${item.type === 'apple' ? 'Яблоко' : 'Апельсин'}, число ${item.value}`);
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

function total() { return cells.filter(c => selected.has(c.id)).reduce((n,c) => n + c.value,0); }

function toggle(id) {
  if (locked) return;
  clearTimeout(autoCollectTimer);
  selected.has(id) ? selected.delete(id) : selected.add(id);
  const button = boardEl.querySelector(`[data-id="${id}"]`);
  button?.classList.toggle('selected',selected.has(id));
  updateUI();
  if (total() === TARGET) {
    locked = true;
    hintEl.textContent = 'Десятка! Собираем…';
    autoCollectTimer = setTimeout(collect, 280);
  }
}

function updateUI() {
  const sum = total();
  sumEl.textContent = sum;
  sumEl.style.color = sum === TARGET ? '#54ad42' : sum > TARGET ? '#d94b44' : '';
  dangerMeterEl.hidden = !bombId;
  fuseEl.textContent = fuse;
  dangerMeterEl.classList.toggle('urgent',fuse <= 2);
  if (sum > TARGET) hintEl.textContent = 'Перебор! Убери один или несколько фруктов';
  else if (sum < TARGET) hintEl.textContent = bombId ? 'Собери 10 вместе с фруктом-бомбой!' : 'Нажимай на любые фрукты';
}

function clearSelection() {
  if (locked) return;
  clearTimeout(autoCollectTimer); selected.clear(); render();
}

async function collect() {
  if (total() !== TARGET) { locked = false; return; }
  const defused = bombId && selected.has(bombId);
  successfulMoves++; streak++;
  const count = selected.size;
  const gained = count * 10 + Math.max(0,streak - 1) * 15 + (defused ? 100 : 0);
  score += gained; scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('fruit10-best',best); }
  comboEl.textContent = defused ? `ОБЕЗВРЕЖЕНО! +${gained}` : streak > 1 ? `КОМБО ×${streak}  +${gained}` : `ВКУСНО! +${gained}`;
  comboEl.classList.remove('show'); void comboEl.offsetWidth; comboEl.classList.add('show');
  selected.forEach(id => boardEl.querySelector(`[data-id="${id}"]`)?.classList.add('removing'));
  await wait(360);

  if (defused) { bombId = null; fuse = 4; }
  else if (bombId) fuse--;
  collapseAndRefill(); selected.clear();

  if (bombId && fuse <= 0) { endGame(); return; }
  if (!bombId && successfulMoves > 0 && successfulMoves % 3 === 0) plantBomb();
  render(); locked = false;
}

function plantBomb() {
  const candidates = cells.filter(item => item.value < TARGET);
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  bombId = target.id; fuse = 4;
  showToast('💣 Опасный фрукт! Собери его за 4 хода');
}

function collapseAndRefill() {
  const next = Array(ROWS * COLS);
  for (let col=0; col<COLS; col++) {
    const survivors = [];
    for (let row=ROWS-1; row>=0; row--) {
      const item = cells[row*COLS+col];
      if (!selected.has(item.id)) survivors.push({item, oldRow:row});
    }
    const missing = ROWS - survivors.length;
    for (let row=ROWS-1, i=0; row>=0; row--,i++) {
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

function endGame() {
  locked = true; bombId = null;
  boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
  finalScoreEl.textContent = score;
  setTimeout(() => { gameOverEl.hidden = false; }, 350);
}

function showToast(text) {
  toastEl.textContent=text; toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'),1700);
}

const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
clearBtn.addEventListener('click',clearSelection);
restartBtn.addEventListener('click',start);
start();
