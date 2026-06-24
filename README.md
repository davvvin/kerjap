# AlgoMotion
> Dokumen ini ditulis untuk developer yang ingin memahami cara kerja internal proyek, memodifikasi kode, atau mereproduksi ulang sistem dari awal.

---

## Gambaran Umum Sistem

AlgoMotion adalah visualisator struktur data berbasis browser yang dibangun murni dengan **HTML, CSS, dan Vanilla JavaScript**. Tidak ada framework UI (React, Vue, dll), tidak ada build tool (Webpack, Vite). Setiap halaman adalah file `.html` mandiri yang meload resource dari CDN dan dua file shared: `engine.js` dan `components.js`.

Arsitektur tingkat tinggi setiap halaman visualizer:

```
[HTML Controls] → [doInsert() / doPush() / dsb.]
                      │
                      ▼
              [Buat array of steps]
                      │
                      ▼
              [animEngine.loadSteps(steps)]
                      │
                      ▼
              [AnimEngine.applyStep()]
                      │
              ┌───────┴──────────┐
              ▼                  ▼
       [applyStateCallback]   [Panel Kode]
         (redraw canvas)      (Prism.js highlight)
```

---

## `engine.js` — Kelas `AnimEngine`

### Konsep Inti: "Step Object"

Setiap operasi yang dilakukan pengguna (Insert, Push, dll) **tidak langsung mengubah state global**. Sebaliknya, kode terlebih dahulu mensimulasikan seluruh operasi dan menghasilkan sebuah **array of step objects**. Setiap step object adalah snapshot dari kondisi data struktur *di satu titik waktu* tertentu selama operasi berlangsung.

Contoh step object untuk operasi Push pada Stack:
```javascript
{
    stackState: [10, 20, 30], // snapshot array stack pada langkah ini
    code: "def push(self, X):\n    self.items[self.top] = X",
    line: "3",              // baris kode yang akan di-highlight
    msg: "Menambahkan 30 ke top"
}
```

Shape dari step object berbeda-beda per halaman tergantung struktur datanya:
- Array → `{ arrState, capState, ghostIdx, modifiedIdx, code, line, msg }`
- Stack (Array) → `{ stackState, code, line, msg }`
- Linked List → `{ headState, sizeState, activeNodeIdx, code, line, msg }`
- Queue (LL) → `{ headState, sizeState, code, line, msg }` (head saja, tail di-resolve saat draw)

### Method-method `AnimEngine`

#### `constructor(applyStateCallback)`
Menerima satu argumen: sebuah fungsi callback. Fungsi ini yang bertanggung jawab menerjemahkan sebuah step object ke tampilan visual (memanggil `draw()`). Setiap halaman mendefinisikan callback-nya sendiri:
```javascript
const animEngine = new AnimEngine((step) => {
    arr = [...step.arrState];  // restore state dari snapshot
    capacity = step.capState;
    ghostIdx = step.ghostIdx ?? null;
    draw();
});
```

#### `loadSteps(stepsObj)`
Titik masuk utama dari halaman. Dipanggil setelah array of steps selesai dibangun.

Logika kritis di sini: **jika checkbox `chkStepByStep` tidak dicentang**, engine mengabaikan semua intermediate steps dan hanya menyimpan step terakhir (final state). Dengan begitu operasi terasa instan bagi pengguna yang tidak ingin belajar step-by-step:
```javascript
const isStepByStep = chkStepByStep ? chkStepByStep.checked : true;
if (isStepByStep || stepsObj.length <= 1) {
    this.steps = stepsObj;         // simpan semua langkah
} else {
    let finalStep = { ...stepsObj[stepsObj.length - 1] };
    finalStep.line = "";           // hapus highlight baris agar tidak membingungkan
    this.steps = [finalStep];      // hanya simpan langkah terakhir
}
```
Setelah itu, `loadSteps` memanggil `this.next()` sekali untuk langsung menampilkan langkah pertama.

