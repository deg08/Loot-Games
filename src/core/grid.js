export function areNeighbors(a,b,cols) {
  if (a < 0 || b < 0) return false;
  const rowA = Math.floor(a / cols);
  const colA = a % cols;
  const rowB = Math.floor(b / cols);
  const colB = b % cols;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
}

export function neighborIndexes(index,rows,cols) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result = [];
  if (row > 0) result.push(index - cols);
  if (row < rows - 1) result.push(index + cols);
  if (col > 0) result.push(index - 1);
  if (col < cols - 1) result.push(index + 1);
  return result;
}

export function shuffleInPlace(items,random=Math.random) {
  for (let i=items.length-1; i>0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i],items[j]] = [items[j],items[i]];
  }
  return items;
}

export function findSimplePath(startIndex,length,{rows,cols,blocked=new Set()}) {
  if (blocked.has(startIndex) || length < 1) return [];
  const path = [startIndex];
  const used = new Set(path);

  function search(index) {
    if (path.length === length) return true;
    for (const next of neighborIndexes(index,rows,cols)) {
      if (used.has(next) || blocked.has(next)) continue;
      used.add(next);
      path.push(next);
      if (search(next)) return true;
      path.pop();
      used.delete(next);
    }
    return false;
  }

  return search(startIndex) ? path : [];
}
