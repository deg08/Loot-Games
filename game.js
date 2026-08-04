const ROWS = 7, COLS = 6, TARGET = 10;
const boardEl = document.querySelector('#board');
const sumEl = document.querySelector('#sum');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const collectBtn = document.querySelector('#collect');
const clearBtn = document.querySelector('#clear');
const hintEl = document.querySelector('#hint');
const comboEl = document.querySelector('#combo');
const toastEl = document.querySelector('#toast');

let cells = [], selected = new Set(), score = 0, streak = 0, locked = false;
let best = Number(localStorage.getItem('fruit10-best') || 0);
bestEl.textContent = best;

const value = () => Math.floor(Math.random() * 9) + 1;
const fruit = () => ({ value:value(), type:Math.random() < .3 ? 'apple' : 'orange', id:crypto.randomUUID() });

function start() {
  cells = Array.from({length:ROWS * COLS}, fruit);
  render(true);
}

function render(initial=false) {
  boardEl.innerHTML = '';
  cells.forEach((item,index) => {
    const button = document.createElement('button');
    button.className = `fruit ${item.type}${selected.has(item.id) ? ' selected' : ''}`;
    button.textContent = item.value;
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${item.type === 'apple' ? 'Яблоко' : 'Апельсин'}, число ${item.value}`);
    if (initial) button.style.animationDelay = `${(index % COLS) * 35 + Math.floor(index/COLS) * 22}ms`;
    button.addEventListener('click', () => toggle(item.id));
    boardEl.append(button);
  });
  updateUI();
}

function total() { return cells.filter(c => selected.has(c.id)).reduce((n,c) => n + c.value,0); }
function toggle(id) {
  if (locked) return;
  selected.has(id) ? selected.delete(id) : selected.add(id);
  const button = boardEl.querySelector(`[data-id="${id}"]`);
  button?.classList.toggle('selected',selected.has(id));
  updateUI();
}
function updateUI() {
  const sum = total();
  sumEl.textContent = sum;
  sumEl.style.color = sum === TARGET ? '#54ad42' : sum > TARGET ? '#d94b44' : '';
  collectBtn.disabled = selected.size === 0;
  collectBtn.textContent = sum === TARGET ? 'Собрать! ✓' : 'Проверить';
  hintEl.textContent = sum > TARGET ? 'Перебор! Убери один или несколько фруктов' : sum === TARGET ? 'Отлично! Теперь собирай' : 'Нажимай на любые фрукты';
}
function clearSelection() { if (!locked) { selected.clear(); render(); } }

async function collect() {
  if (locked || !selected.size) return;
  if (total() !== TARGET) {
    streak = 0;
    boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
    showToast(total() > TARGET ? 'Многовато — нужно ровно 10' : 'Пока не десять!');
    return;
  }
  locked = true; streak++;
  const count = selected.size;
  const gained = count * 10 + Math.max(0,streak - 1) * 15;
  score += gained; scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('fruit10-best',best); }
  comboEl.textContent = streak > 1 ? `КОМБО ×${streak}  +${gained}` : `ВКУСНО! +${gained}`;
  comboEl.classList.remove('show'); void comboEl.offsetWidth; comboEl.classList.add('show');
  selected.forEach(id => boardEl.querySelector(`[data-id="${id}"]`)?.classList.add('removing'));
  await wait(360);
  collapseAndRefill(); selected.clear(); render(true); locked = false;
}

function collapseAndRefill() {
  const next = Array(ROWS * COLS);
  for (let col=0; col<COLS; col++) {
    const survivors = [];
    for (let row=ROWS-1; row>=0; row--) {
      const item = cells[row*COLS+col]; if (!selected.has(item.id)) survivors.push(item);
    }
    for (let row=ROWS-1, i=0; row>=0; row--,i++) next[row*COLS+col] = survivors[i] || fruit();
  }
  cells = next;
}
function showToast(text) { toastEl.textContent=text; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),1300); }
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
collectBtn.addEventListener('click',collect); clearBtn.addEventListener('click',clearSelection);
start();