#### `applyStep()`
Fungsi renderer utama. Urutan eksekusinya kritis:
1. Panggil `applyStateCallback(step)` → canvas diperbarui
2. Set atribut `data-line` pada elemen `<pre>` **sebelum** memanggil `Prism.highlightElement()` — ini adalah fix untuk bug sinkronisasi visual di mana baris kode ter-highlight sebelum kanvas berubah

#### `toggleAuto()` dan `stopAuto()`
Menggunakan `setInterval` dengan delay 1000ms untuk maju satu langkah per detik. `stopAuto()` dipanggil otomatis ketika `currentStep` sudah mencapai step terakhir di dalam `applyStep()`.

---

## `components.js` — Web Components

### `<nav-bar>`
Diimplementasikan sebagai Custom Element menggunakan `HTMLElement`. Saat `connectedCallback()` dipanggil oleh browser, ia meng-inject HTML navbar ke dalam DOM, lalu menjalankan dua blok logika:

1. **Theme toggle**: Membaca `localStorage.getItem('theme')`. Jika `'light'`, langsung set `document.documentElement.setAttribute('data-theme', 'light')`. Toggle button memanggil `window.dispatchEvent(new Event('themeChanged'))` yang kemudian di-listen oleh setiap halaman untuk me-redraw kanvasnya dengan warna yang sesuai.

2. **Active link detection**: Loop semua `<a>` di navbar, bandingkan `href` dengan `window.location.pathname.split('/').pop()` untuk meng-highlight link halaman aktif.

### `<engine-controls>`
Hanya bertugas meng-inject HTML tombol (Prev, Auto, Next) dan checkbox Step-by-step ke dalam DOM. Tidak ada logika JS di dalamnya — tombol-tombol memanggil `animEngine.prev()`, `animEngine.next()`, `animEngine.toggleAuto()` langsung via atribut `onclick`, yang berarti variabel `animEngine` harus ada di scope global halaman.

> [Warning] **Catatan penting**: Karena tombol memanggil `animEngine` via `onclick` string, variabel `animEngine` **wajib** dideklarasikan di scope global (`window`), bukan di dalam IIFE atau module. Ini adalah keterbatasan desain yang disengaja untuk menjaga kesederhanaan.

---

## `style.css` — Sistem Tema

### Cara Kerja Theme Toggle

CSS menggunakan **CSS Custom Properties** sebagai token warna. Mode gelap (default) didefinisikan di `:root`. Mode terang didefinisikan di `[data-theme="light"]` yang meng-override variabel yang sama:

```css
:root {
    --bg-main: #15171c;
    --panel-bg: #1f232b;
    --accent: #4ea8ff;
    /* ... */
}

[data-theme="light"] {
    --bg-main: #f5f5f5;
    --panel-bg: #ffffff;
    --accent: #0070f3;
    /* ... */
}
```

Saat tombol toggle ditekan, JavaScript cukup memanggil:
```javascript
document.documentElement.setAttribute('data-theme', 'light');
// atau:
document.documentElement.removeAttribute('data-theme');
```

Canvas **tidak** menggunakan CSS — warnanya dibaca di runtime via `getComputedStyle(document.documentElement).getPropertyValue('--canvas-border')` di setiap panggilan `draw()`. Itulah mengapa canvas juga berubah warna saat tema berganti, selama `draw()` dipanggil ulang via event `themeChanged`.

---

## Dokumentasi Internal Per File

---

### `array.html`

#### State Global
```javascript
let arr = [];         // Array JavaScript, NaN = slot kosong
let capacity = 0;     // Ukuran total (tetap setelah init)
let ghostIdx = null;  // Index slot yang ditampilkan sebagai "target sisipan" (kotak putus-putus)
let modifiedIdx = null; // Index slot yang baru saja diubah (highlight kuning)
```

