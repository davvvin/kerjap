// array.js

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const CELL_W = 60;
const CELL_H = 50;
const START_Y = 30;
const START_X = 10;

let arr = [];       // the actual array, NaN = empty slot
let capacity = 0;   // initial size user defined

// ── Init ──────────────────────────────────────────────────────

function initArray() {
  const size = parseInt(document.getElementById('sizeInput').value);
  if (!size || size < 1) { alert('Enter a valid size.'); return; }

  capacity = size;
  arr = Array(size).fill(NaN);

  document.getElementById('initScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';

  resizeCanvas();
  draw();
  setCode('# Create an array of size ' + size + '\narr = [None] * ' + size);
}

function resetArray() {
  arr = Array(capacity).fill(NaN);
  draw();
  setCode('# Reset array to original size\narr = [None] * ' + capacity);
  setMsg('');
}

// ── Operations ────────────────────────────────────────────────

function doInsert() {
  const val = parseFloat(document.getElementById('insVal').value);
  const idxRaw = document.getElementById('insIdx').value.trim();

  if (isNaN(val)) { setMsg('Enter a value.'); return; }

  // no index given — find first empty slot
  if (idxRaw === '') {
    const emptySlot = arr.findIndex(v => isNaN(v));
    if (emptySlot === -1) {
      // array is full, append (grow)
      arr.push(val);
      resizeCanvas();
      draw();
      setCode(
        '# Array full — appending to grow\narr.append(' + val + ')'
      );
      setMsg('Array was full, grew to size ' + arr.length + '.');
    } else {
      arr[emptySlot] = val;
      draw();
      setCode(
        '# Insert into first empty slot\narr[' + emptySlot + '] = ' + val
      );
      setMsg('Inserted ' + val + ' at index ' + emptySlot + '.');
    }
    return;
  }

  const idx = parseInt(idxRaw);

  if (isNaN(idx) || idx < 0) { setMsg('Invalid index.'); return; }

  if (idx >= arr.length) {
    // index beyond current length — fill gaps with NaN and place value
    while (arr.length < idx) arr.push(NaN);
    arr.push(val);
    resizeCanvas();
    draw();
    setCode(
      '# Index beyond array — extended with None gaps\narr[' + idx + '] = ' + val
    );
    setMsg('Extended array and inserted ' + val + ' at index ' + idx + '.');
    return;
  }

  if (isNaN(arr[idx])) {
    // slot is empty — just fill it
    arr[idx] = val;
    draw();
    setCode(
      '# Slot is empty — direct assignment\narr[' + idx + '] = ' + val
    );
    setMsg('Inserted ' + val + ' at index ' + idx + ' (was empty).');
  } else {
    // slot is occupied — shift right and grow
    arr.splice(idx, 0, val);
    resizeCanvas();
    draw();
    setCode(
      '# Slot occupied — shift right, array grows\n' +
      'arr.insert(' + idx + ', ' + val + ')'
    );
    setMsg('Shifted elements right and inserted ' + val + ' at index ' + idx + '. Array grew to ' + arr.length + '.');
  }

  document.getElementById('insVal').value = '';
  document.getElementById('insIdx').value = '';
}

function doUpdate() {
  const idx = parseInt(document.getElementById('updIdx').value);
  const val = parseFloat(document.getElementById('updVal').value);

  if (isNaN(idx) || idx < 0 || idx >= arr.length) { setMsg('Invalid index.'); return; }
  if (isNaN(val)) { setMsg('Enter a new value.'); return; }

  const old = arr[idx];
  arr[idx] = val;
  draw();
  setCode(
    '# Update value at index\narr[' + idx + '] = ' + val +
    '  # was: ' + (isNaN(old) ? 'None' : old)
  );
  setMsg('Updated index ' + idx + ': ' + (isNaN(old) ? 'None' : old) + ' → ' + val);

  document.getElementById('updIdx').value = '';
  document.getElementById('updVal').value = '';
}

function doDelete() {
  const idx = parseInt(document.getElementById('delIdx').value);

  if (isNaN(idx) || idx < 0 || idx >= arr.length) { setMsg('Invalid index.'); return; }

  const old = arr[idx];
  arr[idx] = NaN;   // slot becomes empty, no shifting
  draw();
  setCode(
    '# Delete: set slot to None (no shifting)\narr[' + idx + '] = None  # was: ' + (isNaN(old) ? 'None' : old)
  );
  setMsg('Deleted index ' + idx + ' (was: ' + (isNaN(old) ? 'None' : old) + '). Slot is now empty.');

  document.getElementById('delIdx').value = '';
}

// ── Draw ──────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < arr.length; i++) {
    const x = START_X + i * CELL_W;
    const y = START_Y;
    const isEmpty = isNaN(arr[i]);

    // cell background
    ctx.fillStyle = isEmpty ? '#f9f9f9' : '#fff';
    ctx.fillRect(x, y, CELL_W, CELL_H);

    // cell border
    ctx.strokeStyle = isEmpty ? '#ddd' : '#333';
    ctx.lineWidth = isEmpty ? 1 : 1.5;
    ctx.strokeRect(x, y, CELL_W, CELL_H);

    // value
    ctx.fillStyle = isEmpty ? '#bbb' : '#111';
    ctx.font = isEmpty ? '12px Arial' : 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isEmpty ? 'NaN' : arr[i], x + CELL_W / 2, y + CELL_H / 2);

    // index label
    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText('[' + i + ']', x + CELL_W / 2, y + CELL_H + 16);
  }
}

function resizeCanvas() {
  canvas.width = START_X * 2 + arr.length * CELL_W;
}

// ── Helpers ───────────────────────────────────────────────────

function setCode(text) {
  document.getElementById('codeDisplay').textContent = text;
}

function setMsg(text) {
  document.getElementById('msg').textContent = text;
}