`arr` menggunakan `NaN` (bukan `null` atau `undefined`) untuk menandai slot kosong karena `NaN` bisa dideteksi dengan `isNaN()` di semua kondisi tanpa risiko falsy-check yang tidak disengaja.

#### `initArray()`
Membaca input size, lalu mengisi `arr` dengan `Array(size).fill(NaN)`. Menyembunyikan `#initScreen` dan menampilkan `#mainScreen`. Canvas di-resize via `resizeCanvas()` yang menghitung `canvas.width = START_X * 2 + capacity * CELL_W`.

#### `doInsert()` — Dua Cabang Logika
- **Tanpa index**: Cari slot kosong pertama dengan `arr.findIndex(x => isNaN(x))`. Jika tidak ada, tampilkan popup Overflow. Kode yang ditampilkan menggunakan `addData` sesuai materi kuliah.
- **Dengan index**: Selalu menimpa index tersebut tanpa mempedulikan apakah sudah berisi atau belum. Kode yang ditampilkan menggunakan `setElemen` sesuai materi kuliah.

Step object menggunakan `ghostIdx` untuk menampilkan kotak putus-putus di slot target *sebelum* nilai dimasukkan, sehingga langkah "persiapan" terlihat berbeda dari langkah "eksekusi".

#### `draw()`
Iterasi dari `0` sampai `capacity - 1`. Untuk setiap slot:
- Cek `isGhost` → render kotak putus-putus dengan teks `← here`
- Cek `isModified && !isEmpty` → warna latar `#cca700` (kuning)
- Slot kosong → warna `--canvas-empty`, teks `NaN`
- Slot berisi → warna `--canvas-filled`, teks nilai

---

### `stack-array.html` dan `stack-linkedlist.html`

#### Perbedaan State

**Array-based**:
```javascript
let stack = [];    // JS array biasa, push/pop dari ujung kanan
let maxSize = 0;
```

**Linked List-based**:
```javascript
let head = null;   // Pointer ke node paling atas (TOP)
let size = 0;
let maxSize = 0;
// + fungsi cloneList(h) untuk deep copy linked list
```

#### `cloneList(h)` — Kunci Step-by-Step pada Linked List

Ini adalah fungsi kritis yang **wajib ada** di semua halaman berbasis Linked List. Masalahnya: JavaScript menyimpan objek (Node) by reference. Jika step object menyimpan `head` langsung, semua steps akan menunjuk ke objek yang sama, dan setiap perubahan berikutnya akan merusak snapshot steps sebelumnya.

Solusinya adalah `cloneList` yang melakukan deep copy iteratif:
```javascript
function cloneList(h) {
    if (!h) return null;
    let newHead = new Node(h.value);
    let cur = newHead;
    let orig = h.next;
    while (orig) {
        cur.next = new Node(orig.value);
        cur = cur.next;
        orig = orig.next;
    }
    return newHead;
}
```
Setiap step menyimpan `headState: cloneList(head)` — sebuah salinan independen dari linked list pada titik waktu tersebut. Saat engine memutar ulang step itu, callback-nya memanggil `cloneList(step.headState)` lagi untuk mengembalikan state.

#### `doPush()` — Stack Linked List
Urutan pembuatan steps adalah kunci untuk memperlihatkan proses pointer secara akurat:
1. Push step awal: `headState: cloneList(head)` (list belum berubah)
2. `node.next = head` — step menampilkan `cloneList(node)` (node baru sudah terhubung, tapi head belum berpindah)
3. `head = node; size++` — step menampilkan `cloneList(head)` (node baru sudah jadi top)

---

### `queue-array.html`

#### State
```javascript
let queue = [];    // JS array biasa, push ke belakang, shift dari depan
let maxSize = 0;
```

**Catatan implementasi penting**: Implementasi JavaScript-nya menggunakan `Array.push()` untuk enqueue dan `Array.shift()` untuk dequeue. `Array.shift()` di JS adalah operasi O(N) karena menggeser semua elemen — ini **berbeda** dengan Queue Circular O(1) yang ditampilkan di code panel Python. Code panel hanya menampilkan kode teoritis sesuai materi kuliah; simulasi visualnya menggunakan operasi JS yang lebih mudah diimplementasikan.

#### `doEnqueue()` dan `doDequeue()`
Step objects menggunakan `queueState: [...queue]` (spread operator untuk shallow copy). Ini aman karena `queue` berisi primitif (angka), bukan objek.

---

### `queue-linkedlist.html`

#### State
```javascript
let head = null;   // pointer ke front/kepala antrean
let tail = null;   // pointer ke rear/ekor antrean (untuk insert O(1))
let size = 0;
```

Berbeda dengan Stack LL yang hanya butuh satu pointer (`head`/`top`), Queue LL menggunakan dua pointer agar operasi insert (ke ekor) dan delete (dari kepala) keduanya O(1).

#### Masalah Snapshot Tail

Step object hanya menyimpan `headState: cloneList(head)`. Pointer `tail` tidak di-clone secara terpisah. Saat engine memutar ulang step, `tail` di-resolve ulang oleh `draw()` dengan cara traverse ke node terakhir. Ini adalah trade-off kesederhanaan vs akurasi — untuk visualisasi, pendekatan ini cukup memadai.

#### `doEnqueue()`
Kasus kritis yang perlu diperhatikan: ketika `tail === null` (queue kosong), `head` dan `tail` keduanya menunjuk ke node yang sama. Steps menampilkan kondisi ini secara terpisah:
```javascript
if (tail === null) {
    head = tail = node;
    steps.push({ ..., msg: "Queue kosong, Q menjadi head dan tail" });
} else {
    tail.next = node;
    steps.push({ ..., msg: "Menghubungkan tail saat ini ke Q" });
    tail = node;
    steps.push({ ..., msg: "Menjadikan Q sebagai tail baru" });
}
```

---

### `linkedlist.html`

#### State
```javascript
let head = null;
let size = 0;
let activeNodeIdx = null; // index node (0-based) yang di-highlight kuning saat traversal
```

#### Sistem Highlight Node (`activeNodeIdx`)
Berbeda dengan struktur lain yang menggunakan warna berdasarkan posisi (head/tail), Linked List menggunakan `activeNodeIdx` — sebuah index integer — untuk menandai node mana yang sedang "dikunjungi" saat animasi berlangsung. Di `draw()`:
```javascript
if (i === activeNodeIdx) {
    ctx.fillStyle = "#cca700"; // gold
}
```
Ini memungkinkan animasi traversal yang menunjukkan "sedang di node ke-X" secara visual.

#### `doInsert()` — Tiga Cabang (head / tail / index)
- **`InsertFirst`**: `node.next = head; head = node;` — O(1), tidak perlu traversal.
- **`InsertLast`**: Loop sampai `cur.next === null`, lalu `cur.next = node`. Steps meng-highlight node terakhir sebelum node baru ditambahkan.
- **`InsertAfter` (by index)**: Loop `idx - 1` kali untuk menemukan `prev`. Steps meng-highlight `prev` lalu node baru. Kasus edge: jika `idx === 0`, diperlakukan sama seperti `InsertFirst`.

#### `doDelete()` — Tiga Cabang (head / tail / index)
- **`DeleteFirst`**: `head = head.next;` — O(1).
- **`DeleteLast`**: Loop sampai `cur.next.next === null` untuk mendapatkan node **sebelum** terakhir, lalu `cur.next = null`. Kasus edge: jika hanya ada 1 node, langsung `head = null`.
- **`DeleteAfter` (by index)**: Loop `idx - 1` kali, lalu `cur.next = cur.next.next` untuk meloncati node target.

#### `draw()` — Rendering Node Berantai
Setiap node digambar sebagai dua kotak sejajar: **value box** (lebar `NODE_W = 80px`) dan **pointer box** (lebar `PTR_W = 30px`). Posisi X setiap node: `START_X + i * (TOTAL_W + 4)`, di mana `TOTAL_W = NODE_W + PTR_W`.

Jika `node.next !== null`, panah digambar dari tepi kanan pointer box ke tepi kiri node berikutnya menggunakan Canvas path. Jika `node.next === null`, teks `NULL` digambar di pointer box.

Canvas di-resize secara dinamis via `resizeCanvas()` yang menghitung lebar berdasarkan `size`:
```javascript
canvas.width = START_X * 2 + nodes * (TOTAL_W + 4) + 20;
```

---

### `tree.html` (Binary Search Tree)

#### State
```javascript
let root = null;
let activeNode = null; // referensi node yang sedang di-highlight saat traversal
let isTraversing = false; // flag untuk mencegah operasi lain selama traversal berjalan
```

#### Node Structure
```javascript
class Node {
    constructor(val) {
        this.info = val;  // nilai node (sesuai materi kuliah: "info", bukan "val" atau "data")
        this.left = null;
        this.right = null;
        this.x = 0;  // koordinat kanvas — diisi oleh calcTree()
        this.y = 0;
    }
}
```

#### `calcTree(node, x, y, dx)` — Algoritma Layout Pohon
Ini adalah fungsi rekursif yang menghitung koordinat `(x, y)` setiap node sebelum digambar. Bukan posisi piksel absolut, melainkan kalkulasi berbasis pembagian ruang (`dx`):
```javascript
function calcTree(node, x, y, dx) {
    node.x = x;
    node.y = y;
    calcTree(node.left,  x - dx, y + 60, dx / 2);
    calcTree(node.right, x + dx, y + 60, dx / 2);
}
// Dipanggil dengan: calcTree(root, canvas.width/2, RADIUS+10, canvas.width/4)
```
Root diletakkan di tengah (`canvas.width / 2`). Setiap level berikutnya, anak kiri bergeser sejauh `-dx` dan anak kanan `+dx`. `dx` dibagi dua setiap level sehingga pohon tidak melebar tak terbatas. Kelemahan: pohon yang sangat tidak seimbang bisa membuat node saling bertumpuk.

#### Traversal dengan `setInterval`
Traversal (preorder/inorder/postorder) tidak menggunakan `AnimEngine`. Sebaliknya, ia membangun array `queue` berisi node sesuai urutan traversal, lalu menggunakan `setInterval` 800ms untuk menggerakkan `activeNode` ke node berikutnya satu per satu:
```javascript
let timer = setInterval(() => {
    if (i >= queue.length) { clearInterval(timer); return; }
    activeNode = queue[i];
    draw();
    i++;
}, 800);
```
`isTraversing = true` selama traversal berlangsung untuk mencegah operasi insert/delete yang bisa merusak tree di tengah animasi.

---

### `tree-avl.html` (AVL Tree)

#### State Tambahan
```javascript
let animationQueue = []; // array of {tree, msg} — snapshot pohon sebelum/sesudah rotasi
let isAnimating = false; // flag pemblokir input selama animasi rotasi berlangsung
```

AVL Tree **tidak menggunakan `AnimEngine`**. Ia menggunakan sistem animasinya sendiri dengan `setTimeout` karena kebutuhan delay antara kondisi "tidak seimbang" dan "setelah dirotasi" lebih natural dibanding sistem prev/next.

#### `cloneTree(node)` — Deep Copy Rekursif
```javascript
function cloneTree(node) {
    if (!node) return null;
    let newNode = new Node(node.info);
    newNode.height = node.height; // ← height WAJIB ikut di-clone
    newNode.left = cloneTree(node.left);
    newNode.right = cloneTree(node.right);
    return newNode;
}
```
Berbeda dengan `cloneList`, `cloneTree` bekerja rekursif karena struktur pohon bercabang. Atribut `height` wajib di-clone karena digunakan oleh `getBalance()` untuk kalkulasi Balance Factor.

#### Alur Animasi Rotasi

```
doInsert() dipanggil
    │
    ▼
animationQueue = []          ← reset queue
    │
    ▼
insertAVL(root, val)          ← jalankan insert rekursif
    │ (di dalam insertAVL, jika balance > 1 atau < -1:)
    │   animationQueue.push({ tree: cloneTree(root), msg: "Mendeteksi..." })
    │   return rightRotate(node)  ← rotasi terjadi di sini (state berubah)
    │
    ▼
newRoot = hasil akhir setelah semua rotasi
    │
    ▼
playAnimation(newRoot, "Inserted X (Balanced).")
    │
    ▼
Jika animationQueue.length === 0 → tampilkan langsung
Jika ada isi → jalankan playNext() dengan setTimeout 2000ms per step
```

#### `playAnimation(finalRoot, successMsg)`
Menambahkan `{ tree: finalRoot, msg: successMsg }` sebagai step terakhir ke `animationQueue`, lalu memutar queue dengan `setTimeout`:
```javascript
function playNext() {
    if (i >= animationQueue.length) { isAnimating = false; return; }
    root = animationQueue[i].tree;
    setMsg(animationQueue[i].msg);
    draw();
    i++;
    setTimeout(playNext, 2000);
}
```
`isAnimating = true` selama animasi berlangsung — semua tombol Insert/Delete/Update/Reset mengembalikan nilai awal tanpa eksekusi selama flag ini aktif.

#### Balance Factor Display di `drawNodes()`
```javascript
let bf = getBalance(node);
let bfColor = (bf > 1 || bf < -1) ? '#ff4d4d' : '#4CAF50';

// Gambar background kotak kecil
ctx.fillStyle = getComputedStyle(...).getPropertyValue('--bg-main');
ctx.fillRect(node.x + RADIUS - 2, node.y - RADIUS - 12, 38, 14);

// Gambar teks BF
ctx.fillStyle = bfColor;
ctx.font = 'bold 11px Consolas, monospace';
ctx.textAlign = 'left';
ctx.fillText('BF:' + bf, node.x + RADIUS, node.y - RADIUS - 5);
```
Label `BF` ditempatkan di pojok kanan atas lingkaran node dengan offset `node.x + RADIUS`. Background kotak kecil digambar terlebih dahulu agar label terbaca di atas garis penghubung pohon.

---

### `tree-maxheap.html` dan `tree-minheap.html`

#### State
```javascript
let heap = [];       // Array JS yang merepresentasikan heap secara implisit
let heapNodes = [];  // Array koordinat { x, y } yang dihitung oleh calcTree()
```

Heap disimpan sebagai array flat. Relasi parent-child menggunakan formula aritmetika:
- Parent dari `i` → `Math.floor((i - 1) / 2)`
- Anak kiri dari `i` → `2 * i + 1`
- Anak kanan dari `i` → `2 * i + 2`

#### `calcTree(idx, x, y, dx)`
Berbeda dengan BST/AVL, `calcTree` di sini bekerja berdasarkan **index array**, bukan referensi node:
```javascript
function calcTree(idx, x, y, dx) {
    if (idx >= heap.length) return;
    heapNodes[idx] = { x: x, y: y };         // simpan koordinat ke array terpisah
    calcTree(2 * idx + 1, x - dx, y + 70, dx / 2); // anak kiri
    calcTree(2 * idx + 2, x + dx, y + 70, dx / 2); // anak kanan
}
```
Hasil kalkulasi disimpan di `heapNodes[]` yang kemudian digunakan oleh `drawConnections()` dan `drawNodes()` untuk lookup koordinat berdasarkan index.

#### `upheap(i)` — Bubble Up setelah Insert
```javascript
function upheap(i) {
    while (i > 0) {
        let p = Math.floor((i - 1) / 2);
        if (heap[i] > heap[p]) {   // Max Heap: anak > parent → swap
            swap(i, p);
            i = p;
        } else { break; }
    }
}
```
Untuk Min Heap, kondisi menjadi `heap[i] < heap[p]`.

#### `downheap(i)` — Sink Down setelah Extract
```javascript
function downheap(i) {
    while (true) {
        let largest = i;
        let left = 2 * i + 1, right = 2 * i + 2;
        if (left < heap.length && heap[left] > heap[largest]) largest = left;
        if (right < heap.length && heap[right] > heap[largest]) largest = right;
        if (largest !== i) { swap(i, largest); i = largest; }
        else break;
    }
}
```
Mencari anak terbesar (Max Heap) / terkecil (Min Heap), menukar dengan parent jika perlu, lalu lanjut ke bawah hingga heap property terpenuhi.

---

### `tree-nary.html`

#### State
```javascript
let root = null;
// Node: { info: val, children: [], x: 0, y: 0 }
```

#### `calcTree(node, x, y, dx)` — Layout N Children
Algoritma layout lebih kompleks dibanding BST karena harus membagi `N` anak secara merata:
```javascript
function calcTree(node, x, y, dx) {
    node.x = x; node.y = y;
    let n = node.children.length;
    if (n === 0) return;
    if (n === 1) {
        calcTree(node.children[0], x, y + 70, dx / 2);
    } else {
        let startX = x - dx;
        let stepX = (2 * dx) / (n - 1);  // bagi ruang merata
        for (let i = 0; i < n; i++) {
            calcTree(node.children[i], startX + i * stepX, y + 70, dx / 2);
        }
    }
}
```

#### `findNode(node, val)` — DFS Rekursif
Pencarian node untuk keperluan insert (menemukan parent):
```javascript
function findNode(node, val) {
    if (!node) return null;
    if (node.info === val) return node;
    for (let child of node.children) {
        let res = findNode(child, val);
        if (res) return res;
    }
    return null;
}
```

#### `deleteNAry(node, val)`
Menghapus seluruh subtree yang berakar di node dengan nilai `val`. Tidak ada deep-clone untuk N-Ary Tree karena halaman ini tidak menggunakan `AnimEngine` dan tidak perlu state snapshot.

---

## Pola yang Konsisten di Semua File

### 1. Fungsi Helper Wajib di Setiap Halaman
| Fungsi | Kegunaan |
|---|---|
| `showPopup(msg)` | Tampilkan modal error dengan pesan |
| `closePopup()` | Sembunyikan modal error |
| `setCode(text)` | Update isi code panel + trigger Prism highlight |
| `setComplexity(time, space)` | Tampilkan badge kompleksitas |
| `setMsg(text)` | Update teks status di bawah kanvas |
| `draw()` | Render ulang seluruh kanvas dari state saat ini |

### 2. Urutan Load Script
```html
<script src="components.js"></script>  <!-- harus pertama (render NavBar) -->
<nav-bar></nav-bar>
<!-- ... HTML lainnya ... -->
<script src="engine.js"></script>      <!-- sebelum script utama halaman -->
<script>
    /* script utama halaman — bisa akses AnimEngine dan Web Components */
</script>
<script src="prism.min.js"></script>   <!-- setelah DOM siap -->
<script src="prism-python.min.js"></script>
<script src="prism-line-highlight.min.js"></script>  <!-- hanya di halaman AnimEngine -->
```

### 3. Cara Menambahkan Halaman Visualizer Baru
1. Copy salah satu file HTML yang paling mirip strukturnya
2. Ganti variabel state global sesuai struktur data baru
3. Buat callback `AnimEngine` yang merestore state dari step object
4. Implementasikan fungsi `draw()` menggunakan Canvas API
5. Implementasikan `doXxx()` yang membangun array of steps
6. Tambahkan link di `components.js` (dropdown/navbar) dan `index.html` (grid)
